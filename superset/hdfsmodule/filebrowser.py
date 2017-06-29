import datetime, json, logging, mimetypes, operator, os, posixpath, threading

from flask import Response
from flask_babel import gettext

from superset import (app, kt_renewer, utils)
from superset.libs import paginator
from superset.libs.filebrowser.rwx import filetype, rwx
from superset.libs.hadoop.fs import webhdfs, hadoopfs
from superset.utils import json_error_response, json_success_response

from werkzeug import secure_filename
from werkzeug.http import http_date


mutex = threading.Lock()

DOWNLOAD_CHUNK_SIZE = 64 * 1024 * 1024 # 64MB


class Filebrowser:

    def __init__(self):
        self.fs_cache = {}

    def get_fs_from_cache(self, hdfsconn):
        if hdfsconn not in self.fs_cache:
            self.add_to_fs_cache(hdfsconn)
        return self.fs_cache[hdfsconn.connection_name]

    def add_to_fs_cache(self, hdfsconn):
        self.fs_cache[hdfsconn.connection_name] = self.generate_fs(hdfsconn)
        return self.fs_cache[hdfsconn.connection_name]

    def generate_fs(self,hdfsconn):
        if mutex.acquire(1):
            self.create_keytab_file(hdfsconn.keytab_file)
            kt_renewer.kinit(app.config.get('KINIT_PATH'), self.file_path, hdfsconn.principal)
            fs = webhdfs.WebHdfs(url=hdfsconn.webhdfs_url,
                                 fs_defaultfs=hdfsconn.fs_defaultfs,
                                 logical_name=hdfsconn.logical_name,
                                 security_enabled=True,
                                 hdfs_user=hdfsconn.hdfs_user)
            os.remove(self.file_path)
            mutex.release()
            return fs
        else:
            raise Exception("can not get the mutex lock")

    def create_keytab_file(self, keytab_file):
        temp_dir = app.config.get('KEYTABS_TMP_DIR')
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

        self.file_path = os.path.join(temp_dir, "tmp.keytab")
        file = open(self.file_path, "wb")
        file.write(keytab_file)
        file.close()

    def view(self, request, fs, path):
        stats = fs.stats(path)
        if stats.isDir:
            return Response(json.dumps(self.listdir_paged(request, fs, path)), 200)
        else:
            return json_error_response(gettext("File preview not supported, please download it"))

    def listdir_paged(self, request, fs, path):
        if not fs.isdir(path):
            raise Exception("Not a directory: %s" % (path,))

        pagenum = request.args.get('page_num', type=int, default=1)
        pagesize = request.args.get('page_size', type=int, default=30)

        all_stats = fs.listdir_stats(path)

        # filter first
        filter_str = request.args.get('filter', type=str, default=None)

        if filter_str:
            filtered_stats = filter(lambda sb: filter_str in sb['name'], all_stats)
            all_stats = filtered_stats

        sortby = request.args.get('sortby', type=str, default=None)
        descending_param = request.args.get('descending', type=str, default=None)

        if sortby:
            if sortby not in ('type', 'name', 'atime', 'mtime', 'user', 'group', 'size'):
                logging.info("Invalid sort attribute '%s' for listdir." % (sortby,))
            else:
                all_stats = sorted(all_stats,
                                   key=operator.attrgetter(sortby),
                                   reverse=utils.coerce_bool(descending_param))

        page = paginator.Paginator(all_stats, pagesize).page(pagenum)
        shown_stats = page.object_list

        if hadoopfs.Hdfs.normpath(path) != posixpath.sep:
            parent_path = fs.join(path, "..")
            parent_stat = fs.stats(parent_path)
            # The 'path' field would be absolute, but we want its basename to be
            # actually '..' for display purposes. Encode it since _massage_stats expects byte strings.
            parent_stat['path'] = parent_path
            parent_stat['name'] = ".."
            shown_stats.insert(0, parent_stat)

        # Include same dir always as first option to see stats of the current folder
        current_stat = fs.stats(path)
        # The 'path' field would be absolute, but we want its basename to be
        # actually '.' for display purposes. Encode it since _massage_stats expects byte strings.
        current_stat['path'] = path
        current_stat['name'] = "."
        shown_stats.insert(1, current_stat)


        stats_dict = {'stats' : [s.to_json_dict() for s in all_stats]}

        page.object_list = [ _massage_stats(request, s) for s in shown_stats ]

        data = {
            'path': path,
            'files': page.object_list,
            'page': _massage_page(page),
            'pagesize': pagesize,
            'sortby': sortby,
            'descending': descending_param,

        }

        return data

    def download_file(self, fs, path):
        if not fs.exists(path):
            return json_error_response("File not found: %s." % path, 404)
        if not fs.isfile(path):
            return json_error_response("'%s is not a file." % path)

        content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        stats = fs.stats(path)

        fh = fs.open(path)

        response = Response(self.read_file_by_chunk(fh), content_type=content_type)
        response.headers['Last-Modified'] = http_date(stats['mtime'])
        response.headers['Content-Length'] = stats['size']
        response.headers['Content-Disposition'] = 'attachment; filename=' + os.path.basename(path)
        return response

    def read_file_by_chunk(self, fh):
        while True:
            chunk = fh.read(DOWNLOAD_CHUNK_SIZE)
            if chunk == b'':
                fh.close()
                break
            yield chunk

    def upload_file(self, fs, hdfs_path, hdfs_file):
        file_name = secure_filename(hdfs_file.filename)

        if not fs.isdir(hdfs_path):
            return json_error_response(gettext("HDFS path is no a directory, please select a new one"))

        tmp_path = fs.mkswap(file_name, suffix='tmp', basedir=hdfs_path)
        if fs.exists(tmp_path):
            fs.remove(tmp_path)

        tmp_file = fs.open(tmp_path, 'w')
        tmp_file.write(hdfs_file.read())
        tmp_file.flush()
        tmp_file.close()

        dest_path = fs.join(hdfs_path, file_name)
        if fs.exists(dest_path):
            return json_error_response(gettext("File with the same name has already exist on HDFS"))
        fs.rename(tmp_path, dest_path)

        return json_success_response("Succeed to upload a file")

    def remove(self, fs, hdfs_path):
        if not fs.exists(hdfs_path):
            return json_error_response("File not found: %s." % hdfs_path, 404)

        if not fs.isfile(hdfs_path):
            return json_error_response("%s is not a file." % hdfs_path)

        fs.remove(hdfs_path)
        return json_success_response("Remove file %s succeed." % hdfs_path)

    def copy_or_move(self, fs, hdfs_path, dest_path, action):
        if not fs.exists(hdfs_path):
            return json_error_response("File not found: %s." % hdfs_path, 404)

        if not fs.isfile(hdfs_path):
            return json_error_response("%s is not a file." % hdfs_path)

        if not fs.isdir(dest_path):
            return json_error_response("%s is not a directory." % dest_path)

        file_name = os.path.basename(hdfs_path)
        new_path = os.path.join(dest_path, file_name)
        if fs.exists(new_path):
            return json_error_response("File with the same name has already existed in the destination")

        if action == "copy":
            fs.copy(hdfs_path, dest_path)
            return json_success_response("Copy file %s to %s succeed." % (hdfs_path, dest_path))
        elif action == "move":
            fs.rename(hdfs_path, dest_path)
            return json_success_response("Move file %s to %s succeed." % (hdfs_path, dest_path))
        else:
            return json_error_response("Action %s is not supported." % action)

    def mkdir(self, fs, hdfs_path, dir_name):
        if not fs.isdir(hdfs_path):
            return json_error_response("HDFS path is not a directory, please select a new one")

        if posixpath.sep in dir_name or "#" in dir_name:
            return json_error_response("Could not name folder %: Slashes or hashes are not allowed in filenames" % dir_name)

        dir_path = os.path.join(hdfs_path, dir_name)
        if fs.exists(dir_path):
            return json_error_response("Directory with the same name has already existed, please select a new one")

        fs.mkdir(dir_path)
        return json_success_response("Create folder %s succeed, full path is:%s" % (dir_name, dir_path))

    def rmdir(self, fs, hdfs_path):
        if not fs.exists(hdfs_path):
            return json_error_response("Directory not exist, please select a new one")

        if not fs.isdir(hdfs_path):
            return json_error_response("HDFS path is not a directory, please select a new one")

        fs.rmtree(hdfs_path)
        return json_success_response("Remove folder %s succeed." % hdfs_path)

    def read(self, fs, path, separator):
        stats = fs.stats(path)
        if stats.isDir:
            return json_error_response(gettext("Not a file"))
        else:
            rs = fs.read(path, 0, stats["size"]).decode()
            rows = rs.split("\n")

            if separator is None:
                separator = ','

            data = {}
            for row_index in range(len(rows)):
                if rows[row_index].strip():
                    columns = rows[row_index].split(separator)
                    key = "row" + str(row_index)
                    data[key] = []
                    for column_index in range(len(columns)):
                        data[key].append(columns[column_index])
            return Response(json.dumps(data, 200))


def _massage_stats(request, stats):
    path = stats['path']
    normalized = hadoopfs.Hdfs.normpath(path)
    return {
        'path': normalized,
        'name': stats['name'],
        'stats': stats.to_json_dict(),
        'mtime': datetime.date.fromtimestamp(stats['mtime']).strftime('%B %d, %Y %I:%M %p'),
        'size': stats['size'],
        'type': filetype(stats['mode']),
        'rwx': rwx(stats['mode'], stats['aclBit']),
        'mode': stats['mode'],
        'url': _make_url(request.url_root, normalized)
    }


def _make_url(url, path):
    if '/view/' not in url:
        if path == '/':
            return url + 'view/'
        else:
            return url + 'view' + path
    else:
        return url


def _massage_page(page):
    return {
        'number': page.number,
        'num_pages': page.num_pages(),
        'previous_page_number': page.previous_page_number(),
        'next_page_number': page.next_page_number(),
        'start_index': page.start_index(),
        'end_index': page.end_index(),
        'total_count': page.total_count()
    }
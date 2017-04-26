import os
import logging
import uuid
import operator
import posixpath
import json
import copy
import threading
import datetime
import urlparse

from flask import Response, url_for
from flask_babel import lazy_gettext as _

from requests_kerberos.exceptions import KerberosExchangeError

from superset import (app, db, kt_renewer, utils, models)
from superset.libs.hadoop.fs import webhdfs, hadoopfs
from superset.utils import fs_cache
from superset.libs import paginator
from superset.libs.hadoop.fs.exceptions import WebHdfsException
from superset.libs.filebrowser.rwx import  filetype, rwx
from superset.libs.filebrowser import xxd
from superset.utils import json_error_response

config = app.config
lock = threading.Lock()

def init_keytab(keytab, principal):
  temp_dir = os.path.join(config.get('KEYTABS_TMP_DIR'), str(uuid.uuid4()))

  try:
    os.makedirs(temp_dir)
  except OSError as e:
    logging.exception(e)
  file = keytab.file
  file_path = str(os.path.join(temp_dir, keytab.name))
  f = open(file_path, "wb")
  f.write(file)
  f.close()

  kt_renewer.kinit(config.get('KINIT_PATH'), file_path, principal)

  # kt_renewer.kinit(config.get('KINIT_PATH'), file_path, principal)
  logging.info("kinit keytab %s" % keytab.name)

def generate_fs(obj):
  with lock:
    try:
      init_keytab(obj.keytab, obj.principal)

      fs =  webhdfs.WebHdfs(url=obj.httpfs_uri,
                       fs_defaultfs=obj.fs_defaultfs,
                       logical_name=obj.logical_name,
                       security_enabled=obj.security_enabled,
                       hdfs_user='hdfs')
      fs.listdir('/tmp')
      return fs
    except KerberosExchangeError as e:
      logging.error(e)

def add_to_fs_cache(obj):
  fs_cache[obj.connection_name] = generate_fs(obj)
  logging.info("Webhdfs generated and added to fs_cache")
  return fs_cache[obj.connection_name]

def remove_from_fs_cache(obj):

  if fs_cache.has_key(obj.connection_name):
    del fs_cache[obj.connection_name]
  logging.info("Removed from cache")

def get_fs_from_cache(connection):

  if not fs_cache.has_key(connection.connection_name):

    add_to_fs_cache(connection)
  return fs_cache[connection.connection_name]


def listdir_paged(request, fs, path):
  if not fs.isdir(path):
    raise Exception("Not a directory: %s" % (path,))

  pagenum = request.args.get('pagenum', type=int, default=1)
  pagesize = request.args.get('pagesize', type=int, default=30)

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


def view(request, fs, path):
  stats = fs.stats(path)
  if stats.isDir:
    return Response(json.dumps(listdir_paged(request, fs, path)), 200)
  else:
    return json_error_response(_("File preview not supported, please download it"))


def stat(request, fs, path):
  if not fs.exists(path):
    return json_error_response(_("File not found: %(path)s" % {'path': path}))
  stats = fs.stats(path)
  return Response(json.dumps(_massage_stats(request, stats)))

def display(request, fs, path):
  if not fs.isfile(path):
    return json_error_response(_("Not a file: '%(path)s'") % {'path': path})

  stats = fs.stats(path)


def upload_file(request, fs):
  response = {'status': -1, 'data': ''}

  file = request.files['file']
  dest = request.form['dest']

  if fs.isdir(dest) and posixpath.sep in file.filename:
    return json_error_response(_("Sorry, no '%(sep)s' in the filename %(name)s." % {'sep': posixpath.sep,
                                                                                        'name': file.filename}))
  #
  dest = fs.join(dest, file.filename)
  # tmp_file = '/tmp/' + file.filename
  path = fs.mkswap(file.filename, suffix='tmp', basedir=dest)
  upload_tmp_success = False
  try:

    if fs.exists(path):
      fs.delete(path)

    hdfs_file = fs.open(path, 'w')
    hdfs_file.write(file.read())
    hdfs_file.flush()
    hdfs_file.close()

    upload_tmp_success = True
  except IOError:
    logging.exception(_("Error storing upload data in temporary file '%s'" % (path,)))
    fs.remove(path, True)

  if upload_tmp_success:
    try:
      fs.rename(path, dest)
      response['status'] = 0
    except IOError as ex:
      already_exists = False
      try:
        already_exists = fs.exists(dest)
      except Exception:
        pass
      if already_exists:
        msg = _('Destination %(name)s already exists.') % {'name': dest}
      else:
        msg = _('Copy to %(name)s failed: %(error)s') % {'name': dest, 'error': ex}

      return json_error_response(msg)

    response.update({
      'path': dest,
      'result': _massage_stats(request, fs.stats(dest)),
      'next': request.args.get('next')
    })
    return response
  else:
    return json_error_response(_("Upload file failed."))
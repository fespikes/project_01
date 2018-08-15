"""Unit tests for Pilot
HDFSTests need 'token' to visit filerobot, so need to enable CAS or GUARDIAN
and related environment, such as guardian-site.xml, jars
"""
import json
import os
import string
from tests.base_tests import SupersetTestCase


class HDFSTests(SupersetTestCase):

    require_examples = False
    file_types = ['dir', 'file']

    # def __init__(self, *args, **kwargs):
    #     super(HDFSTests, self).__init__(*args, **kwargs)
    #
    def setUp(self):
        self.login(username='admin', password='123')

    def test_login(self):
        resp_data = self.get_json_resp('/hdfs/login/')
        assert resp_data.get('status') == 200

    def test_list(self):
        path = '/user'
        page_size = 10
        resp_data = self.get_json_resp(
            '/hdfs/list/?path={}&page_num=1&page_size={}'.format(path, page_size))
        assert resp_data.get('status') == 200

        data = resp_data.get('data')
        assert data.get('path') == path
        assert data.get('pagesize') == page_size

        files = data.get('files')
        for file in files:
            assert 'name' in file
            assert 'mtime' in file
            assert 'path' in file
            assert 'rwx' in file
            assert 'size' in file
            assert 'stats' in file
            assert 'type' in file
            assert file.get('type') in self.file_types

    def test_upload_download_preview(self):
        folder = '/tmp'
        filename = 'ut_upload_{}'.format(self.time_string())
        fullpath = os.path.join(folder, filename)
        content = string.ascii_uppercase
        # TODO test /hdfs/upload/

        ### upload in body
        resp_data = self.get_json_resp(
            '/hdfs/upload_in_body/?dest_path={}&file_name={}'.format(folder, filename),
            data=content.encode('utf8'))
        assert resp_data.get('status') == 200

        ### download
        resp = self.get_resp('/hdfs/download/?files={}'.format(fullpath))
        assert resp == content

        ### preview
        resp_data = self.get_json_resp('/hdfs/preview/?path={}'.format(fullpath))
        assert resp_data.get('data') == content

        ### remove
        resp_data = self.get_json_resp('/hdfs/remove/',
                                       data=json.dumps({'path': [fullpath]}))
        assert resp_data.get('status') == 200

    def test_mkdir_move_remove(self):
        parent_folder = '/user'
        new_folder = 'ut_mkdir_{}'.format(self.time_string())

        ### mkdir
        resp_data = self.get_json_resp(
            '/hdfs/mkdir/?path={}&dir_name={}'.format(parent_folder, new_folder))
        assert resp_data.get('status') == 200

        ### move
        dest_path = '/tmp'
        origin_path = os.path.join(parent_folder, new_folder)
        resp_data = self.get_json_resp(
            '/hdfs/move/', data=json.dumps({'path': [origin_path],
                                            'dest_path': dest_path}))
        assert resp_data.get('status') == 200

        ### remove
        resp_data = self.get_json_resp(
            '/hdfs/remove/', data=json.dumps({'path': [os.path.join(dest_path, new_folder)]}))
        assert resp_data.get('status') == 200

    def test_touch_chmod_copy_modify(self):
        folder = '/tmp'
        filename = 'ut_touch_{}'.format(self.time_string())
        fullpath = os.path.join(folder, filename)

        ### touch
        resp_data = self.get_json_resp(
            '/hdfs/touch/?path={}&filename={}'.format(folder, filename))
        assert resp_data.get('status') == 200

        ### chmod
        resp_data = self.get_json_resp('/hdfs/chmod/',
            data=json.dumps({'path': [fullpath], 'mode': '0o777', 'recursive': True}))
        assert resp_data.get('status') == 200
        resp_data = self.get_json_resp(
            '/hdfs/list/?path={}&page_num=1&page_size={}'.format(folder, 100))
        files = resp_data.get('data').get('files')
        for file in files:
            if file.get('name') == filename:
                assert file.get('rwx') == '-rwxrwxrwx'
                break

        ### copy
        copy_path = '/user'
        resp_data = self.get_json_resp(
            '/hdfs/copy/', data=json.dumps({'path': [fullpath],
                                            'dest_path': copy_path}))
        assert resp_data.get('status') == 200

        ### modify
        content = string.ascii_uppercase
        resp_data = self.get_json_resp('/hdfs/modify/?path={}'.format(fullpath),
                                       data=content.encode('utf8'))
        assert resp_data.get('status') == 200
        resp_data = self.get_json_resp('/hdfs/preview/?path={}'.format(fullpath))
        assert resp_data.get('data') == content

        ### remove
        resp_data = self.get_json_resp('/hdfs/remove/',
            data=json.dumps({'path': [fullpath, os.path.join(copy_path, filename)]}))
        assert resp_data.get('status') == 200

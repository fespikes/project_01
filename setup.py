import os
import subprocess
import json
from setuptools import setup, find_packages

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PACKAGE_DIR = os.path.join(BASE_DIR, 'superset', 'static', 'assets')
PACKAGE_FILE = os.path.join(PACKAGE_DIR, 'package.json')
with open(PACKAGE_FILE) as package_file:
    version_string = json.load(package_file)['version']


def get_git_sha():
    try:
        s = str(subprocess.check_output(['git', 'rev-parse', 'HEAD']))
        return s.strip()
    except:
        return ""

GIT_SHA = get_git_sha()
version_info = {
    'GIT_SHA': GIT_SHA,
    'version': version_string,
}
print("-==-" * 15)
print("VERSION: " + version_string)
print("GIT SHA: " + GIT_SHA)
print("-==-" * 15)

with open(os.path.join(PACKAGE_DIR, 'version_info.json'), 'w') as version_file:
    json.dump(version_info, version_file)


setup(
    name='pilot',
    description=(
        "A interactive data visualization platform build on SqlAlchemy"),
    version=version_string,
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    scripts=['superset/bin/pilot'],
    install_requires=[
        'celery==3.1.23',
        'cryptography==1.5.3',
        'cx_Oracle==5.3',
        'fileRobot-client==0.0.1',
        'flask-appbuilder==1.8.1',
        'flask-cache==0.13.1',
        'flask-migrate==1.5.1',
        'flask-restful==0.3.6',
        'flask-testing==0.5.0',
        'future==0.16.0',
        'humanize==0.5.1',
        'guardian-python-client>=0.0.1',
        'gunicorn==19.6.0',
        'JPype1==0.6.2',
        'markdown==2.6.6',
        'mysqlclient==1.3.10',
        'pandas==0.18.1',
        'parsedatetime==2.0.0',
        'pyodbc==4.0.11',
        'python-dateutil==2.5.3',
        'requests==2.10.0',
        'simplejson==3.8.2',
        'sqlalchemy==1.1.5dev',
        'sqlalchemy-utils==0.32.7',
        'sqlparse==0.1.19',
        'werkzeug==0.11.10',
        'xlrd==1.0.0'
    ],
    tests_require=[
        'codeclimate-test-reporter',
        'coverage',
        'mock',
        'nose',
    ],
    # data_files=[('/usr/local/lib/',
    # ['pilot-license-1.0-transwarp-5.1.0-SNAPSHOT.jar'])],
    author='Maxime Beauchemin',
    author_email='maximebeauchemin@gmail.com',
    url='https://github.com/airbnb/superset',
    download_url=(
        'https://github.com/airbnb/superset/tarball/' + version_string),
    classifiers=[
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
)

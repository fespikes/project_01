"""The main config file for Superset

All configuration in this file can be overridden by providing a pilot
in your PYTHONPATH as there is a ``from pilot import *``
at the end of this file.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import imp
import json
import os

from dateutil import tz
from flask_appbuilder.security.manager import AUTH_DB, AUTH_REMOTE_USER

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(os.path.expanduser('~'), 'pilot')
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# ---------------------------------------------------------
# Pilot specific config
# ---------------------------------------------------------
PACKAGE_DIR = os.path.join(BASE_DIR, 'static', 'assets')
PACKAGE_FILE = os.path.join(PACKAGE_DIR, 'package.json')
with open(PACKAGE_FILE) as package_file:
    VERSION_STRING = json.load(package_file)['version']

ROW_LIMIT = 50000
PILOT_WORKERS = 2
PILOT_WEBSERVER_ADDRESS = '0.0.0.0'
PILOT_WEBSERVER_PORT = 8086
PILOT_WEBSERVER_TIMEOUT = 60

CUSTOM_SECURITY_MANAGER = None
# ---------------------------------------------------------

# Guardian
GUARDIAN_AUTH = True
GUARDIAN_SERVICE_TYPE = 'PILOT'

# The default username and password when guardian is not opened
DEFAULT_USERNAME = 'admin'
DEFAULT_PASSWORD = '123456'

# The Community Edition will abandon guardian module, and embed user management module
COMMUNITY_EDITION = False
COMMUNITY_USERNAME = DEFAULT_USERNAME
COMMUNITY_PASSWORD = DEFAULT_PASSWORD

# CAS
CAS_AUTH = False
CAS_SERVER = 'https://localhost:8393'
CAS_URL_PREFIX = '/cas'
GUARDIAN_SERVER = 'https://localhost:8380'  # Used for proxy ticket and access token

# if load examples data when start server
LOAD_EXAMPLES = True

# License check
LICENSE_CHECK = True

# Your App secret key
SECRET_KEY = '=== Transwarp Studio Pilot ==='  # noqa

# Session timeout
PERMANENT_SESSION_LIFETIME = 15 * 60


METADATA_CONN_NAME = 'main'

# The SQLAlchemy connection string.
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'pilot.db')

# If use mysql, the database should be existed and change its charset to 'utf8':
# 'create/alter database db character set utf8'
# and 'charset=utf8' should be in uri
#SQLALCHEMY_DATABASE_URI = 'mysql://username:password@localhost:3306/db?charset=utf8'

# inceptor
DEFAULT_INCEPTOR_CONN_NAME = 'default_inceptor'
DEFAULT_INCEPTOR_SERVER = 'node01:10000'  # should be <node01>[,node02]:<port>

# hdfs
DEFAULT_HDFS_CONN_NAME = 'default_hdfs'
DEFAULT_HTTPFS = '172.0.0.1'


# ------------------------------
# HDFS File Browser
# ------------------------------
MAX_UPLOAD_SIZE = 16 * 1024 * 1024


# The limit of queries fetched for query search
QUERY_SEARCH_LIMIT = 1000

# Flask-WTF flag for CSRF
CSRF_ENABLED = True

# Whether to show the stacktrace on 500 error
SHOW_STACKTRACE = True

# Extract and use X-Forwarded-For/X-Forwarded-Proto headers?
ENABLE_PROXY_FIX = False

# ------------------------------
# GLOBALS FOR APP Builder
# ------------------------------
# Uncomment to setup Your App name
APP_NAME = "PILOT"

# Uncomment to setup an App icon
APP_ICON = "/static/assets/images/superset-logo@2x.png"


# ----------------------------------------------------
# AUTHENTICATION CONFIG
# ----------------------------------------------------
# The authentication type
# AUTH_OID : Is for OpenID
# AUTH_DB : Is for database (username/password()
# AUTH_LDAP : Is for LDAP
# AUTH_REMOTE_USER : Is for using REMOTE_USER from web server
AUTH_TYPE = AUTH_DB

# ---------------------------------------------------
# Babel config for translations
# ---------------------------------------------------
# Setup default language
BABEL_DEFAULT_LOCALE = 'zh'
# Your application default translation path
BABEL_DEFAULT_FOLDER = 'babel/translations'
# The allowed translation for you app
LANGUAGES = {
    'en': {'flag': 'us', 'name': 'English', 'value': 'en-US'},
    'zh': {'flag': 'cn', 'name': 'Chinese', 'value': 'zh-CN'},
}
# ---------------------------------------------------
# Image and file configuration
# ---------------------------------------------------
# The file upload folder, when using models with files
UPLOAD_FOLDER = BASE_DIR + '/app/static/uploads/'

# The image upload folder, when using models with images
IMG_UPLOAD_FOLDER = BASE_DIR + '/app/static/uploads/'

# The image upload url, when using models with images
IMG_UPLOAD_URL = '/static/uploads/'
# Setup image size default is (300, 200, True)
# IMG_SIZE = (300, 200, True)
MAX_CONTENT_LENGTH = 64 * 1024 * 1024

# Global folder for slice cache, keytab, cas file
GLOBAL_FOLDER = '/tmp/pilot'

CACHE_DEFAULT_TIMEOUT = 86400
CACHE_CONFIG = {'CACHE_TYPE': 'filesystem',
                'CACHE_THRESHOLD': 500,
                'CACHE_DIR': '{}/cache'.format(GLOBAL_FOLDER)}

# CORS Options
ENABLE_CORS = False
CORS_OPTIONS = {}


# ---------------------------------------------------
# List of viz_types not allowed in your environment
# For example: Blacklist pivot table and treemap:
#  VIZ_TYPE_BLACKLIST = ['pivot_table', 'treemap']
# ---------------------------------------------------

VIZ_TYPE_BLACKLIST = []

# ---------------------------------------------------
# List of data sources not to be refreshed in druid cluster
# ---------------------------------------------------

DRUID_DATA_SOURCE_BLACKLIST = []

# --------------------------------------------------
# Modules, datasources and middleware to be registered
# --------------------------------------------------
DEFAULT_MODULE_DS_MAP = {'superset.models': ['Dataset']}
ADDITIONAL_MODULE_DS_MAP = {}
ADDITIONAL_MIDDLEWARE = []

"""
1) http://docs.python-guide.org/en/latest/writing/logging/
2) https://docs.python.org/2/library/logging.config.html
"""

# Console Log Settings

LOG_FORMAT = '%(asctime)s:%(levelname)-8s:%(name)s:%(filename)s %(funcName)s(): %(message)s'
LOG_LEVEL = 'INFO'

# ---------------------------------------------------
# Enable Time Rotate Log Handler
# ---------------------------------------------------
# LOG_LEVEL = DEBUG, INFO, WARNING, ERROR, CRITICAL
ENABLE_TIME_ROTATE = True
TIME_ROTATE_LOG_LEVEL = 'INFO'
FILENAME = '/var/log/pilot/pilot.log'
ROLLOVER = 'midnight'
INTERVAL = 1
BACKUP_COUNT = 30

# Set this API key to enable Mapbox visualizations
MAPBOX_API_KEY = "This is the key for Mapbox visualizations"

# Maximum number of rows returned in the SQL editor
SQL_MAX_ROW = 1000

# If defined, shows this text in an alert-warning box in the navbar
# one example use case may be "STAGING" to make it clear that this is
# not the production version of the site.
WARNING_MSG = None

# Default celery config is to use SQLA as a broker, in a production setting
# you'll want to use a proper broker as specified here:
# http://docs.celeryproject.org/en/latest/getting-started/brokers/index.html
"""
# Example:
class CeleryConfig(object):
  BROKER_URL = 'sqla+sqlite:///celerydb.sqlite'
  CELERY_IMPORTS = ('superset.sql_lab', )
  CELERY_RESULT_BACKEND = 'db+sqlite:///celery_results.sqlite'
  CELERY_ANNOTATIONS = {'tasks.add': {'rate_limit': '10/s'}}
CELERY_CONFIG = CeleryConfig
"""
CELERY_CONFIG = None
SQL_CELERY_DB_FILE_PATH = os.path.join(DATA_DIR, 'celerydb.sqlite')
SQL_CELERY_RESULTS_DB_FILE_PATH = os.path.join(DATA_DIR, 'celery_results.sqlite')

# static http headers to be served by your Superset server.
# The following example prevents iFrame from other domains
# and "clickjacking" as a result
# HTTP_HEADERS = {'X-Frame-Options': 'SAMEORIGIN'}
HTTP_HEADERS = {}

# The db id here results in selecting this one as a default in SQL Lab
DEFAULT_DB_ID = None

# Timeout for database or hdfs connection
CONNECTION_TIMEOUT = 60

# Timeout duration for SQL Lab synchronous queries
SQLLAB_TIMEOUT = 60

# SQLLAB_DEFAULT_DBID
SQLLAB_DEFAULT_DBID = None

# An instantiated derivative of werkzeug.contrib.cache.BaseCache
# if enabled, it can be used to store the results of long-running queries
# in SQL Lab by using the "Run Async" button/feature
RESULTS_BACKEND = None

# A dictionary of items that gets merged into the Jinja context for
# SQL Lab. The existing context gets updated with this dictionary,
# meaning values for existing keys get overwritten by the content of this
# dictionary.
JINJA_CONTEXT_ADDONS = {}

# Roles that are controlled by the API / Superset and should not be changes
# by humans.
ROBOT_PERMISSION_ROLES = ['Public', 'Gamma', 'Alpha', 'Admin', 'sql_lab']


# The config for file robot microservice
FILE_ROBOT_SERVER = 'localhost:5000'


CONFIG_PATH_ENV_VAR = 'PILOT_CONFIG_PATH'

try:
    if CONFIG_PATH_ENV_VAR in os.environ:
        # Explicitly import config module that is not in pythonpath; useful
        # for case where app is being executed via pex.
        imp.load_source('pilot_config', os.environ[CONFIG_PATH_ENV_VAR])

    from pilot_config import *  # noqa
    print('Loaded your LOCAL configuration')
except ImportError:
    pass

# smtp server configuration
EMAIL_NOTIFICATIONS = False  # all the emails are sent using dryrun
SMTP_HOST = 'localhost'
SMTP_STARTTLS = True
SMTP_SSL = False
SMTP_USER = 'pilot'
SMTP_PORT = 25
SMTP_PASSWORD = 'pilot'
SMTP_MAIL_FROM = 'pilot@pilot.com'

if not CACHE_DEFAULT_TIMEOUT:
    CACHE_DEFAULT_TIMEOUT = CACHE_CONFIG.get('CACHE_DEFAULT_TIMEOUT')

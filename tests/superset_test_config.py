from superset.config import *

LICENSE_CHECK = False
GUARDIAN_AUTH = False

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'unittests.db')

DEBUG = True

SUPERSET_WEBSERVER_PORT = 8081

# Allowing SQLALCHEMY_DATABASE_URI to be defined as an env var for
# continuous integration
if 'SUPERSET__SQLALCHEMY_DATABASE_URI' in os.environ:
    SQLALCHEMY_DATABASE_URI = os.environ.get('SUPERSET__SQLALCHEMY_DATABASE_URI')

SQL_SELECT_AS_CTA = True
SQL_MAX_ROW = 666

TESTING = True
CSRF_ENABLED = False
SECRET_KEY = 'thisismyscretkey'
WTF_CSRF_ENABLED = False

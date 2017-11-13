from superset.config import *

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'unittests.db')

LICENSE_CHECK = False
GUARDIAN_AUTH = False


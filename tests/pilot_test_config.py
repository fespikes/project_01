from superset.config import *

#SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'unittests.db')
SQLALCHEMY_DATABASE_URI = 'mysql://root:123456@172.16.130.109:3306/pilot_ut_60?charset=utf8'

CAS_AUTH = False

GUARDIAN_AUTH = False

LICENSE_CHECK = False

WTF_CSRF_ENABLED = False

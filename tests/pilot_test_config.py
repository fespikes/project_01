from superset.config import *

#SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'unittests.db')
SQLALCHEMY_DATABASE_URI = 'mysql://root:123456@172.16.130.109:3306/pilot_ut_60?charset=utf8'

CAS_AUTH = False

GUARDIAN_AUTH = True
GUARDIAN_SERVER = 'https://172.26.2.26:8380'

FILE_ROBOT_SERVER = '172.26.2.28:5005'

LICENSE_CHECK = False

WTF_CSRF_ENABLED = False

ENABLE_TIME_ROTATE = False

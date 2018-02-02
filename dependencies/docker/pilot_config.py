# The worker number of server
PILOT_WORKERS = 8
# The port of server
PILOT_WEBSERVER_PORT = 8086
# Maximum number of rows returned when creating slice
ROW_LIMIT = 5000
# Maximum number of rows returned in the SQL editor
SQL_MAX_ROW = 10000


# SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'pilot.db')
# If use mysql, the database should be existed and change its charset to 'utf8':
# 'create/alter database superset character set utf8'
# and 'charset=utf8' should be in uri
SQLALCHEMY_DATABASE_URI = 'mysql://user:password@localhost:3306/database?charset=utf8'


# The config for caching slice data.
# You should not modify the 'CACHE_TYPE' which may cause exceptions.
# You can use 'ramdisk' to improve the efficiency of cache.
# 'CACHE_DEFAULT_TIMEOUT': The lift time (seconds) of cached data
CACHE_DEFAULT_TIMEOUT = 3600
CACHE_CONFIG = {'CACHE_THRESHOLD': 500,
                'CACHE_TYPE': 'filesystem',
                'CACHE_DIR': '/tmp/pilot_cache'}


# Enable Time Rotate Log Handler
ENABLE_TIME_ROTATE = False
TIME_ROTATE_LOG_LEVEL = 'WARNING'

# The guardian config
GUARDIAN_AUTH = True
GUARDIAN_HTTP_PROTOCOL = 'http'
GUARDIAN_SERVER = '172.16.1.190:8080'
GUARDIAN_TIMEOUT = 5    # second

# The config for hdfs_file microservices
HDFS_MICROSERVICES_SERVER = 'localhost:5000'

# License check server
LICENSE_CHECK = True
LICENSE_CHECK_SERVER = '172.16.2.41:2291'
# The jar has default path, if you have not move it, then no need to changed it.
# LICENSE_CHECK_JAR = '/usr/local/lib/pilot-license-1.0-transwarp-5.1.0-SNAPSHOT.jar'



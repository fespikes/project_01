from flask_babel import lazy_gettext as _

ALL_DATASOURCE_ACCESS_ERR = _(
    "This endpoint requires the `all_datasource_access` permission")
DATASOURCE_MISSING_ERR = _("The datasource seems to have been deleted")
DATASOURCE_ACCESS_ERR = _("You don't have access to this datasource")

OBJECT_NOT_FOUND = _("Not found this object")
NO_USER = _("Can't get user's information")

ONLINE_SUCCESS = _("Success to be online")
OFFLINE_SUCCESS = _("Success to be offline")
OBJECT_IS_ONLINE = _("This object is already online")
OBJECT_IS_OFFLINE = _("This object is already offline")
NO_ONLINE_PERMISSION = _("No permission for 'online' and 'offline'")

ADD_SUCCESS = _("Success to add")
ADD_FAILED = _("Failed to add, may caused by unique restriction")
UPDATE_SUCCESS = _("Success to update")
UPDATE_FAILED = _("Failed to update, may caused by unique restriction")
DELETE_SUCCESS = _("Success to delete")
DELETE_FAILED = _("Failed to delete")

MISS_PASSWORD_FOR_GUARDIAN = _("Miss password to access Guardian")

COLUMN_MISS_DATASET = _("Miss parameter [dataset_id] to query columns")
METRIC_MISS_DATASET = _("Miss parameter [dataset_id] to query metrics")

# filerobot
LOGIN_FILEROBOT_FAILED = _("Failed to login FileRobot")
LOGIN_FILEROBOT_SUCCESS = _("Success to login FileRobot")
LOGOUT_FILEROBOT_SUCCESS = _("Success to logout FileRobot")
MISS_PASSWORD_FOR_FILEROBOT = _("Miss password to login FileRobot")
NO_HDFS_CONNECTION = _("No HDFS connection, please create one")
NO_FILEROBOT_SERVER = _("Failed to get FileRobot server from config")

# views/connection.py
NONE_CONNECTION_NAME = _("Connection name can't be none")
NONE_CONNECTION_TYPE = _("Connection type can't be none")
NONE_SQLALCHEMY_URI = _("Sqlalchemy uri can't be none")
NONE_CONNECTION_ARGS = _("Connection args can't be none")
NONE_HTTPFS = _("Httpfs can't be none")

# views/dataset.py
NONE_COLUMN_NAME = _("Column name can't be none")
NONE_METRIC_NAME = _("Metric name can't be none")
NONE_METRIC_EXPRESSION = _("Metric expression can't be none")
NONE_DATASET_NAME = _("Dataset name can't be none")
NONE_DATASET_TYPE = _("Dataset type can't be none")
NONE_CONNECTION = _("Connection can't be none")
NONE_HDFS_PATH = _("HDFS path can't be none")
NONE_HDFS_CONNECTION = _("HDFS connection can't be none")

# views/core.py
NONE_SLICE_NAME = _("Slice name can't be none")
NONE_DASHBOARD_NAME = _("Dashboard name can't be none")

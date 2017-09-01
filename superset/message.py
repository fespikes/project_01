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
ADD_FAILED = _("Failed to add, may cased by unique restriction")
UPDATE_SUCCESS = _("Success to update")
UPDATE_FAILED = _("Failed to update, may cased by unique restriction")
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

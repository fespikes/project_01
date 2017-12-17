from flask_babel import gettext as __
from superset import appbuilder
from . import base
from . import home
from . import story
from . import core
from . import connection
from . import dataset
from . import sql_lab
from . import hdfs
from . import user

appbuilder.add_view(
    home.Home,
    "Home",
    label=__("Home"),
    category='',
    category_label='',
    icon="fa-list-ol")

# appbuilder.add_view(
#     story.StoryModelView,
#     "Story",
#     label=__("Story"),
#     category='',
#     category_label='',
#     icon="fa-list-ol")

appbuilder.add_view_no_menu(core.Superset)
appbuilder.add_view(
    core.DashboardModelView,
    "Dashboards",
    label=__("Dashboards"),
    icon="fa-dashboard",
    category='',
    category_icon='')
appbuilder.add_view(
    core.SliceModelView,
    "Slices",
    label=__("Slices"),
    icon="fa-bar-chart",
    category="",
    category_icon='')

appbuilder.add_view_no_menu(connection.ConnectionView)
appbuilder.add_view_no_menu(connection.HDFSConnectionModelView)
appbuilder.add_view(
    connection.DatabaseView,
    "Databases",
    label=__("Databases"),
    icon="fa-database",
    category="Sources",
    category_label=__("Sources"),
    category_icon='fa-database',)

appbuilder.add_view_no_menu(dataset.HDFSTableModelView)
appbuilder.add_view_no_menu(dataset.TableColumnInlineView)
appbuilder.add_view_no_menu(dataset.SqlMetricInlineView)
appbuilder.add_view(
    dataset.DatasetModelView,
    "Dataset",
    label=__("Dataset"),
    category="Sources",
    category_label=__("Sources"),
    icon='fa-table',)

appbuilder.add_view_no_menu(sql_lab.QueryView)
appbuilder.add_link(
    'SQL Editor',
    href='/p/sqllab',
    category_icon="fa-flask",
    icon="fa-flask",
    category='SQL Lab',
    category_label=__("SQL Lab"),)
appbuilder.add_link(
    'Query Search',
    href='/p/sqllab#search',
    icon="fa-search",
    category_icon="fa-flask",
    category='SQL Lab',
    category_label=__("SQL Lab"),)

appbuilder.add_view_no_menu(hdfs.HDFSBrowser)
appbuilder.add_link(
    'HDFS Browser',
    href='/hdfs/',
    label=__("HDFS Browser"),
    icon="fa-flask",
    category='',
    category_icon='')

appbuilder.add_view_no_menu(user.PresentUserView)
appbuilder.add_view_no_menu(user.UserView)

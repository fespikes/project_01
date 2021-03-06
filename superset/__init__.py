"""Package's main module!"""
import logging
import os
import ssl
from logging.handlers import TimedRotatingFileHandler

from sqlalchemy_utils.functions import database_exists, create_database
from flask import g, Flask, redirect
from flask_appbuilder import SQLA, AppBuilder, IndexView
from flask_appbuilder.baseviews import expose
from flask_cache import Cache
from flask_migrate import Migrate
from flask_compress import Compress
from superset.cas import CAS, login_required, access_token
from superset.source_registry import SourceRegistry
from werkzeug.contrib.fixers import ProxyFix
from superset import utils, config
from superset.jvm import start_jvm, shutdown_jvm
from superset.check_license import check_license


APP_DIR = os.path.dirname(__file__)
CONFIG_MODULE = os.environ.get('SUPERSET_CONFIG', 'superset.config')

app = Flask(__name__)
app.config.from_object(CONFIG_MODULE)
app.config['TEMPLATES_AUTO_RELOAD'] = True
Compress(app)

conf = app.config

# CAS
cas = None
if conf.get('CAS_AUTH'):
    cas = CAS(app, conf.get('CAS_URL_PREFIX'))
ssl._create_default_https_context = ssl._create_unverified_context


if app.debug:
    # In production mode, add log handler to sys.stderr.
    app.logger.addHandler(logging.StreamHandler())
    app.logger.setLevel(logging.INFO)


if not database_exists(conf.get("SQLALCHEMY_DATABASE_URI")):
    print("Create database ...")
    create_database(conf.get("SQLALCHEMY_DATABASE_URI"), "utf8")

db = SQLA(app)


utils.pessimistic_connection_handling(db.engine.pool)

# cache for slice data
file_cache = Cache(app, config=app.config.get('CACHE_CONFIG'))

# simple cache for share data among threads
simple_cache = Cache(app, config={'CACHE_TYPE': 'simple',
                                  'CACHE_DEFAULT_TIMEOUT': 30 * 86400})


migrate = Migrate(app, db, directory=APP_DIR + "/migrations")

logging.getLogger('flask_appbuilder').setLevel(logging.WARNING)

# Logging configuration
logging.basicConfig(format=app.config.get('LOG_FORMAT'))
logging.getLogger().setLevel(app.config.get('LOG_LEVEL'))

if app.config.get('ENABLE_TIME_ROTATE'):
    handler = TimedRotatingFileHandler(app.config.get('FILENAME'),
                                       when=app.config.get('ROLLOVER'),
                                       interval=app.config.get('INTERVAL'),
                                       backupCount=app.config.get('BACKUP_COUNT'))
    handler.setFormatter(logging.Formatter(app.config.get('LOG_FORMAT')))
    handler.setLevel(app.config.get('LOG_LEVEL'))
    logging.getLogger().addHandler(handler)


if conf.get('LICENSE_CHECK') or conf.get('GUARDIAN_AUTH'):
    start_jvm()

if conf.get('LICENSE_CHECK'):
    check_license()

if not conf.get('GUARDIAN_AUTH'):
    shutdown_jvm()


if app.config.get('ENABLE_CORS'):
    from flask_cors import CORS
    CORS(app, **app.config.get('CORS_OPTIONS'))

if app.config.get('ENABLE_PROXY_FIX'):
    app.wsgi_app = ProxyFix(app.wsgi_app)

if app.config.get('UPLOAD_FOLDER'):
    try:
        os.makedirs(app.config.get('UPLOAD_FOLDER'))
    except OSError:
        pass

for middleware in app.config.get('ADDITIONAL_MIDDLEWARE'):
    app.wsgi_app = middleware(app.wsgi_app)


def index_view():
    if conf.get('CAS_AUTH'):
        class MyIndexView(IndexView):
            @expose('/')
            @login_required
            def index(self):
                ### login in appbuilder
                # import flask
                # data = json.dumps({'username': cas.username, 'password': '123456'})
                # flask.session['user'] = data
                # return redirect(flask.url_for('AuthDBView.login'))

                from superset.cache import TokenCache
                token = access_token.get_token(cas.username)
                TokenCache.cache(cas.username, token)

                ### login here
                utils.login_app(appbuilder, cas.username, conf.get('DEFAULT_PASSWORD'))
                url = self.get_redirect()
                if url == self.appbuilder.get_url_for_index:
                    url = '/home'
                return redirect(url)
    else:
        class MyIndexView(IndexView):
            @expose('/')
            def index(self):
                url = self.get_redirect()
                if url == self.appbuilder.get_url_for_index:
                    url = '/home'
                return redirect(url)
    return MyIndexView


appbuilder = AppBuilder(
    app, db.session,
    base_template='superset/base.html',
    indexview=index_view(),
    security_manager_class=app.config.get("CUSTOM_SECURITY_MANAGER"))

sm = appbuilder.sm

get_session = appbuilder.get_session
results_backend = app.config.get("RESULTS_BACKEND")

# Registering sources
module_datasource_map = app.config.get("DEFAULT_MODULE_DS_MAP")
module_datasource_map.update(app.config.get("ADDITIONAL_MODULE_DS_MAP"))
SourceRegistry.register_sources(module_datasource_map)

from superset import views, config  # noqa


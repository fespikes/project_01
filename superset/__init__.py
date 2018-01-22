"""Package's main module!"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import json
import ssl
import requests
from logging.handlers import TimedRotatingFileHandler

from sqlalchemy_utils.functions import database_exists, create_database
from flask import g, Flask, redirect, request
from flask_appbuilder import SQLA, AppBuilder, IndexView
from flask_appbuilder.baseviews import expose
from flask_cache import Cache
from flask_migrate import Migrate
from flask_compress import Compress
from flask_cas import CAS, login_required
from superset.source_registry import SourceRegistry
from werkzeug.contrib.fixers import ProxyFix
from superset import utils, config
from superset.check_license import CheckLicense


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
    cas = CAS(app, '/cas')
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

cache = Cache(app, config=app.config.get('CACHE_CONFIG'))

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


# License check
if conf.get('LICENSE_CHECK') is True:
    license_jar = conf.get('LICENSE_CHECK_JAR')
    CheckLicense.check(license_jar)

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

                ### login here
                utils.login_app(appbuilder, cas.username, conf.get('DEFAULT_PASSWORD'))
                return redirect('/home')
    else:
        class MyIndexView(IndexView):
            @expose('/')
            def index(self):
                return redirect('/home')
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

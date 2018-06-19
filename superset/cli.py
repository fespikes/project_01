#!/usr/bin/env python
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import os
import logging
import celery
from celery.bin import worker as celery_worker
from subprocess import Popen

from flask_migrate import MigrateCommand, upgrade
from flask_script import Manager

from superset import app, sm, db, data, security
from superset.models import HDFSConnection, Log, Database


config = app.config

manager = Manager(app)
manager.add_command('db', MigrateCommand)


@manager.command
def init():
    """Inits the application"""
    security.sync_role_definitions()


def init_tables_and_roles():
    logging.info("Start to upgrade metadata tables...")
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    migration_dir = os.path.join(BASE_DIR, 'migrations')
    upgrade(directory=migration_dir)
    db.session.commit()
    logging.info("Finish to upgrade metadata tables.")


def init_examples():
    if config.get('LOAD_EXAMPLES'):
        rs = db.session.execute('show tables like "energy_usage";')
        if rs.rowcount == 0:
            logging.info("Start to load examples data...")
            load_examples(False, user_id=None)
            logging.info("Finish to load examples data.")
        else:
            logging.info("Exists examples data (such as: energy_usage).")


def create_default_user():
    if config.get('GUARDIAN_AUTH', False):
        return
    elif config.get('COMMUNITY_EDITION'):
        username = config.get('COMMUNITY_USERNAME')
        password = config.get('COMMUNITY_PASSWORD')
    else:
        username = config.get('DEFAULT_USERNAME')
        password = config.get('DEFAULT_PASSWORD')

    user = sm.find_user(username=username)
    if not user:
        logging.info("Begin to create default admin user...")
        user = sm.add_user(
            username, username, username,
            '{}@email.com'.format(username),
            sm.find_role('Admin'),
            password=password)
        if not user:
            logging.error("Failed to add default admin user.")
    sm.reset_password(user.id, password)
    user.password2 = password
    sm.get_session.commit()
    logging.info("Finish to add or edit default admin user.")


def create_default_inceptor_conn():
    name = config.get('DEFAULT_INCEPTOR_CONN_NAME')
    database = db.session.query(Database).filter_by(database_name=name).first()
    uri = 'inceptor://{}/default'.format(config.get('DEFAULT_INCEPTOR_SERVER'))
    if database:
        database.sqlalchemy_uri = uri
        db.session.commit()
        logging.info("Success to edit default inceptor connection.")
        Log.log_update(database, 'database', None)
    else:
        database = Database(database_name=name,
                            sqlalchemy_uri=uri,
                            args='{"connect_args": {"hive": "Hive Server 2", "mech": "Token"}}',
                            description='Default inceptor connection.')
        db.session.add(database)
        db.session.commit()
        logging.info("Success to add default inceptor connection.")
        Log.log_add(database, 'database', None)


def create_default_hdfs_conn():
    name = config.get('DEFAULT_HDFS_CONN_NAME')
    hconn = db.session.query(HDFSConnection).filter_by(connection_name=name).first()
    if hconn:
        hconn.httpfs = config.get('DEFAULT_HTTPFS')
        db.session.add(hconn)
        db.session.commit()
        logging.info("Success to edit default hdfs connection.")
        Log.log_update(hconn, 'hdfsconnection', None)
    else:
        hconn = HDFSConnection(connection_name=name,
                               httpfs=config.get('DEFAULT_HTTPFS'),
                               online=True,
                               description='Default hdfs connection for hdfs browser.')
        db.session.add(hconn)
        db.session.commit()
        logging.info("Success to add default hdfs connection.")
        Log.log_add(hconn, 'hdfsconnection', None)


def register_in_guardian():
    if config.get('GUARDIAN_AUTH'):
        from superset.guardian import guardian_client
        guardian_client.login()
        guardian_client.register()
        logging.info("Finish to register service in Guardian")


def init_studio_role():
    if config.get('GUARDIAN_AUTH') is True:
        from superset.guardian import guardian_client, guardian_admin
        admin_role = config.get('STUDIO_ADMIN_ROLE_NAME')
        if admin_role and guardian_client.get_role(admin_role):
            logging.info('Grant role [{}] global admin permission'.format(admin_role))
            guardian_admin.grant_admin_role(admin_role)

        developer_role = config.get('STUDIO_DEVELOPER_ROLE_NAME')
        if developer_role and guardian_client.get_role(developer_role):
            logging.info('Grant role [{}] global developer permission'.format(developer_role))
            guardian_admin.grant_developer_role(developer_role)

        viewer_role = config.get('STUDIO_VIEWER_ROLE_NAME')
        if viewer_role and guardian_client.get_role(viewer_role):
            logging.info('Grant role [{}] global viewer permission'.format(viewer_role))
            guardian_admin.grant_viewer_role(viewer_role)


def init_pilot():
    register_in_guardian()
    init_studio_role()
    # init_tables_and_roles()
    create_default_user()
    init_examples()
    create_default_inceptor_conn()
    create_default_hdfs_conn()


@manager.option(
    '-d', '--debug', action='store_true',
    help="Start the web server in debug mode")
@manager.option(
    '-a', '--address', default=config.get("PILOT_WEBSERVER_ADDRESS"),
    help="Specify the address to which to bind the web server")
@manager.option(
    '-p', '--port', default=config.get("PILOT_WEBSERVER_PORT"),
    help="Specify the port on which to run the web server")
@manager.option(
    '-w', '--workers', default=config.get("PILOT_WORKERS", 2),
    help="Number of gunicorn web server workers to fire up")
@manager.option(
    '-t', '--timeout', default=config.get("PILOT_WEBSERVER_TIMEOUT"),
    help="Specify the timeout (seconds) for the gunicorn web server")
def runserver(debug, address, port, timeout, workers):
    """Starts a web server"""
    init_pilot()
    debug = debug or config.get("DEBUG")
    if debug:
        app.run(
            host='0.0.0.0',
            port=int(port),
            threaded=True,
            debug=True)
    else:
        cmd = (
            "gunicorn "
            "-w {workers} "
            "--timeout {timeout} "
            "-b {address}:{port} "
            "--limit-request-line 0 "
            "--limit-request-field_size 0 "
            "superset:app").format(**locals())
        logging.info("Starting server with command: " + cmd)
        Popen(cmd, shell=True).wait()


@manager.option(
    '-v', '--verbose', action='store_true',
    help="Show extra information")
def version(verbose):
    """Prints the current version number"""
    s = (
        "\n-----------------------\n"
        "Pilot {version}\n"
        "-----------------------").format(
        version=config.get('VERSION_STRING'))
    print(s)
    if verbose:
        print("[DB] : " + "{}".format(db.engine))


@manager.option(
    '-t', '--load-test-data', action='store_true',
    help="Load additional test data")
def load_examples(load_test_data, user_id=None):
    """Loads a set of Slices and Dashboards and a supporting dataset """
    logging.info("Loading examples into {}".format(db))
    #data.load_css_templates()
    data.load_energy(user_id=user_id)
    data.load_world_bank_health_n_pop(user_id=user_id)
    data.load_birth_names(user_id=user_id)
    data.load_random_time_series_data(user_id=user_id)
    # data.load_long_lat_data(user_id=user_id)
    data.load_chinese_population(user_id=user_id)
    data.load_multiformat_time_series_data(user_id=user_id)
    data.load_misc_dashboard(user_id=user_id)

    if load_test_data:
        data.load_unicode_test_data(user_id=user_id)


@manager.command
def worker():
    """Starts a worker for async SQL query execution."""
    # celery -A tasks worker --loglevel=info
    logging.info("Starting SQL Celery worker.")
    if config.get('CELERY_CONFIG'):
        logging.info("Celery broker url: ")
        logging.info(config.get('CELERY_CONFIG').BROKER_URL)

    application = celery.current_app._get_current_object()
    c_worker = celery_worker.worker(app=application)
    options = {
        'broker': config.get('CELERY_CONFIG').BROKER_URL,
        'loglevel': 'INFO',
        'traceback': True,
    }
    c_worker.run(**options)

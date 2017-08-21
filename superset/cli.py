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


config = app.config

manager = Manager(app)
manager.add_command('db', MigrateCommand)


@manager.command
def init():
    """Inits the application"""
    security.sync_role_definitions()


def create_default_user():
    if config.get('COMMUNITY_EDITION') is False \
            or sm.find_user(username='admin'):
        return
    logging.info("Start to add default admin user ...")
    user = sm.add_user(
        'admin', 'admin', 'admin', 'admin@email.com', sm.find_role('Admin'),
        password='123456')
    if not user:
        logging.error("Failed to add default admin user.")
    user.password2 = '123456'
    sm.get_session.commit()
    logging.info("Finished to add default admin user.")


def init_pilot():
    rs = db.session.execute('show tables like "alembic_version";')
    if rs.rowcount == 0:
        logging.info("Start to create metadata tables...")
        BASE_DIR = os.path.abspath(os.path.dirname(__file__))
        migration_dir = os.path.join(BASE_DIR, 'migrations')
        upgrade(directory=migration_dir)
        db.session.commit()
        logging.info("Finished to create metadata tables.")

        logging.info("Start to initialize permissions and roles...")
        init()
        logging.info("Finished to initialize permissions and roles.")

    create_default_user()


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
        print("Starting server with command: " + cmd)
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
def load_examples(load_test_data):
    """Loads a set of Slices and Dashboards and a supporting dataset """
    print("Loading examples into {}".format(db))

    #data.load_css_templates()

    print("Loading energy related dataset")
    data.load_energy()

    print("Loading [World Bank's Health Nutrition and Population Stats]")
    data.load_world_bank_health_n_pop()

    print("Loading [Birth names]")
    data.load_birth_names()

    print("Loading [Random time series data]")
    data.load_random_time_series_data()

    print("Loading [Random long/lat data]")
    data.load_long_lat_data()

    print("Loading [Multiformat time series]")
    data.load_multiformat_time_series_data()

    print("Loading [Misc Charts] dashboard")
    data.load_misc_dashboard()

    if load_test_data:
        print("Loading [Unicode test data]")
        data.load_unicode_test_data()


@manager.command
def worker():
    """Starts a worker for async SQL query execution."""
    # celery -A tasks worker --loglevel=info
    print("Starting SQL Celery worker.")
    if config.get('CELERY_CONFIG'):
        print("Celery broker url: ")
        print(config.get('CELERY_CONFIG').BROKER_URL)

    application = celery.current_app._get_current_object()
    c_worker = celery_worker.worker(app=application)
    options = {
        'broker': config.get('CELERY_CONFIG').BROKER_URL,
        'loglevel': 'INFO',
        'traceback': True,
    }
    c_worker.run(**options)

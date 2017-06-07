#!/usr/bin/env bash
echo $DB
rm ~/pilot/unittests.db
rm ~/pilot/celerydb.sqlite
rm ~/pilot/celery_results.sqlite
rm -f .coverage
export SUPERSET_CONFIG=tests.superset_test_config
set -e
superset/bin/pilot db upgrade
superset/bin/pilot db upgrade  # running twice on purpose as a test
superset/bin/pilot version -v
python setup.py nosetests
coveralls

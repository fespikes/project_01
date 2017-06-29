#!/usr/bin/env bash
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3 150
echo $DB
rm ~/pilot/unittests.db
rm -f .coverage
export SUPERSET_CONFIG=tests.superset_test_config
set -e
superset/bin/pilot db upgrade
superset/bin/pilot db upgrade  # running twice on purpose as a test
superset/bin/pilot version -v
python setup.py nosetests
coveralls
sudo update-alternatives --install /usr/bin/python python /usr/bin/python2 100


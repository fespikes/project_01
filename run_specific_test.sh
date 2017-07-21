#!/usr/bin/env bash
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3 150
echo $DB
#rm ~/pilot/unittests.db
rm -f .coverage
#export SUPERSET_CONFIG=tests.superset_test_config
set -e
superset/bin/pilot db upgrade
superset/bin/pilot version -v
export SOLO_TEST=1
# e.g. tests.core_tests:CoreTests.test_templated_sql_json
nosetests  tests/dashboard_CRUD_tests.py \
           tests/database_CRUD_tests.py \
           tests/slice_CRUD_tests.py \
           tests/sql_metric_CRUD_tests.py \
           tests/table_column_CRUD_tests.py \
           tests/table_CRUD_tests.py \
           tests/home_tests.py
sudo update-alternatives --install /usr/bin/python python /usr/bin/python2 100

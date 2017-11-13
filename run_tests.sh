#!/usr/bin/env bash

sudo rm /usr/bin/python
sudo ln -s /usr/local/bin/python3 /usr/bin/python
# sudo update-alternatives --install /usr/bin/python python /usr/local/bin/python3 150

echo $(python --version)
echo $DB

echo "rm ~/pilot/unittests.db"
rm ~/pilot/unittests.db

echo "rm -f .coverage"
rm -f .coverage

echo "export SUPERSET_CONFIG=tests.pilot_test_config"
export SUPERSET_CONFIG=tests.pilot_test_config
set -e

echo "superset/bin/pilot db upgrade"
superset/bin/pilot db upgrade
superset/bin/pilot version -v

echo "python setup.py nosetests"
python setup.py nosetests

# submit the test report to coveralls.io, requires packages: coveralls and pyyaml
# echo "coveralls"
# coveralls

# sudo update-alternatives --install /usr/bin/python python /usr/bin/python2 100


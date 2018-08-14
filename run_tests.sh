#!/usr/bin/env bash

set -ex

export SUPERSET_CONFIG=tests.pilot_test_config

FALSE=false
ALL=all
debug=$FALSE
file=$ALL

##### args
for arg in "$@"
 do
     if [ $arg == "-d" ]; then
         debug="true"
     else
         file=$arg
     fi
 done


if [ $debug == $FALSE ]; then
  sudo ln -s /usr/local/bin/python3 /usr/bin/python3

  cd ..
  ##### fileRobot
  git clone http://jiajie:zjj02355331675@172.16.1.41:10080/studio/fileRobot.git
  cd fileRobot/fileRobot-client
  sudo python3 setup.py install
  cd ../..

  ##### sqlalchemy
  pip uninstall -y sqlalchemy
  git clone http://jiajie:zjj02355331675@172.16.1.41:10080/studio/sqlalchemy.git
  cd sqlalchemy
  sudo python3 setup.py install
  cd ..

  ##### flask-appbuilder
  pip uninstall -y flask-appbuilder
  git clone http://jiajie:zjj02355331675@172.16.1.41:10080/studio/flask-appbuilder.git
  cd flask-appbuilder
  sudo python3 setup.py install
  cd ..

  cd superset
  sudo python3 setup.py install
  pilot db upgrade
fi


if [ $file != $ALL ]; then
    #python setup.py nosetests
    nosetests $file
else
    nosetests tests/connection_tests.py
    nosetests tests/dashboard_tests.py
    nosetests tests/dataset_tests.py
    nosetests tests/slice_tests.py
    nosetests tests/sql_metric_tests.py
    nosetests tests/table_column_tests.py
fi

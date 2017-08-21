from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
from jpype import *


class CheckLicense(object):
    default_jar = "/usr/local/lib/pilot-license-1.0-transwarp-5.1.0-SNAPSHOT.jar"

    @classmethod
    def start_jvm(cls, license_jar):
        jar = license_jar if license_jar else cls.default_jar
        if not isJVMStarted():
            if not os.path.exists(jar):
                logging.error("Can't find the jar for license checking: {}"
                              .format(jar))
                raise IOError
            logging.info("=== Begin to start JVM ...")
            startJVM(get_default_jvm_path(), '-ea', '-Djava.class.path={}'
                     .format(jar))
            logging.info("=== Finish to start JVM.")

    @classmethod
    def shutdown_jvm(cls):
        logging.info("=== Begin to shutdown JVM ...")
        shutdownJVM()
        logging.info("=== Finish to shutdown JVM.")

    @classmethod
    def check(cls, server_location, license_jar=None):
        cls.start_jvm(license_jar)
        try:
            Check = JClass('io.transwarp.pilot.license.CheckLicense')
            check = Check()
            check.checkLicense(server_location)
            logging.info("License check succeed")
        except JavaException as ex:
            msg = "License check failed with check server: {}".format(server_location)
            logging.error(msg)
            raise Exception(msg)
        finally:
            cls.shutdown_jvm()

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
from jpype import *


class CheckLicense(object):

    @classmethod
    def start_jvm(cls, license_jar):
        if not isJVMStarted():
            if not os.path.exists(license_jar):
                logging.error("Can't find the jar for license checking: {}"
                              .format(license_jar))
                raise IOError
            logging.info("Begin to start JVM ...")
            startJVM(get_default_jvm_path(), '-ea', '-Djava.class.path={}'
                     .format(license_jar))
            logging.info("Finish to start JVM.")
            if not isThreadAttachedToJVM():
                attachThreadToJVM()

    @classmethod
    def shutdown_jvm(cls):
        logging.info("Begin to shutdown JVM ...")
        shutdownJVM()
        logging.info("Finish to shutdown JVM.")

    @classmethod
    def do_check(cls, license_jar):
        logging.info("Begin to check license ...")
        cls.start_jvm(license_jar)
        try:
            Check = JClass('io.transwarp.pilot.license.CheckLicense')
            check = Check()
            check.checkLicense()
            logging.info("License checking succeed")
            return True
        except JavaException as ex:
            msg = "License check failed: " + str(ex)
            logging.error(msg)
            return False
        finally:
            cls.shutdown_jvm()

    @classmethod
    def check(cls, license_jar):
        success = cls.do_check(license_jar)
        if not success:
            raise Exception("License checking failed")

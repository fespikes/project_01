import logging
import subprocess
import sys
import time
import os


def kinit(kinit_path, keytab_path, principle):
  cmdv = [
    kinit_path,
    "-k",
    "-t", keytab_path,
    principle
  ]

  logging.info("Initting kerberos from keytab:" + " ".join(cmdv))

  subp = subprocess.Popen(cmdv,
                          stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE,
                          close_fds=True,
                          bufsize=-1,)

  subp.wait()
  if subp.returncode != 0:
    logging.error("Couldn't init from keytab: 'kinit' exited with %s.\n%s\n%s" % (
      subp.returncode,
      "\n".join(str(subp.stdout.readlines())),
      "\n".join(str(subp.stderr.readlines()))
    ))







import errno
import logging
import os.path

import conf
import confparse


LOG = logging.getLogger(__name__)

_HDFS_SITE_DICT = None


_CNF_NN_PERMISSIONS_UMASK_MODE = 'fs.permissions.umask-mode'
_CNF_NN_SENTRY_PREFIX = 'sentry.authorization-provider.hdfs-path-prefixes'


def reset():
  global _HDFS_SITE_DICT
  _HDFS_SITE_DICT = None


def get_conf():
  if _HDFS_SITE_DICT is None:
    _parse_hdfs_site()
  return _HDFS_SITE_DICT


def get_umask_mode():
  umask = get_conf().get(_CNF_NN_PERMISSIONS_UMASK_MODE, '022')
  if len(umask) < 4:
    umask = "1" + umask

  return int(umask, 8)

def get_nn_sentry_prefixes():
  return get_conf().get(_CNF_NN_SENTRY_PREFIX, '')


def _parse_hdfs_site():
  global _HDFS_SITE_DICT
  hdfs_site_path = ''

  try:
    hdfs_site_path = os.path.join(conf.HDFS_CLUSTERS['default'].HADOOP_CONF_DIR.get(), 'hdfs-site.xml')
    data = file(hdfs_site_path, 'r').read()
  except KeyError:
    data = ""
  except IOError as err:
    if err.errno != errno.ENOENT:
      LOG.error('Cannot read from "%s": %s' % (hdfs_site_path, err))
      return
    # Keep going and make an empty ConfParse
    data = ""

  _HDFS_SITE_DICT = confparse.ConfParse(data)

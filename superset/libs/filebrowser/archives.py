#!/usr/bin/env python

# Utilities for dealing with file modes.

import os
import posixpath
import tarfile
import tempfile

from flask_babel import lazy_gettext as _
from superset import config
from zipfile import ZipFile


__all__ = ['archive_factory']


class Archive(object):
  """
  Acrchive interface.
  """
  def extract(self, path):
    """
    Extract an Archive.
    Should return a directory where the extracted contents live.
    """
    raise NotImplemented(_("Must implement 'extract' method."))

  def _create_dirs(self, basepath, dirs=[]):
    """
    Creates all directories passed at the given basepath.
    """
    for directory in dirs:
      # Stops if directory start with '/' or points to a relative path
      if os.path.isabs(directory) or '..' in directory:
        raise IllegalPathException()

      directory = os.path.join(basepath, directory)
      try:
        os.makedirs(directory)
      except OSError:
        pass

class ZipArchive(Archive):
  """
  Acts on a zip file in memory or in a temporary location.
  Python's ZipFile class inherently buffers all reading.
  """

  def __init__(self, file):
    self.file = isinstance(file, basestring) and open(file) or file
    self.zfh = ZipFile(self.file)

  def extract(self):
    """
    Extracts a zip file.
    If a 'file' ends with '/', then it is a directory and we must create it.
    Else, open a file for writing and meta pipe the contents zipfile to the new file.
    """
    # Store all extracted files in a temporary directory.
    if config.ARCHIVE_UPLOAD_TEMPDIR.get():
      directory = tempfile.mkdtemp(dir=config.ARCHIVE_UPLOAD_TEMPDIR.get())
    else:
      directory = tempfile.mkdtemp()

    dirs, files = self._filenames()
    self._create_dirs(directory, dirs)
    self._create_files(directory, files)

    return directory

  def _filenames(self):
    """
    List all dirs and files by reading the table of contents of the Zipfile.
    """
    dirs = []
    files = []
    for name in self.zfh.namelist():
      if name.endswith(posixpath.sep):
        dirs.append(name)
      else:
        files.append(name)
    return (dirs, files)

  def _create_files(self, basepath, files=[]):
    """
    Extract files to their rightful place.
    Files are written to a temporary directory immediately after being decompressed.
    """
    for f in files:
      new_path = os.path.join(basepath, f)
      new_file = open(new_path, 'w')
      new_file.write(self.zfh.read(f))
      new_file.close()


class TarballArchive(Archive):
  """
  Acts on a tarball (tar.gz) file in memory or in a temporary location.
  Python's ZipFile class inherently buffers all reading.
  """
  def __init__(self, file):
    if isinstance(file, basestring):
      self.path = file
    else:
      f = tempfile.NamedTemporaryFile(delete=False)
      f.write(file.read())
      self.path = f.name
      f.close()
    self.fh = tarfile.open(self.path)

  def extract(self):
    """
    Extracts a zip file.
    If a 'file' ends with '/', then it is a directory and we must create it.
    Else, open a file for writing and meta pipe the contents zipfile to the new file.
    """
    # Store all extracted files in a temporary directory.
    directory = tempfile.mkdtemp()

    dirs, files = self._filenames()
    self._create_dirs(directory, dirs)
    self._create_files(directory, files)

    return directory

  def _filenames(self):
    """
    List all dirs and files by reading the table of contents of the Zipfile.
    """
    dirs = []
    files = []
    for tarinfo in self.fh.getmembers():
      if tarinfo.isdir():
        dirs.append(tarinfo.name)
      else:
        files.append(tarinfo.name)
        parent = os.path.dirname(tarinfo.path)
        # getmembers() sometimes doesn't return all the directories
        # Go up the path one directory at the time
        while parent != '' and parent not in dirs:
          dirs.append(parent)
          parent = os.path.dirname(parent)
    return (dirs, files)

  def _create_files(self, basepath, files=[]):
    """
    Extract files to their rightful place.
    Files are written to a temporary directory immediately after being decompressed.
    """
    for f in files:
      new_path = os.path.join(basepath, f)
      new_file = open(new_path, 'w')
      new_file.write(self.fh.extractfile(f).read())
      new_file.close()


def archive_factory(path, archive_type='zip'):
  if archive_type == 'zip':
    return ZipArchive(path)
  elif archive_type == 'tarball' or archive_type == 'tar.gz' or archive_type == 'tgz':
    return TarballArchive(path)

class IllegalPathException(Exception):

  def __init__(self):
    super(IllegalPathException, self).__init__('''Archive path cannot be absolute or contain '..' ''')

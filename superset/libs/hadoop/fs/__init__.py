
"""
Interfaces and abstractions for filesystem access.

We should be agnostic whether we're using a "temporary" file
system, rooted in a local tmp dir, or whether we're using
a true HDFS.  This file defines the interface.

Note that PEP 355 (Path - object oriented filesystem paths) did
not pass.  Many file system methods are in __builtin__, os, or
os.path, and take strings representing filenames as arguments.
We maintain this usage of paths as arguments.

When possible, the interfaces here have fidelity to the
native python interfaces.
"""

import os
import posixpath
import pwd
import re
SEEK_SET, SEEK_CUR, SEEK_END = os.SEEK_SET, os.SEEK_CUR, os.SEEK_END


# The web (and POSIX) always uses forward slash as a separator
LEADING_DOUBLE_SEPARATORS = re.compile("^" + posixpath.sep*2)

def normpath(path):
  """
  Eliminates double-slashes.

  Oddly, posixpath.normpath doesn't eliminate leading double slashes,
  but it does clean-up triple-slashes.
  """
  p = posixpath.normpath(path)
  return LEADING_DOUBLE_SEPARATORS.sub(posixpath.sep, p)


class IllegalPathException(Exception):
  pass


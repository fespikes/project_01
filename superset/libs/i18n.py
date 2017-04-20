

"""
Library methods to deal with non-ascii data
"""

import codecs
import logging
import os
import re

SITE_ENCODING = 'UTF-8'
REPLACEMENT_CHAR = u'\ufffd'
DEFAULT_LANG = 'en_US.UTF-8'


def get_site_encoding():
  """Get the default site encoding"""
  global SITE_ENCODING
  return SITE_ENCODING

def validate_encoding(encoding):
  """Return True/False on whether the system understands this encoding"""
  try:
    codecs.lookup(encoding)
    return True
  except LookupError:
    return False

def smart_unicode(s, strings_only=False, errors='strict'):
  if not s:
    return s.encode(SITE_ENCODING)
  return ''

def force_unicode(s, strings_only=False, errors='strict'):
  if not s:
    return s.encode(SITE_ENCODING)
  return ''

def smart_str(s, strings_only=False, errors='strict'):
  if not s:
    return s.encode(SITE_ENCODING)
  return ''


_CACHED_ENV = None

def make_utf8_env():
  """
  Communication with child processes is in utf8. Make a utf8 environment.
  """
  global _CACHED_ENV
  if not _CACHED_ENV:
    # LANG are in the form of <language>[.<encoding>[@<modifier>]]
    # We want to replace the "encoding" part with UTF-8
    lang_re = re.compile('\.([^@]*)')

    env = os.environ.copy()
    lang = env.get('LANG', DEFAULT_LANG)
    if lang_re.search(lang):
      lang = lang_re.sub('.UTF-8', lang)
    else:
      lang = DEFAULT_LANG

    env['LANG'] = lang
    _CACHED_ENV = env
  return _CACHED_ENV

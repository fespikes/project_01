
"""
Helper for parsing Hadoop style configuration.
"""

import xml.parsers.expat

class ConfParse(dict):
  """
  A configuration parser for the "name"/"value" pairs in a file.
  Does no validating, so if you put garbage in, you get garbage out.
  """
  def __init__(self, conf):
    """
    Create a ConfParse with the conf data. ``conf`` may be a string
    or a file-like object with a ``read(nbytes)`` method.
    """
    dict.__init__(self)
    parser = xml.parsers.expat.ParserCreate()
    parser.StartElementHandler = self._element_start
    parser.EndElementHandler = self._element_end
    parser.CharacterDataHandler = self._char_handler
    self._curname = None
    self._element = None
    try:
      if callable(conf.read):
        parser.ParseFile(conf)
    except AttributeError:
      parser.Parse(conf)

  def getbool(self, key, default=None):
    """getbool understands the special "true"/"false" value in Hadoop"""
    val = self.get(key, None)
    if val is None:
      return default
    return str(val) == "true"

  def _element_start(self, name, attrs):
    self._element = name

  def _element_end(self, name):
    self._element = None
    if name == "value":
      self._curname = None

  def _char_handler(self, bytes):
    # We do appends here, because _char_handler may be called multiple
    # times.  The get() or syntax here is intentional, because
    # the dictionary usually has the element, but it's value is None.
    if self._element == "name":
      self._curname = (self.__dict__.get("_curname") or "") + bytes
    if self._element == "value":
      self[self._curname] = (self.get(self._curname) or "") + bytes

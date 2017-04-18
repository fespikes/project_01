
import logging
import posixpath
import requests
import urllib

from werkzeug.urls import iri_to_uri

from requests import exceptions
from requests.auth import HTTPBasicAuth
from requests_kerberos import HTTPKerberosAuth, OPTIONAL

from superset.libs.i18n import smart_str


LOG = logging.getLogger(__name__)


class RestException(Exception):
  """
  Any error result from the Rest API is converted into this exception type.
  """

  def __init__(self, error):
    Exception.__init__(self, error)
    self._error = error
    self._code = None
    self._message = str(error)
    self._headers = {}

    # Get more information if urllib2.HTTPError.
    try:
      self._code = error.response.status_code
      self._headers = error.response.headers
      self._message = self._error.response.text
    except AttributeError:
      pass

  def __str__(self):
    res = self._message or ""
    if self._code is not None:
      res += " (error %s)" % self._code
    return res

  def get_parent_ex(self):
    if isinstance(self._error, Exception):
      return self._error
    return None

  @property
  def code(self):
    return self._code

  @property
  def message(self):
    return self._message


class HttpClient(object):
  """
  Basic HTTP client tailored for rest APIs.
  """

  def __init__(self, base_url, exc_class=None, logger=None):
    """
    @param base_url: The base url to the API.
    @param exc_class: An exception class to handle non-200 results.
    """
    self._base_url = base_url.rstrip('/')
    self._exc_class = exc_class or RestException
    self._logger = logger or LOG
    self._session = requests.Session()

  def set_kerberos_auth(self):
    """Set up kerberos auth for the client, based on the current ticket."""
    self._session.auth = HTTPKerberosAuth(mutual_authentication=OPTIONAL)
    return self

  def set_basic_auth(self, username, password):
    self._session.auth = HTTPBasicAuth(username, password)
    return self

  def set_headers(self, headers):
    """
    Add headers to the request
    @param headers: A dictionary with the key value pairs for the headers
    @return: The current object
    """
    self._session.headers.update(headers)
    return self

  @property
  def base_url(self):
    return self._base_url

  @property
  def logger(self):
    return self._logger

  def set_verify(self, verify=True):
    self._session.verify = verify
    return self

  def _get_headers(self, headers):
    if headers:
      self._session.headers.update(headers)
    return self._session.headers.copy()

  def execute(self, http_method, path, params=None, data=None, headers=None, allow_redirects=False, urlencode=True, username=None):
    """
    Submit an HTTP request.
    @param http_method: GET, POST, PUT, DELETE
    @param path: The path of the resource. Unsafe characters will be quoted.
    @param params: Key-value parameter data.
    @param data: The data to attach to the body of the request.
    @param headers: The headers to set for this request.
    @param allow_redirects: requests should automatically resolve redirects.
    @param urlencode: percent encode paths.

    @return: The result of urllib2.urlopen()
    """
    # Prepare URL and params
    if urlencode:
      path = urllib.quote(smart_str(path))
    url = self._make_url(path, params)

    if not username:
      url = url + "?user.name=" + username
    if http_method in ("GET", "DELETE"):
      if data is not None:
        self.logger.warn("GET and DELETE methods do not pass any data. Path '%s'" % path)
        data = None

    request_kwargs = {'allow_redirects': allow_redirects}
    if headers:
      request_kwargs['headers'] = headers
    if data:
      request_kwargs['data'] = data

    try:
      resp = getattr(self._session, http_method.lower())(url, **request_kwargs)
      if resp.status_code >= 300:
        resp.raise_for_status()
        raise exceptions.HTTPError(response=resp)
      return resp
    except (exceptions.ConnectionError,
            exceptions.HTTPError,
            exceptions.RequestException,
            exceptions.URLRequired,
            exceptions.TooManyRedirects) as ex:
      raise self._exc_class(ex)

  def _make_url(self, path, params):
    res = self._base_url
    if path:
      res += posixpath.normpath('/' + path.lstrip('/'))
    if params:
      param_str = urllib.urlencode(params)
      res += '?' + param_str
    return iri_to_uri(res)

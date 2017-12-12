"""Utility functions used across Superset"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import decimal
import functools
import json
import logging
import markdown as md
import numpy
import os
import parsedatetime
import pytz
import smtplib
import sqlalchemy as sa
import signal
import uuid
import re

from builtins import object
from datetime import date, datetime, time
from dateutil.parser import parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formatdate
from flask import flash, Markup, render_template, Response, g
from flask_login import login_user
from flask_babel import gettext as __
from past.builtins import basestring
from sqlalchemy import event, exc
from sqlalchemy.types import TypeDecorator, TEXT

logging.getLogger('MARKDOWN').setLevel(logging.INFO)


EPOCH = datetime(1970, 1, 1)
DTTM_ALIAS = 'timestamp__'


class SupersetException(Exception):
    pass


class SupersetTimeoutException(SupersetException):
    pass


class SupersetSecurityException(SupersetException):
    pass


class MetricPermException(SupersetException):
    pass


class NoDataException(SupersetException):
    pass


class SupersetTemplateException(SupersetException):
    pass


def can_access(security_manager, permission_name, view_name):
    """Protecting from has_access failing from missing perms/view"""
    # try:
    #     return security_manager.has_access(permission_name, view_name)
    # except:
    #     pass
    # return False
    return True


def flasher(msg, severity=None):
    """Flask's flash if available, logging call if not"""
    try:
        flash(msg, severity)
    except RuntimeError:
        if severity == 'danger':
            logging.error(msg)
        else:
            logging.info(msg)


class memoized(object):  # noqa

    """Decorator that caches a function's return value each time it is called

    If called later with the same arguments, the cached value is returned, and
    not re-evaluated.
    """

    def __init__(self, func):
        self.func = func
        self.cache = {}

    def __call__(self, *args):
        try:
            return self.cache[args]
        except KeyError:
            value = self.func(*args)
            self.cache[args] = value
            return value
        except TypeError:
            # uncachable -- for instance, passing a list as an argument.
            # Better to not cache than to blow up entirely.
            return self.func(*args)

    def __repr__(self):
        """Return the function's docstring."""
        return self.func.__doc__

    def __get__(self, obj, objtype):
        """Support instance methods."""
        return functools.partial(self.__call__, obj)


# class DimSelector(Having):
#     def __init__(self, **args):
#         # Just a hack to prevent any exceptions
#         Having.__init__(self, type='equalTo', aggregation=None, value=None)
#
#         self.having = {'having': {
#             'type': 'dimSelector',
#             'dimension': args['dimension'],
#             'value': args['value'],
#         }}


def list_minus(l, minus):
    """Returns l without what is in minus

    >>> list_minus([1, 2, 3], [2])
    [1, 3]
    """
    return [o for o in l if o not in minus]


def parse_human_datetime(s):
    """
    Returns ``datetime.datetime`` from human readable strings

    >>> from datetime import date, timedelta
    >>> from dateutil.relativedelta import relativedelta
    >>> parse_human_datetime('2015-04-03')
    datetime.datetime(2015, 4, 3, 0, 0)
    >>> parse_human_datetime('2/3/1969')
    datetime.datetime(1969, 2, 3, 0, 0)
    >>> parse_human_datetime("now") <= datetime.now()
    True
    >>> parse_human_datetime("yesterday") <= datetime.now()
    True
    >>> date.today() - timedelta(1) == parse_human_datetime('yesterday').date()
    True
    >>> year_ago_1 = parse_human_datetime('one year ago').date()
    >>> year_ago_2 = (datetime.now() - relativedelta(years=1) ).date()
    >>> year_ago_1 == year_ago_2
    True
    """
    try:
        dttm = parse(s)
    except Exception:
        try:
            cal = parsedatetime.Calendar()
            dttm = dttm_from_timtuple(cal.parse(s)[0])
        except Exception as e:
            logging.exception(e)
            raise ValueError("Couldn't parse date string [{}]".format(s))
    return dttm


def is_letters(s):
    if not isinstance(s, str):
        return False
    zh_pattern = re.compile('[a-zA-Z]*$')
    if zh_pattern.match(s):
        return True
    else:
        return False


def dttm_from_timtuple(d):
    return datetime(
        d.tm_year, d.tm_mon, d.tm_mday, d.tm_hour, d.tm_min, d.tm_sec)


def parse_human_timedelta(s):
    """
    Returns ``datetime.datetime`` from natural language time deltas

    >>> parse_human_datetime("now") <= datetime.now()
    True
    """
    cal = parsedatetime.Calendar()
    dttm = dttm_from_timtuple(datetime.now().timetuple())
    d = cal.parse(s, dttm)[0]
    d = datetime(
        d.tm_year, d.tm_mon, d.tm_mday, d.tm_hour, d.tm_min, d.tm_sec)
    return d - dttm


class JSONEncodedDict(TypeDecorator):

    """Represents an immutable structure as a json-encoded string."""

    impl = TEXT

    def process_bind_param(self, value, dialect):
        if value is not None:
            value = json.dumps(value)

        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = json.loads(value)
        return value


def datetime_f(dttm):
    """Formats datetime to take less room when it is recent"""
    if dttm:
        dttm = dttm.isoformat()
        now_iso = datetime.now().isoformat()
        if now_iso[:10] == dttm[:10]:
            dttm = dttm[11:]
        elif now_iso[:4] == dttm[:4]:
            dttm = dttm[5:]
    return "<nobr>{}</nobr>".format(dttm)


def base_json_conv(obj):

    if isinstance(obj, numpy.int64):
        return int(obj)
    elif isinstance(obj, numpy.bool_):
        return bool(obj)
    elif isinstance(obj, set):
        return list(obj)
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    elif isinstance(obj, uuid.UUID):
        return str(obj)


def json_iso_dttm_ser(obj):
    """
    json serializer that deals with dates

    >>> dttm = datetime(1970, 1, 1)
    >>> json.dumps({'dttm': dttm}, default=json_iso_dttm_ser)
    '{"dttm": "1970-01-01T00:00:00"}'
    """
    val = base_json_conv(obj)
    if val is not None:
        return val
    if isinstance(obj, datetime):
        obj = obj.isoformat()
    elif isinstance(obj, date):
        obj = obj.isoformat()
    elif isinstance(obj, time):
        obj = obj.isoformat()
    else:
        raise TypeError(
            "Unserializable object {} of type {}".format(obj, type(obj))
        )
    return obj


def datetime_to_epoch(dttm):
    if dttm.tzinfo:
        epoch_with_tz = pytz.utc.localize(EPOCH)
        return (dttm - epoch_with_tz).total_seconds() * 1000
    return (dttm - EPOCH).total_seconds() * 1000


def now_as_float():
    return datetime_to_epoch(datetime.utcnow())


def json_int_dttm_ser(obj):
    """json serializer that deals with dates"""
    val = base_json_conv(obj)
    if val is not None:
        return val
    if isinstance(obj, datetime):
        obj = datetime_to_epoch(obj)
    elif isinstance(obj, date):
        obj = (obj - EPOCH.date()).total_seconds() * 1000
    else:
        raise TypeError(
            "Unserializable object {} of type {}".format(obj, type(obj))
        )
    return obj


def error_msg_from_exception(e):
    """Translate exception into error message

    Database have different ways to handle exception. This function attempts
    to make sense of the exception object and construct a human readable
    sentence.

    TODO(bkyryliuk): parse the Presto error message from the connection
                     created via create_engine.
    engine = create_engine('presto://localhost:3506/silver') -
      gives an e.message as the str(dict)
    presto.connect("localhost", port=3506, catalog='silver') - as a dict.
    The latter version is parsed correctly by this function.
    """
    msg = ''
    if hasattr(e, 'message'):
        if type(e.message) is dict:
            msg = e.message.get('message')
        elif e.message:
            msg = "{}".format(e.message)
    return msg or '{}'.format(e)


def markdown(s, markup_wrap=False):
    s = md.markdown(s or '', [
        'markdown.extensions.tables',
        'markdown.extensions.fenced_code',
        'markdown.extensions.codehilite',
    ])
    if markup_wrap:
        s = Markup(s)
    return s


def readfile(filepath):
    with open(filepath) as f:
        content = f.read()
    return content


def generic_find_constraint_name(table, columns, referenced, db):
    """Utility to find a constraint name in alembic migrations"""
    t = sa.Table(table, db.metadata, autoload=True, autoload_with=db.engine)

    for fk in t.foreign_key_constraints:
        if (
                fk.referred_table.name == referenced and
                set(fk.column_keys) == columns):
            return fk.name


def get_datasource_full_name(database_name, datasource_name, schema=None):
    if not schema:
        return "[{}].[{}]".format(database_name, datasource_name)
    return "[{}].[{}].[{}]".format(database_name, schema, datasource_name)


def get_schema_perm(database, schema):
    if schema:
        return "[{}].[{}]".format(database, schema)


def validate_json(obj):
    if obj:
        try:
            json.loads(obj)
        except Exception:
            raise SupersetException("JSON is not valid")


def table_has_constraint(table, name, db):
    """Utility to find a constraint name in alembic migrations"""
    t = sa.Table(table, db.metadata, autoload=True, autoload_with=db.engine)

    for c in t.constraints:
        if c.name == name:
            return True
    return False


class timeout(object):
    """
    To be used in a ``with`` block and timeout its content.
    """
    def __init__(self, seconds=1, error_message='Timeout'):
        self.seconds = seconds
        self.error_message = error_message

    def handle_timeout(self, signum, frame):
        logging.error("Process timed out")
        raise SupersetTimeoutException(self.error_message)

    def __enter__(self):
        try:
            signal.signal(signal.SIGALRM, self.handle_timeout)
            signal.alarm(self.seconds)
        except ValueError as e:
            logging.warning("timeout can't be used in the current context")
            logging.exception(e)

    def __exit__(self, type, value, traceback):
        try:
            signal.alarm(0)
        except ValueError as e:
            logging.warning("timeout can't be used in the current context")
            logging.exception(e)


def wrap_clause_in_parens(sql):
    """Wrap where/having clause with parenthesis if necessary"""
    if sql.strip():
        sql = '({})'.format(sql)
    return sa.text(sql)


def pessimistic_connection_handling(target):
    @event.listens_for(target, "checkout")
    def ping_connection(dbapi_connection, connection_record, connection_proxy):
        """
        Disconnect Handling - Pessimistic, taken from:
        http://docs.sqlalchemy.org/en/rel_0_9/core/pooling.html
        """
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("SELECT 1")
        except:
            raise exc.DisconnectionError()
        cursor.close()


class QueryStatus:

    """Enum-type class for query statuses"""

    CANCELLED = 'cancelled'
    FAILED = 'failed'
    PENDING = 'pending'
    RUNNING = 'running'
    SCHEDULED = 'scheduled'
    SUCCESS = 'success'
    TIMED_OUT = 'timed_out'


def notify_user_about_perm_udate(
        granter, user, role, datasource, tpl_name, config):
    msg = render_template(tpl_name, granter=granter, user=user, role=role,
                          datasource=datasource)
    logging.info(msg)
    subject = __('[Superset] Access to the datasource %(name)s was granted',
                 name=datasource.full_name)
    send_email_smtp(user.email, subject, msg, config, bcc=granter.email,
                    dryrun=config.get('EMAIL_NOTIFICATIONS'))


def send_email_smtp(to, subject, html_content, config, files=None,
                    dryrun=False, cc=None, bcc=None, mime_subtype='mixed'):
    """
    Send an email with html content, eg:
    send_email_smtp(
        'test@example.com', 'foo', '<b>Foo</b> bar',['/dev/null'], dryrun=True)
    """
    smtp_mail_from = config.get('SMTP_MAIL_FROM')

    to = get_email_address_list(to)

    msg = MIMEMultipart(mime_subtype)
    msg['Subject'] = subject
    msg['From'] = smtp_mail_from
    msg['To'] = ", ".join(to)
    recipients = to
    if cc:
        cc = get_email_address_list(cc)
        msg['CC'] = ", ".join(cc)
        recipients = recipients + cc

    if bcc:
        # don't add bcc in header
        bcc = get_email_address_list(bcc)
        recipients = recipients + bcc

    msg['Date'] = formatdate(localtime=True)
    mime_text = MIMEText(html_content, 'html')
    msg.attach(mime_text)

    for fname in files or []:
        basename = os.path.basename(fname)
        with open(fname, "rb") as f:
            msg.attach(MIMEApplication(
                f.read(),
                Content_Disposition='attachment; filename="%s"' % basename,
                Name=basename
            ))

    send_MIME_email(smtp_mail_from, recipients, msg, config, dryrun)


def send_MIME_email(e_from, e_to, mime_msg, config, dryrun=False):
    SMTP_HOST = config.get('SMTP_HOST')
    SMTP_PORT = config.get('SMTP_PORT')
    SMTP_USER = config.get('SMTP_USER')
    SMTP_PASSWORD = config.get('SMTP_PASSWORD')
    SMTP_STARTTLS = config.get('SMTP_STARTTLS')
    SMTP_SSL = config.get('SMTP_SSL')

    if not dryrun:
        s = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) if SMTP_SSL else \
            smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        if SMTP_STARTTLS:
            s.starttls()
        if SMTP_USER and SMTP_PASSWORD:
            s.login(SMTP_USER, SMTP_PASSWORD)
        logging.info("Sent an alert email to " + str(e_to))
        s.sendmail(e_from, e_to, mime_msg.as_string())
        s.quit()
    else:
        logging.info('Dryrun enabled, email notification content is below:')
        logging.info(mime_msg.as_string())


def get_email_address_list(address_string):
    if isinstance(address_string, basestring):
        if ',' in address_string:
            address_string = address_string.split(',')
        elif ';' in address_string:
            address_string = address_string.split(';')
        else:
            address_string = [address_string]
    return address_string


def coerce_bool(value):
  if isinstance(value, bool):
    return value

  try:
    upper = value.upper()
  except:
    upper = value
  if upper in ("FALSE", "0", "NO", "OFF", "NAY", "", None):
    return False
  if upper in ("TRUE", "1", "YES", "ON", "YEA"):
    return True
  raise Exception("Could not coerce %r to boolean value" % (value,))


def get_database_access_error_msg(database_name):
    return __("This view requires the database %(name)s or "
              "`all_datasource_access` permission", name=database_name)


def get_datasource_access_error_msg(datasource_name):
  return __("This endpoint requires the datasource %(name)s, database or "
            "`all_datasource_access` permission", name=datasource_name)


def get_datasource_exist_error_msg(full_name):
  return __("Datasource %(name)s already exists", name=full_name)


def json_error_response(msg, status=None):
  data = {'error': msg}
  status = status if status else 500
  return Response(
    json.dumps(data), status=status, mimetype="application/json")


def json_success_response(msg, status=None):
  data = {'message': msg}
  status = status if status else 200
  return Response(
    json.dumps(data), status=status, mimetype="application/json"
  )


def add_or_edit_user(appbuilder, username, password):
    """
    When passed Guardian or CAS verification, need to add a user to database
    or edit the user in database
    """
    try:
        user = appbuilder.sm.find_user(username=username)
        if not user:
            user = appbuilder.sm.add_user(
                username, username, username, '{}@transwarp.io'.format(username),
                appbuilder.sm.find_role('Admin'),  password=password)
            if not user:
                raise SupersetException('Add user: [{}] failed'.format(username))
        appbuilder.sm.reset_password(user.id, password)
        user.password2 = password
        appbuilder.sm.get_session.commit()
        logging.info('Add or edit user: [{}] succeed'.format(username))
        return user
    except Exception as e:
        logging.exception(str(e))
        raise e


def login_app(appbuilder, username, password):
    user = add_or_edit_user(appbuilder, username, password)
    login_user(user)
    return g.user

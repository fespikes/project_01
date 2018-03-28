import flask
import logging
import requests
from xmltodict import parse
from flask import current_app, Response, g, request
from .cas_urls import create_cas_login_url
from .cas_urls import create_cas_logout_url
from .cas_urls import create_cas_validate_url
from .cas_urls import create_cas_callback_url
from .access_token import get_token
from .pgt_file import PgtFile
from .proxy_ticket import get_proxy_ticket


try:
    from urllib import urlopen
except ImportError:
    from urllib.request import urlopen

blueprint = flask.Blueprint('cas', __name__)


@blueprint.route('/login/')
def login():
    """
    This route has two purposes. First, it is used by the user
    to login. Second, it is used by the CAS to respond with the
    `ticket` after the user logs in successfully.

    When the user accesses this url, they are redirected to the CAS
    to login. If the login was successful, the CAS will respond to this
    route with the ticket in the url. The ticket is then validated.
    If validation was successful the logged in username is saved in
    the user's session under the key `CAS_USERNAME_SESSION_KEY` and
    the user's attributes are saved under the key
    'CAS_USERNAME_ATTRIBUTE_KEY'
    """

    cas_st_session_key = current_app.config['CAS_SERVICE_TICKET_SESSION_KEY']

    redirect_url = create_cas_login_url(
        current_app.config['CAS_SERVER'],
        current_app.config['CAS_LOGIN_ROUTE'],
        flask.url_for('.login', _external=True))

    if 'ticket' in flask.request.args:
        flask.session[cas_st_session_key] = flask.request.args['ticket']

    if cas_st_session_key in flask.session:
        if validate(flask.session[cas_st_session_key]):
            if 'CAS_AFTER_LOGIN_SESSION_URL' in flask.session:
                redirect_url = flask.session.pop('CAS_AFTER_LOGIN_SESSION_URL')
            else:
                redirect_url = flask.url_for(current_app.config['CAS_AFTER_LOGIN'])
        else:
            del flask.session[cas_st_session_key]

    logging.info('Redirecting to: {0}'.format(redirect_url))
    return flask.redirect(redirect_url)


@blueprint.route('/logout/')
def logout():
    """
    When the user accesses this route they are logged out.
    """

    cas_username_session_key = current_app.config['CAS_USERNAME_SESSION_KEY']
    cas_attributes_session_key = current_app.config['CAS_ATTRIBUTES_SESSION_KEY']

    if cas_username_session_key in flask.session:
        del flask.session[cas_username_session_key]

    if cas_attributes_session_key in flask.session:
        del flask.session[cas_attributes_session_key]

    if current_app.config['CAS_AFTER_LOGOUT'] is not None:
        redirect_url = create_cas_logout_url(
            current_app.config['CAS_SERVER'],
            current_app.config['CAS_LOGOUT_ROUTE'],
            current_app.config['CAS_AFTER_LOGOUT'])
    else:
        redirect_url = create_cas_logout_url(
            current_app.config['CAS_SERVER'],
            current_app.config['CAS_LOGOUT_ROUTE'],
            request.url_root)

    logging.info('Redirecting to: {0}'.format(redirect_url))
    return flask.redirect(redirect_url)


def validate(ticket):
    """
    Will attempt to validate the ticket. If validation fails, then False
    is returned. If validation is successful, then True is returned
    and the validated username is saved in the session under the
    key `CAS_USERNAME_SESSION_KEY` while tha validated attributes dictionary
    is saved under the key 'CAS_ATTRIBUTES_SESSION_KEY'.
    """

    cas_username_session_key = current_app.config['CAS_USERNAME_SESSION_KEY']
    cas_attributes_session_key = current_app.config['CAS_ATTRIBUTES_SESSION_KEY']
    cas_pgtiou_session_key = current_app.config['CAS_PGTIOU_SESSION_KEY']

    logging.info("Validating token {0}".format(ticket))

    cas_callback_url = create_cas_callback_url(
        flask.request.url_root,
        current_app.config['CAS_PROXY_CALLBACK_ROUTE'])
    cas_validate_url = create_cas_validate_url(
        current_app.config['CAS_SERVER'],
        current_app.config['CAS_SERVICE_VALIDATE_ROUTE'],
        flask.url_for('.login', _external=True),
        ticket,
        None,
        cas_callback_url)

    logging.info("Making GET request to {0}".format(cas_validate_url))

    xml_from = {}
    isValid = False

    try:
        xmldump = urlopen(cas_validate_url).read().strip().decode('utf8', 'ignore')
        xml_from = parse(xmldump)
        isValid = True \
            if "cas:authenticationSuccess" in xml_from["cas:serviceResponse"] else False
    except ValueError:
        logging.error("CAS returned unexpected result")

    if isValid:
        logging.info("Valid Service Ticket: {}...".format(ticket[:20]))
        xml_from = xml_from["cas:serviceResponse"]["cas:authenticationSuccess"]
        username = xml_from["cas:user"]
        pgtiou = xml_from["cas:proxyGrantingTicket"]
        attributes = xml_from.get("cas:attributes", {})

        if "cas:memberOf" in attributes:
            attributes["cas:memberOf"] = \
                attributes["cas:memberOf"].lstrip('[').rstrip(']').split(',')
            for group_number in range(0, len(attributes['cas:memberOf'])):
                attributes['cas:memberOf'][group_number] = \
                    attributes['cas:memberOf'][group_number].lstrip(' ').rstrip(' ')

        flask.session[cas_username_session_key] = username
        flask.session[cas_attributes_session_key] = attributes
        flask.session[cas_pgtiou_session_key] = pgtiou
    else:
        logging.info("Invalid Service Ticket: {}...".format(ticket[:20]))

    return isValid


@blueprint.route('/proxyCallback/')
def pgt_callback():
    """
    Will attempt to be called back by CAS server to get PGT.
    This url should be added to '/serviceValidate' as parameter 'pgtUrl'.
    """
    pgtid = flask.request.args.get('pgtId')
    pgtiou = flask.request.args.get('pgtIou')
    if not pgtid:
        logging.info('Not received pgtIou and pgtId')
    else:
        PgtFile.add_pgt_to_file(pgtiou, pgtid)
        logging.info(
            'Received pgtIou: {}... and pgtId: {}...'.format(pgtiou[:20], pgtid[:20]))
    return Response()


@blueprint.route('/test_proxy_ticket/')
def test_proxy_ticket():
    target_service = 'http://172.16.1.190:8380'
    target_service = flask.request.args.get('targetService', target_service)
    pt = get_proxy_ticket(target_service)
    if not pt:
        return Response('Failed to get proxy ticket')
    url = '{}?ticket={}'.format(target_service, pt)
    resp = requests.get(url)
    logging.info(url)
    return Response(resp.text)


@blueprint.route('/test_token/')
def test_token():
    token = get_token(g.user.username)
    return Response(token)

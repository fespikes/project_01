import flask
import requests
from xmltodict import parse
from flask import current_app, Response
from .cas_urls import create_cas_login_url
from .cas_urls import create_cas_logout_url
from .cas_urls import create_cas_validate_url
from .cas_urls import create_cas_proxy_url
from .cas_urls import create_cas_callback_url


try:
    from urllib import urlopen
except ImportError:
    from urllib.request import urlopen

blueprint = flask.Blueprint('cas', __name__)


pgt_dict = {}


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

    cas_token_session_key = current_app.config['CAS_TOKEN_SESSION_KEY']

    redirect_url = create_cas_login_url(
        current_app.config['CAS_SERVER'],
        current_app.config['CAS_LOGIN_ROUTE'],
        flask.url_for('.login', _external=True))

    if 'ticket' in flask.request.args:
        flask.session[cas_token_session_key] = flask.request.args['ticket']

    if cas_token_session_key in flask.session:
        if validate(flask.session[cas_token_session_key]):
            if 'CAS_AFTER_LOGIN_SESSION_URL' in flask.session:
                redirect_url = flask.session.pop('CAS_AFTER_LOGIN_SESSION_URL')
            else:
                redirect_url = flask.url_for(current_app.config['CAS_AFTER_LOGIN'])
        else:
            del flask.session[cas_token_session_key]

    current_app.logger.debug('Redirecting to: {0}'.format(redirect_url))
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
            current_app.config['CAS_LOGOUT_ROUTE'])

    current_app.logger.debug('Redirecting to: {0}'.format(redirect_url))
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
    cas_pgt_session_key = current_app.config['CAS_PGT_SESSION_KEY']
    cas_attributes_session_key = current_app.config['CAS_ATTRIBUTES_SESSION_KEY']

    current_app.logger.debug("validating token {0}".format(ticket))

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

    current_app.logger.debug("Making GET request to {0}".format(cas_validate_url))

    xml_from_dict = {}
    isValid = False

    try:
        xmldump = urlopen(cas_validate_url).read().strip().decode('utf8', 'ignore')
        xml_from_dict = parse(xmldump)
        isValid = True if "cas:authenticationSuccess" in xml_from_dict["cas:serviceResponse"] else False
    except ValueError:
        current_app.logger.error("CAS returned unexpected result")

    if isValid:
        current_app.logger.debug("valid")
        xml_from_dict = xml_from_dict["cas:serviceResponse"]["cas:authenticationSuccess"]
        username = xml_from_dict["cas:user"]
        pgtiou = xml_from_dict['cas:proxyGrantingTicket']
        attributes = xml_from_dict.get("cas:attributes", {})

        if "cas:memberOf" in attributes:
            attributes["cas:memberOf"] = \
                attributes["cas:memberOf"].lstrip('[').rstrip(']').split(',')
            for group_number in range(0, len(attributes['cas:memberOf'])):
                attributes['cas:memberOf'][group_number] = \
                    attributes['cas:memberOf'][group_number].lstrip(' ').rstrip(' ')

        flask.session[cas_username_session_key] = username
        flask.session[cas_pgt_session_key] = pgt_dict[pgtiou]
        flask.session[cas_attributes_session_key] = attributes
    else:
        current_app.logger.debug("invalid")

    return isValid


@blueprint.route('/proxyCallback/')
def pgt_callback():
    """
    Will attempt to be called back by CAS server to get PGT.
    This url should be added to '/serviceValidate' as parameter 'pgtUrl'.
    """
    pgtid = flask.request.args.get('pgtId')
    pgtiou = flask.request.args.get('pgtIou')
    pgt_dict[pgtiou] = pgtid
    if not pgtid:
        current_app.logger.info('Not received pgtIou and pgtId')
    else:
        current_app.logger.info('Received pgtIou: [{}...] and pgtId: [{}...]'
                                .format(pgtiou[0:30], pgtid[0:30]))
    return Response()


def get_proxy_ticket(target_service):
    """
    Called by other APP, such as pilot, to get 'proxy ticket for' 'target_service'.
    """
    cas_pgt_session_key = current_app.config['CAS_PGT_SESSION_KEY']
    pgt = flask.session[cas_pgt_session_key]
    cas_proxy_url = create_cas_proxy_url(
        current_app.config['CAS_SERVER'],
        current_app.config['CAS_PROXY_ROUTE'],
        target_service,
        pgt)
    current_app.logger.info('Try to get proxy ticket for service: [{}] by PGT: [{}...]'
                            .format(target_service, pgt[0:30]))
    pt = None
    try:
        xmldump = urlopen(cas_proxy_url).read().strip().decode('utf8', 'ignore')
        xml_from = parse(xmldump)
        xml_from = xml_from['cas:serviceResponse']
        if 'cas:proxySuccess' in xml_from:
            pt = xml_from['cas:proxySuccess']['cas:proxyTicket']
            current_app.logger.info(
                'Success to get proxy ticket: [{}...]'.format(pt[0:30]))
        elif 'cas:proxyFailure' in xml_from:
            current_app.logger.error(
                'Failed to get proxy ticket: ' + str(dict(xml_from['cas:proxyFailure'])))
        else:
            current_app.logger.error(
                'Error response when getting proxy ticket: ' + xml_from)
    except ValueError:
        current_app.logger.error("CAS returned unexpected result")

    return pt


@blueprint.route('/test_pt/')
def proxy_ticket():
    target_service = 'http://172.16.1.190:8380/api/v1/users'
    target_service = flask.request.args.get('targetService', target_service)
    pt = get_proxy_ticket(target_service)
    url = '{}?ticket={}'.format(target_service, pt)
    resp = requests.get(url)
    current_app.logger.info(url)
    return Response(resp.text)

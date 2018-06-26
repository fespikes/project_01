import flask
import logging
from xmltodict import parse
from flask import current_app

from .cas_urls import create_cas_proxy_url
from .pgt_file import PgtFile

try:
    from urllib import urlopen
except ImportError:
    from urllib.request import urlopen


def get_proxy_ticket(target_service):
    """
    Get 'proxy ticket for' 'target_service'.
    """
    cas_pgtiou_session_key = current_app.config['CAS_PGTIOU_SESSION_KEY']
    pgtiou = flask.session[cas_pgtiou_session_key]
    if not pgtiou:
        raise Exception('No CAS_PGTIOU in session')
    pgt = PgtFile.get_pgt(pgtiou)
    if not pgt:
        raise Exception('Not found pgt in file by pgtiou: {}...'.format(pgtiou[:20]))

    cas_proxy_url = create_cas_proxy_url(
        current_app.config['CAS_SERVER'],
        current_app.config['CAS_PROXY_ROUTE'],
        target_service,
        pgt)
    logging.info('Try to get proxy ticket for service: {} by PGT: {}...'
                 .format(target_service, pgt[0:20]))

    pt = None
    try:
        xmldump = urlopen(cas_proxy_url).read().strip().decode('utf8', 'ignore')
        xml_from = parse(xmldump)
        xml_from = xml_from['cas:serviceResponse']
        if 'cas:proxySuccess' in xml_from:
            pt = xml_from['cas:proxySuccess']['cas:proxyTicket']
            logging.info('Success to get proxy ticket: {}...'.format(pt[0:20]))
        elif 'cas:proxyFailure' in xml_from:
            logging.error(
                'Failed to get proxy ticket: ' + str(dict(xml_from['cas:proxyFailure'])))
        else:
            logging.error('Error response when getting proxy ticket: ' + xml_from)
    except ValueError:
        logging.error("CAS returned unexpected result")

    return pt
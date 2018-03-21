import logging
import requests

from .proxy_ticket import get_proxy_ticket
from .access_token import guardian_server


def download_keytab(username, keytab_file):
    target_service = guardian_server()
    pt = get_proxy_ticket(target_service)
    url = '{}/api/v1/users/{}/keytab?ticket={}'.format(target_service, username, pt)
    logging.info(url)
    try:
        resp = requests.get(url, verify=False)
        f = open(keytab_file, 'wb+')
        f.write(resp.content)
        f.close()
    except Exception as e:
        raise Exception('Error response when downloading keytab: ' + str(e))

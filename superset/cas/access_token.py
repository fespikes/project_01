import json
import logging
import requests
from flask import current_app

from .proxy_ticket import get_proxy_ticket


TOKEN_NAME = 'pilot-token'


def guardian_server():
    server = current_app.config.get('GUARDIAN_SERVER')
    if 'http://' not in server and 'https://' not in server:
        if '8080' in server:
            server = 'http://{}'.format(server)
        else:
            server = 'https://{}'.format(server)
    return server


def get_token(username):
    target_service = guardian_server()
    pt = get_proxy_ticket(target_service)
    url = '{}/api/v1/accessToken?owner={}&ticket={}'.format(target_service, username, pt)
    logging.info(url)

    resp = requests.get(url, verify=False)
    try:
        token_objs = eval(resp.text)
    except Exception as e:
        raise Exception('Error response when getting tokens: ' + str(resp.text))
    for token_obj in token_objs:
        if token_obj['name'] == TOKEN_NAME:
            return get_token_by_id(target_service, token_obj['id'])

    return create_token(target_service)


def get_token_by_id(service, id):
    pt = get_proxy_ticket(service)
    url = '{}/api/v1/accessToken/{}?ticket={}'.format(service, id, pt)
    logging.info(url)

    resp = requests.get(url, verify=False)
    try:
        token_obj = json.loads(resp.text)
    except Exception as e:
        raise Exception('Error response when getting token by id: ' + str(resp.text))
    return token_obj['content']


def create_token(service):
    pt = get_proxy_ticket(service)
    new_token = {'name': TOKEN_NAME}
    url = '{}/api/v1/accessToken?ticket={}'.format(service, pt)
    logging.info(url)

    resp = requests.post(url, data=json.dumps(new_token), verify=False)
    try:
        token = json.loads(resp.text)
    except Exception as e:
        raise Exception('Error response when creating token: ' + str(resp.text))
    return token['content']

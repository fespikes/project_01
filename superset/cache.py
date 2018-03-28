import logging
import threading
from superset import simple_cache
from superset.cas.access_token import get_token


mutex = threading.Lock()


class BaseCache(object):

    @classmethod
    def do_cache(cls, key, value, timeout=86400):
        try:
            if mutex.acquire(1):
                simple_cache.set(key, value, timeout=timeout)
                logging.info('Cached [{}]'.format(key))
                mutex.release()
        except Exception as e:
            logging.exception(e)
            raise e


class TokenCache(BaseCache):

    KEY = 'Token_{username}'
    TIMEOUT = 7 * 86400

    @classmethod
    def key(cls, username):
        return cls.KEY.format(username=username)

    @classmethod
    def cache(cls, username, token):
        cls.do_cache(cls.key(username), token, timeout=cls.TIMEOUT)

    @classmethod
    def get(cls, username, set_first=True):
        key = cls.key(username)
        token = simple_cache.get(key)
        if token:
            logging.info('Get Token [{}] from cache'.format(key))
        elif not token and set_first:
            logging.info('Token [{}] is not cached. Try to cache ...'.format(key))
            token = get_token(username)
            cls.do_cache(key, token)
        return token

    @classmethod
    def delete(cls, cache, username):
        cache.delete(cls.key(username))


class FileRobotCache(BaseCache):

    KEY = 'Filerobot_{username}_{httpfs}'
    TIMEOUT = 86400

    @classmethod
    def key(cls, username, httpfs):
        return cls.KEY.format(username=username, httpfs=httpfs)

    @classmethod
    def cache(cls, username, httpfs, filerobot_client):
        key = cls.key(username, httpfs)
        cls.do_cache(key, filerobot_client, timeout=cls.TIMEOUT)

    @classmethod
    def get(cls, username, httpfs):
        key = cls.key(username, httpfs)
        client = simple_cache.get(key)
        if client:
            logging.info('Get Filerobot client [{}] from cache'.format(key))
        else:
            logging.error('Filerobot client [{}] is not cached'.format(key))
        return client

    @classmethod
    def delete(cls, username, httpfs):
        simple_cache.delete(cls.key(username, httpfs))

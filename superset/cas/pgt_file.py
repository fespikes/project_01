import os
import logging
import threading


lock = threading.Lock()


class PgtFile(object):

    pgt_file = '/tmp/pilot.cas'
    read_max_bytes = 16 * 1024

    @classmethod
    def get_pgt(cls, pgtiou):
        if not os.path.exists(cls.pgt_file):
            logging.error('Pgt file: [{}] is not existed'.format(cls.pgt_file))
            return None
        pgt = None
        if lock.acquire(1):
            with open(cls.pgt_file, 'rb') as f:
                line = f.readline()
                line = str(line, encoding='utf-8')
                kv = line.split(' = ')
                if pgtiou == kv[0].strip():
                    pgt = kv[1].rstrip('\n').strip()
        lock.release()
        return pgt

    @classmethod
    def add_pgt_to_file(cls, pgtiou, pgt):
        if lock.acquire(1):
            if not os.path.exists(cls.pgt_file):
                os.mknod(cls.pgt_file)
            with open(cls.pgt_file, 'rb+') as f:
                lines = f.readlines(cls.read_max_bytes)
                new_line = '{} = {}\n'.format(pgtiou, pgt)
                lines.insert(0, new_line.encode('utf-8'))

                f.seek(0)
                f.writelines(lines)
                f.truncate()
        lock.release()

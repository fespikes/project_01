import os
import logging
import threading


lock = threading.Lock()
read_rows = 100
pgt_file = '/tmp/pilot.cas'


class PgtFile(object):

    @classmethod
    def get_pgt(cls, pgtiou):
        if not os.path.exists(pgt_file):
            logging.error('Pgt file: [{}] is not existed'.format(pgt_file))
            return None
        pgt = None
        if lock.acquire(1):
            with open(pgt_file, 'rb') as f:
                row = 0
                while row < read_rows:
                    row += 1
                    line = f.readline()
                    if not line:
                        break
                    line = str(line, encoding='utf-8')
                    kv = line.split(' = ')
                    if pgtiou == kv[0].strip():
                        pgt = kv[1].rstrip('\n').strip()
        lock.release()
        return pgt

    @classmethod
    def add_pgt_to_file(cls, pgtiou, pgt):
        if lock.acquire(1):
            if not os.path.exists(pgt_file):
                os.mknod(pgt_file)
            with open(pgt_file, 'rb+') as f:
                lines = f.readlines(read_rows)
                new_line = '{} = {}\n'.format(pgtiou, pgt)
                lines.insert(0, new_line.encode('utf-8'))

                f.seek(0)
                f.writelines(lines)
                f.truncate()
        lock.release()

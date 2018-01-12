import {PILOT_PREFIX} from '../../utils/utils'
import { connectionTypes } from './actions';

export default {
	getAbsUrl: relativePath => window.location.origin + relativePath
}

export function argsValidate(args) {
    let validate = true;
    if(!(args && args.length > 0)) {
        validate = false;
    }
    try {
        JSON.parse(args);
    }catch (e) {
        validate = false;
    }
    return validate;
}

export function transformObjectToArray(objectArray, attr) {
    let array = [];
    objectArray.map(obj => {
        array.push(obj[attr]);
    });
    return array;
}

export function isCorrectConnection(connectionType, connectionTypes) {/* include inceptor,mysql,oracle,mssql connection */
    if(connectionType === connectionTypes.inceptor || connectionType === connectionTypes.mysql
        || connectionType === connectionTypes.oracle || connectionType === connectionTypes.mssql) {
        return true;
    }else {
        return false;
    }
};

export const connectDefaultInfo = {
    'HDFS': {
        'httpfs': {
            'defaultValue': '',
            'tip': 'HDFS httpf服务IP地址'
        },
        'defaultIncConnect': {
            'defaultValue': '',
            'tip': '如果HDFS数据集没有选择Inceptor连接，则将使用该Inceptor连接。'
        },
        'str': {
            'defaultValue': '',
            'tip': ''
        },
        'args': {
            'defaultValue': '',
            'tip': ''
        }
    },
    'INCEPTOR': {
        'str': {
            'defaultValue': 'inceptor://172.0.0.1:10000/database',
            'tip': '如果认证方式是LDAP，需要加上用户名和密码：inceptor://username:password@172.0.0.1:10000/database'
        },
        'args': {
            'defaultValue': {
                'connect_args': {
                    'framed': 0,
                    'hive': 'Hive Server 2',
                    'mech': 'Kerberos',
                    'kuser': 'username@TDH',
                    'krbconf': '/etc/krb5.conf',
                    'fqdn': 'tw-node1360'
                }
            },
            'tip': 'ODBC连接串的参数。（1）keytab文件通过Guardian获取；（2）支持LDAP认证，连接串需要添加用户名和密码'
        },
        'httpfs': {
            'defaultValue': '',
            'tip': ''
        },
        'defaultIncConnect': {
            'defaultValue': '',
            'tip': ''
        }
    },
    'MYSQL': {
        'str': {
            'defaultValue': 'mysql://username:password@172.0.0.1:3306/database?charset=utf8',
            'tip': '参数’charset=utf8’是必须的'
        },
        'args': {
            'defaultValue': {
                "connect_args": {

                }
            },
            'tip': '不再需要修改连接参数'
        },
        'httpfs': {
            'defaultValue': '',
            'tip': ''
        },
        'defaultIncConnect': {
            'defaultValue': '',
            'tip': ''
        }
    },
    'ORACLE': {
        'str': {
            'defaultValue': 'oracle://username:password@172.0.0.1:1521/sid',
            'tip': ''
        },
        'args': {
            'defaultValue': {
                "connect_args": {

                }
            },
            'tip': '不再需要修改连接参数'
        },
        'httpfs': {
            'defaultValue': '',
            'tip': ''
        },
        'defaultIncConnect': {
            'defaultValue': '',
            'tip': ''
        }
    },
    'MSSQL': {
        'str': {
            'defaultValue': 'mssql+pymssql://username:password@172.0.0.1.109:1433/pilot?charset=utf8',
            'tip': '参数’charset=utf8’是必须的'
        },
        'args': {
            'defaultValue': {
                "connect_args": {

                }
            },
            'tip': '不再需要修改连接参数'
        },
        'httpfs': {
            'defaultValue': '',
            'tip': ''
        },
        'defaultIncConnect': {
            'defaultValue': '',
            'tip': ''
        }
    }
};
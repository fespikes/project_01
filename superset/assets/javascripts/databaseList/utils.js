import {PILOT_PREFIX} from '../../utils/utils'
import { connectionTypes } from './actions';

export default {
	getAbsUrl: relativePath => window.location.origin + relativePath
}

export function transformObjectToArray(objectArray, attr) {
    let array = [];
    objectArray.map(obj => {
        array.push(obj[attr]);
    });
    return array;
}

export function getPublishConnectionUrl(record) {
    let url = window.location.origin + PILOT_PREFIX + "release/";
    if(isCorrectConnection(record.connection_type, connectionTypes)) {
        url += 'database/';
    }else if(record.connection_type === connectionTypes.hdfs) {
        url += 'hdfsconnection/';
    }
    if(record.online) {
        url += "offline/" + record.id;
    }else {
        url += "online/" + record.id;
    }
    return url;
}

export function isCorrectConnection(connectionType, connectionTypes) {/* include inceptor,mysql,oracle,mssql connection */
    if(connectionType === connectionTypes.inceptor || connectionType === connectionTypes.mysql
        || connectionType === connectionTypes.oracle || connectionType === connectionTypes.mssql) {
        return true;
    }else {
        return false;
    }
};
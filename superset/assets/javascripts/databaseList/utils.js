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
    let url = window.location.origin + "/p/release/";
    if(record.connection_type === "INCEPTOR") {
        url += 'database/';
    }else if(record.connection_type === "HDFS") {
        url += 'hdfsconnection/';
    }
    if(record.online) {
        url += "offline/" + record.id;
    }else {
        url += "online/" + record.id;
    }
    return url;
}
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
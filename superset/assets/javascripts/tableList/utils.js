export default {
    getAbsUrl: relativePath => window.location.origin + relativePath
}

export function extractUrlType(url) {
    const pathArray = url.split('/');
    const type = pathArray[pathArray.length -1];
    return type;
}
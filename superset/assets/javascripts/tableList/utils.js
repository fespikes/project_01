export default {
    getAbsUrl: relativePath => window.location.origin + relativePath
}

export function getWidthPercent(number) {
    let percent = Math.floor(100/number) + '%';
    return percent;
}

export function getTbTitle(data, widthPercent) {
    let tbTitle = [];
    data.columns.map((column) => {
        let objTitle = {
            title: column,
            dataIndex: column,
            key: column,
            width: widthPercent
        };
        tbTitle.push(objTitle);
    });
    return tbTitle;
}

export function getTbContent(data, widthPercent) {
    let tbContent = [];
    data.columns.map((column) => {
        let values = data.data[column];
        for(var index in values) {
            if(tbContent.length <= index) {
                let objContent = {};
                objContent[column] = values[index];
                objContent.key = index;
                objContent.width = widthPercent;
                tbContent.push(objContent);
            }else {
                tbContent[index][column] = values[index];
            }
        }
    });
    return tbContent;
}

export function getTbType(data, widthPercent) {
    let types = data.types;
    let objType = {};
    let tbType = [];
    data.columns.map((column, index) => {
        objType[column] = types[index];
    });
    objType.key = 'type';
    objType.width = widthPercent;
    tbType.push(objType);
    return tbType;
}
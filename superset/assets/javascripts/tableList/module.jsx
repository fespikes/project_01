import React from 'react';
import { Select } from 'antd';

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

export function getTbTitleInceptor(commonTitle) {
    let tbTitle = commonTitle;
    tbTitle.map(column => {
        column.render = (text) => {
            return (
                <input className='column-type' value={text}/>
            )
        }
    });
    return tbTitle;
}

export function getTbTitleHDFS(commonTitle) {

    let typeArray = [
        'int',
        'bigint',
        'float',
        'doubledecimal',
        'boolean',
        'string',
        'varchar',
        'date',
        'timestamp',
        'time'
    ];
    const Option = Select.Option;
    const options = typeArray.map(type => {
        return <Option key={type}>{type}</Option>
    });
    let tbTitle = commonTitle;
    tbTitle.map(column => {
        column.render = () => {
            return (
                <Select
                    style={{ width: '100%' }}
                    placeholder='select the type'>
                    {options}
                </Select>
            )
        }
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

export function constructInceptorDataset(dataset) {
    let inceptorDataset = {};
    inceptorDataset.dataset_name = dataset.dataset_name;
    inceptorDataset.dataset_type = dataset.dataset_type;
    inceptorDataset.table_name = dataset.table_name;
    inceptorDataset.schema = dataset.schema;
    inceptorDataset.database_id = dataset.database_id;
    inceptorDataset.sql = dataset.sql;
    inceptorDataset.description = dataset.description;

    return inceptorDataset;
}

export function constructHDFSDataset() {

}

export function constructUploadDataset() {

}

export function constructFileBrowserData(data) {
    let fbData = [];
    data.files.map(file => {
        if(!(file.type==='dir'&&(file.name==='..'||file.name==='.'))) {
            let node = {
                label: file.name,
                value: file.name,
                key: file.name,
                category: file.type,
                hdfs_path: file.path,
                isLeaf: file.type === 'file' ? true : false
            };
            fbData.push(node);
        }
    });
    return fbData;
}

export function appendTreeChildren(folderName, children, fbData) {
    fbData.map(folder => {
        if(folder.value === folderName) {
            folder.children = constructFileBrowserData(children);
        }
    });
    return fbData;
}


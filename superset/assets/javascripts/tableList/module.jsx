import React from 'react';
import { Select } from 'antd';

const MIN_WIDTH = 120;
const MAX_COLUMNS = 10;
const SCREEN_WIDTH = document.body.clientWidth - 100;
export function getTableWidth(number) {
    let width = '100%';
    if(number <= MAX_COLUMNS || Math.floor(SCREEN_WIDTH/number) >= MIN_WIDTH) {
        width = '100%';
    }else {
        width = MIN_WIDTH * number;
    }
    return width;
}

export function getColumnWidth(number) {
    let width = MIN_WIDTH;
    if(number <= MAX_COLUMNS || Math.floor(SCREEN_WIDTH/number) >= MIN_WIDTH) {
        width = Math.floor(100/number) + '%';
    }else {
        width = MIN_WIDTH;
    }
    return width;
}

export function getTbTitle(data, width) {
    let tbTitle = [];
    data.columns.map((column) => {
        let objTitle = {
            title: column,
            dataIndex: column,
            key: column,
            width: width
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
                <span className="column-type">{text}</span>
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

export function getTbContent(data) {
    let tbContent = [];
    data.columns.map((column) => {
        let values = data.data[column];
        for(var index in values) {
            if(tbContent.length <= index) {
                let objContent = {};
                objContent[column] = values[index];
                objContent.key = index;
                tbContent.push(objContent);
            }else {
                tbContent[index][column] = values[index];
            }
        }
    });
    return tbContent;
}

export function getTbType(data) {
    let types = data.types;
    let objType = {};
    let tbType = [];
    data.columns.map((column, index) => {
        objType[column] = types[index];
    });
    objType.key = 'type';
    tbType.push(objType);
    return tbType;
}

export function constructInceptorDataset(dataset) {
    let inceptorDataset = {};
    inceptorDataset.dataset_type = "INCEPTOR";
    inceptorDataset.dataset_name = dataset.dataset_name;
    inceptorDataset.table_name = dataset.table_name;
    inceptorDataset.schema = dataset.schema;
    inceptorDataset.database_id = dataset.database_id;
    inceptorDataset.sql = dataset.sql || '';
    inceptorDataset.description = dataset.description;

    return inceptorDataset;
}

export function constructHDFSDataset(dataset) {
    let hdfsDataset = {};
    hdfsDataset.dataset_name = dataset.dataset_name;
    hdfsDataset.dataset_type = 'HDFS';
    hdfsDataset.database_id = dataset.inceptorConnectId;
    hdfsDataset.description = dataset.description;
    hdfsDataset.hdfs_path = "/tmp/jiajie/hdfs_table";//mock data
    hdfsDataset.separator = dataset.separator;
    hdfsDataset.columns = {
        "names": ["birthday", "gender", "name"],
        "types": ["date", "varchar(30)", "varchar(120)"]
    };//mock data
    hdfsDataset.hdfs_connection_id = dataset.hdfsConnectId;
    hdfsDataset.file_type = dataset.file_type;
    hdfsDataset.quote = dataset.quote;
    hdfsDataset.skip_rows = parseInt(dataset.skip_rows);
    hdfsDataset.next_as_header = dataset.next_as_header;
    hdfsDataset.skip_more_rows = parseInt(dataset.skip_more_rows);
    hdfsDataset.charset = dataset.charset;
    return hdfsDataset;
}

export function constructUploadDataset() {
    //TODO
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

export function getDatasetTitle(opeType, datasetType) {
    let opeName = '';
    if(opeType === 'add') {
        opeName = "添加";
    }else if(opeType === 'edit') {
        opeName = "编辑";
    }
    return opeName + datasetType + '数据集';
}

export function getDatasetTab2Name(datasetType) {
    let tab2Name = "配置";
    if(datasetType === 'INCEPTOR') {
        tab2Name = '预览';
    }
    return tab2Name;
}

export function extractDatasetType(url) {
    const pathArray = url.split('/');
    let type = pathArray[pathArray.length - 2];
    return type;
}

export function extractOpeType(url) {
    const pathArray = url.split('/');
    return pathArray[1];
}

export function getDatasetId(opeType, pathname) {
    let id = '';
    const pathArray = pathname.split('/');
    if(opeType === 'edit') {
        id = pathArray[pathArray.length - 1];
    }
    return id;
}

export function initDatasetData(type, newData, oldData) {
    let data = {};
    switch(type) {
        case 'INCEPTOR':
            data = initInceptorData(newData, oldData);
            break;
        case 'HDFS':
            data = initHDFSData(newData, oldData);
            break;
        case 'UPLOAD':
            break;
        default:
            break;
    }
    return data;
}

function initInceptorData(newData, oldData) {
    let inceptorData = {
        dataset_type: 'INCEPTOR',
        dataset_name: newData.dataset_name,
        table_name: newData.table_name,
        schema: newData.schema,
        database_id: newData.database_id,
        db_name: oldData.db_name,
        sql: newData.sql,
        description: newData.description,
        databases: oldData.databases,
        treeData: oldData.treeData
    };
    return inceptorData;
}

function initHDFSData(newData, oldData) {
    let hdfsData = {
        dataset_type: 'HDFS',
        dataset_name: newData.dataset_name,
        description: newData.description,
        hdfsConnections: oldData.hdfsConnections,
        inceptorConnections: oldData.inceptorConnections,
        hdfsConnectId: oldData.hdfsConnectId,
        inceptorConnectId: oldData.inceptorConnectId,
        hdfsConnectName: oldData.hdfsConnectName,
        inceptorConnectName: oldData.inceptorConnectName,
        fileBrowserData: oldData.fileBrowserData,
        hdfsPath: newData.hdfs_path,
        charset: newData.charset,
        file_type: newData.file_type,
        next_as_header: newData.next_as_header,
        quote: newData.quote,
        separator: newData.separator,
        skip_more_rows: newData.skip_more_rows,
        skip_rows: newData.skip_rows
    };
    return hdfsData;
}

function initUploadData() {
    //TODO
}


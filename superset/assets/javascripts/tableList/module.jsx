import React from 'react';
import { Select, Popover } from 'antd';
import { datasetTypes } from './actions';

const MIN_WIDTH = 120;
const MAX_COLUMNS = 10;
const SCREEN_WIDTH = document.body.clientWidth - 100;

const typeArray = [
    'int',
    'bigint',
    'float',
    'double',
    'decimal',
    'boolean',
    'string',
    'varchar',
    'date',
    'timestamp',
    'time'
];

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

export function getTbTitleHDFS(commonTitle, _this) {

    const Option = Select.Option;
    const options = typeArray.map(type => {
        return <Option key={type}>{type}</Option>
    });
    let tbTitle = commonTitle;
    tbTitle.map(column => {
        column.render = () => {
            return (
                <Select
                    defaultValue='string'
                    style={{ width: '100%' }}
                    onSelect={ (value)=>_this.onTypeSelect(value, column) }
                    placeholder='select the type'>
                    {options}
                </Select>
            )
        }
    });
    return tbTitle;
}

export function setHDFSColumnType(selColumn, tbTitle, typeStr, _this) {
    let typeArrayAccuracy = setTypeArrayAccuracy(typeStr);
    const Option = Select.Option;
    const options = typeArrayAccuracy.map(type => {
        return <Option key={type}>{type}</Option>
    });
    tbTitle.map(column => {
        if(column.key === selColumn.key) {
            column.type = typeStr;
            column.render = () => {
                return (
                    <Select
                        style={{ width: '100%' }}
                        value={typeStr}
                        onSelect={ (value)=>_this.onTypeSelect(value, column) }
                        placeholder='select the type'>
                        {options}
                    </Select>
                )
            }
        }
    });
    return tbTitle;
}

function setTypeArrayAccuracy(typeStr) {
    let typeArrayAccuracy = typeArray.concat();
    if(!(typeStr.indexOf('varchar') > -1 || typeStr.indexOf('decimal') > -1)) {
        return typeArrayAccuracy;
    }
    let k = 0;
    typeArrayAccuracy.map((item, index) => {
        if(typeStr.indexOf(item) === 0) {
            k = index;
        }
    });
    typeArrayAccuracy.splice(k, 1, typeStr);
    return typeArrayAccuracy;
}

export function getTbContent(data) {
    let tbContent = [];
    data.records.map((record, index) => {
        let contentObj = {};
        contentObj.key = index + 1;
        for(var attr in record) {
            contentObj[attr] = record[attr];
        }
        tbContent.push(contentObj);
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
    inceptorDataset.dataset_type = datasetTypes.database;
    inceptorDataset.dataset_name = dataset.dataset_name;
    inceptorDataset.table_name = dataset.table_name;
    inceptorDataset.schema = dataset.schema;
    inceptorDataset.database_id = dataset.database_id;
    inceptorDataset.db_name = dataset.db_name;
    inceptorDataset.sql = dataset.sql || '';
    inceptorDataset.description = dataset.description || '';

    return inceptorDataset;
}

export function constructHDFSDataset(dataset, title) {
    let hdfsDataset = {};
    hdfsDataset.dataset_name = dataset.dataset_name;
    hdfsDataset.dataset_type = datasetTypes.hdfs;
    hdfsDataset.database_id = dataset.inceptorConnectId;
    hdfsDataset.description = dataset.description;
    hdfsDataset.hdfs_path = dataset.hdfsPath;
    hdfsDataset.separator = dataset.separator;
    hdfsDataset.columns = constructHDFSColumns(title);
    hdfsDataset.hdfs_connection_id = dataset.hdfsConnectId;
    hdfsDataset.file_type = dataset.file_type;
    hdfsDataset.quote = dataset.quote;
    hdfsDataset.skip_rows = parseInt(dataset.skip_rows);
    hdfsDataset.next_as_header = dataset.next_as_header;
    hdfsDataset.skip_more_rows = parseInt(dataset.skip_more_rows);
    hdfsDataset.charset = dataset.charset;
    return hdfsDataset;
}

function constructHDFSColumns(title) {
    let names = [];
    let types = [];
    let columns = {
        names: names,
        types: types
    };
    if(title) {
        title.map(t => {
            names.push(t.title);
            types.push(t.type || 'string');
        });
    }
    return columns;
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
                path: file.path,
                isLeaf: file.type === 'file' ? true : false
            };
            fbData.push(node);
        }
    });
    return fbData;
}

export function appendTreeChildren(path, children, fbData) {
    let treeNode = findTreeNode(fbData, path);
    if(treeNode) {
        treeNode.children = constructFileBrowserData(children);
    }
    return fbData;
}

export function findTreeNode(treeNodes, path) {
    let node = undefined;
    if (!treeNodes || !treeNodes.length) {
        return node;
    }
    let stack = [], item;
    for (let i = 0; i < treeNodes.length; i++) {
        stack.push(treeNodes[i]);
    }
    while (stack.length) {
        item = stack.shift();
        if(item.path === path) {
            node = item;
            break;
        }
        if (item.children && item.children.length) {

            stack = stack.concat(item.children);
        }
    }

    return node;
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
    if(datasetType === datasetTypes.database) {
        tab2Name = '数据预览';
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

export function extractOpeName(url) {
    const pathArray = url.split('/');
    return pathArray[2];
}

export function getDatasetId(opeType, pathname) {
    let id = '';
    const pathArray = pathname.split('/');
    if(opeType === 'edit') {
        id = pathArray[pathArray.length - 1];
    }
    return id;
}

export function judgeEnableClick(opeType, datasetId) {
    if(opeType === 'edit') {
        return true;
    }
    if(datasetId && datasetId !== '') {
        return true;
    }
    return false;
}

export function judgeEnableClickHDFSPreview(opeType, datasetType, datasetId, HDFSConfigured) {
    if(opeType === 'edit') {
        return true;
    }
    if(datasetId && datasetId !== '') {
        return true;
    }
    if((datasetType === datasetTypes.hdfs || datasetType === datasetTypes.uploadFile) && HDFSConfigured) {
        return true;
    }

    return false;
}

export function initDatasetData(type, newData, oldData) {
    let data = {};
    switch(type) {
        case datasetTypes.database:
            data = initInceptorData(newData, oldData);
            break;
        case datasetTypes.hdfs:
            data = initHDFSData(newData, oldData);
            break;
        default:
            break;
    }
    return data;
}

function initInceptorData(newData, oldData) {
    let inceptorData = {
        dataset_type: datasetTypes.database,
        dataset_name: newData.dataset_name,
        table_name: newData.table_name,
        schema: newData.schema,
        database_id: newData.database_id,
        sql: newData.sql || '',//for remove warning
        description: newData.description,
        databases: oldData.databases,
        treeData: oldData.treeData,
        db_name: oldData.db_name
    };
    return inceptorData;
}

function initHDFSData(newData, oldData) {
    let hdfsData = {
        dataset_type: datasetTypes.hdfs,
        dataset_name: newData.dataset_name,
        description: newData.description,
        hdfsPath: newData.hdfs_path,
        charset: newData.charset,
        file_type: newData.file_type,
        next_as_header: newData.next_as_header,
        quote: newData.quote,
        separator: newData.separator,
        skip_more_rows: newData.skip_more_rows,
        skip_rows: newData.skip_rows,
        hdfsConnections: oldData.hdfsConnections,
        inceptorConnections: oldData.inceptorConnections,
        hdfsConnectId: oldData.hdfsConnectId,
        inceptorConnectId: oldData.inceptorConnectId,
        hdfsConnectName: oldData.hdfsConnectName,
        inceptorConnectName: oldData.inceptorConnectName,
        fileBrowserData: oldData.fileBrowserData
    };
    return hdfsData;
}

export function initHDFSPreviewData(data, opeType) {
    let dataset = data;
    if(opeType === "add") {
        dataset.file_type = "csv";
        dataset.separator = ",";
        dataset.quote = "\\";
        dataset.skip_rows = "0";
        dataset.next_as_header = false;
        dataset.skip_more_rows = "0";
        dataset.charset = "utf-8";
    }
    return dataset;
}

export function isActive(type, location) {
    return location.pathname.indexOf(`/${type}/${datasetTypes.database}`) > -1 ||
        location.pathname.indexOf(`/${type}/${datasetTypes.hdfs}`) > -1 ||
        location.pathname.indexOf(`/${type}/${datasetTypes.uploadFile}`) > -1;
}

export function constructHDFSPreviewUrl(dataset) {
    let url = window.location.origin + '/hdfstable/preview/';
    url += '?hdfs_connection_id=' + parseInt(dataset.hdfsConnectId) + '&path=' + dataset.hdfsPath +
        '&separator=' + dataset.separator + '&quote=' + dataset.quote + '&skip_rows=' + parseInt(dataset.skip_rows) +
        '&next_as_header=' + dataset.next_as_header + '&skip_more_rows=' + parseInt(dataset.skip_more_rows) +
        '&charset=' + dataset.charset;
    return url;
}


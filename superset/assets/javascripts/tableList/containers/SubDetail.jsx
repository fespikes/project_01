import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import { Select, Tooltip, TreeSelect, Alert, Popconfirm } from 'antd';
import * as actionCreators from '../actions';
import { extractUrlType } from '../utils';
import { Confirm, CreateHDFSConnect, CreateInceptorConnect } from '../popup';
import { constructInceptorDataset, constructFileBrowserData, appendTreeChildren,
    initDatasetData, extractOpeType, getDatasetId } from '../module';
import { appendTreeData, constructTreeData } from '../../../utils/common2';

const fileBrowserData = {"path": "/user/hive/employee", "descending": null, "sortby": null, "files": [{"path": "/user/hive", "mtime": "May 13, 2017 12:00 AM", "name": "..", "size": 0, "mode": 16832, "stats": {"path": "/user/hive/employee/..", "mtime": 1494663357.534, "atime": 0.0, "size": 0, "mode": 16832, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwx------", "url": "http://localhost:8086/view/user/hive", "type": "dir"}, {"path": "/user/hive/employee", "mtime": "May 27, 2017 12:00 AM", "name": ".", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee", "mtime": 1495874611.498, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee", "type": "dir"}, {"path": "/user/hive/employee/employee5.txt", "mtime": "May 26, 2017 12:00 AM", "name": "employee5.txt", "size": 27, "mode": 33188, "stats": {"path": "/user/hive/employee/employee5.txt", "mtime": 1495784089.918, "atime": 1495784089.356, "size": 27, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/employee5.txt", "type": "file"}, {"path": "/user/hive/employee/subdir", "mtime": "May 27, 2017 12:00 AM", "name": "subdir", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee/subdir", "mtime": 1495874578.136, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee/subdir", "type": "dir"}, {"path": "/user/hive/employee/test_upload2.txt", "mtime": "May 27, 2017 12:00 AM", "name": "test_upload2.txt", "size": 14, "mode": 33188, "stats": {"path": "/user/hive/employee/test_upload2.txt", "mtime": 1495874611.693, "atime": 1495874611.498, "size": 14, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/test_upload2.txt", "type": "file"}], "pagesize": 4, "page": {"number": 2, "end_index": 7, "next_page_number": 2, "previous_page_number": 1, "num_pages": 2, "total_count": 7, "start_index": 5}};
const fileBrowserData2 = {"path": "/user/hive/employee", "descending": null, "sortby": null, "files": [{"path": "/user/hive", "mtime": "May 13, 2017 12:00 AM", "name": "..", "size": 0, "mode": 16832, "stats": {"path": "/user/hive/employee/..", "mtime": 1494663357.534, "atime": 0.0, "size": 0, "mode": 16832, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwx------", "url": "http://localhost:8086/view/user/hive", "type": "dir"}, {"path": "/user/hive/employee", "mtime": "May 27, 2017 12:00 AM", "name": ".", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee", "mtime": 1495874611.498, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee", "type": "dir"}, {"path": "/user/hive/employee/employee5.txt", "mtime": "May 26, 2017 12:00 AM", "name": "employee55.txt", "size": 27, "mode": 33188, "stats": {"path": "/user/hive/employee/employee5.txt", "mtime": 1495784089.918, "atime": 1495784089.356, "size": 27, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/employee5.txt", "type": "file"}, {"path": "/user/hive/employee/subdir", "mtime": "May 27, 2017 12:00 AM", "name": "subdirr", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee/subdir", "mtime": 1495874578.136, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee/subdir", "type": "dir"}, {"path": "/user/hive/employee/test_upload2.txt", "mtime": "May 27, 2017 12:00 AM", "name": "test_upload22.txt", "size": 14, "mode": 33188, "stats": {"path": "/user/hive/employee/test_upload2.txt", "mtime": 1495874611.693, "atime": 1495874611.498, "size": 14, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/test_upload2.txt", "type": "file"}], "pagesize": 4, "page": {"number": 2, "end_index": 7, "next_page_number": 2, "previous_page_number": 1, "num_pages": 2, "total_count": 7, "start_index": 5}};

function showAlert(response) {
    render(
        <Alert
            style={{ width: 400 }}
            type={response.type}
            message={response.message}
            closable={true}
            showIcon
        />,
        document.getElementById('showAlert')
    );
    setTimeout(function() {
        ReactDOM.unmountComponentAtNode(document.getElementById('showAlert'));
    }, 5000);
}

class SubDetail extends Component {

    constructor (props) {
        super(props);
        this.state = {
            dataset_type: props.match.params.type,
            dsInceptor: props.dsInceptor,
            dsHDFS: props.dsHDFS
        };
        //bindings
        this.onSave = this.onSave.bind(this);
        this.onConfig = this.onConfig.bind(this);
        this.onSelectTable = this.onSelectTable.bind(this);
        this.onLoadDataInceptor = this.onLoadDataInceptor.bind(this);
        this.onSelectHDFS = this.onSelectHDFS.bind(this);
        this.onLoadDataHDFS = this.onLoadDataHDFS.bind(this);
        this.onConnectChange = this.onConnectChange.bind(this);
        this.onHDFSConnectChange = this.onHDFSConnectChange.bind(this);
        this.onInceptorConnectChange = this.onInceptorConnectChange.bind(this);
        this.handleSQLChange = this.handleSQLChange.bind(this);
        this.handleDatasetChange = this.handleDatasetChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.handleFile = this.handleFile.bind(this);
        this.uploadFile = this.uploadFile.bind(this);
        this.createHDFSConnect = this.createHDFSConnect.bind(this);
        this.createInceptorConnect = this.createInceptorConnect.bind(this);
        this.callbackRefresh = this.callbackRefresh.bind(this);
    }

    /* inceptor field operation start */
    handleDatasetChange(e) {
        if(this.state.dataset_type === 'INCEPTOR') {
            this.state.dsInceptor.dataset_name = e.currentTarget.value;
            this.setState({
                dsInceptor: this.state.dsInceptor
            });
        }else if(this.state.dataset_type === 'HDFS' || this.state.dataset_type === 'UPLOAD') {
            this.state.dsHDFS.dataset_name = e.currentTarget.value;
            this.setState({
                dsHDFS: this.state.dsHDFS
            });
        }
    }

    handleDescriptionChange(e) {
        if(this.state.dataset_type === 'INCEPTOR') {
            this.state.dsInceptor.description = e.currentTarget.value;
            this.setState({
                dsInceptor: this.state.dsInceptor
            });
        }else if(this.state.dataset_type === 'HDFS' || this.state.dataset_type === 'UPLOAD') {
            this.state.dsHDFS.description = e.currentTarget.value;
            this.setState({
                dsHDFS: this.state.dsHDFS
            });
        }
    }

    handleSQLChange(e) {
        this.state.dsInceptor.sql = e.currentTarget.value;
        this.setState({
            dsInceptor: this.state.dsInceptor
        });
    }

    onConnectChange(dbId, node) {
        const me = this;
        const { fetchSchemaList } = me.props;
        fetchSchemaList(dbId, callback);
        function callback(success, data) {
            if(success) {
                let treeData = constructTreeData(data, false, 'folder');
                me.state.dsInceptor.database_id = dbId;
                me.state.dsInceptor.db_name = node.props.children;
                me.state.dsInceptor.treeData = treeData;
                me.setState({
                    dsInceptor: me.state.dsInceptor
                });
            }else {

            }
        }
    }

    onSelectTable(value, node) {
        if(node.props.category === 'file') {
            this.state.dsInceptor.table_name = value;
            this.setState({
                dsInceptor: this.state.dsInceptor
            });
        }
    }

    onLoadDataInceptor(node) {
        const me = this;
        const schema = node.props.value;
        const { fetchTableList } = me.props;
        return fetchTableList(me.state.dsInceptor.database_id, schema, callback);

        function callback(success, data) {
            if(success) {
                let treeData = appendTreeData(
                    schema,
                    data,
                    JSON.parse(JSON.stringify(me.state.dsInceptor.treeData))
                );
                me.state.dsInceptor.schema = schema;
                me.state.dsInceptor.treeData = treeData;
                me.setState({
                    dsInceptor: me.state.dsInceptor
                });
            }else {

            }
        }
    }

    onSave() {
        const me = this;
        const { createDataset, saveDatasetId, editDataset, saveInceptorDataset } = this.props;
        const opeType = extractOpeType(window.location.hash);
        const dsInceptor = constructInceptorDataset(me.state.dsInceptor);
        saveInceptorDataset(me.state.dsInceptor);
        if(window.location.hash.indexOf('/edit') > 0) {
            let datasetId = getDatasetId(opeType, window.location.hash);
            editDataset(dsInceptor, datasetId, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    response.type = 'success';
                    response.message = '编辑成功';
                    let url = '/' + opeType + '/preview/' + me.state.dataset_type + '/';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                }
                showAlert(response);
            }
        }else {
            createDataset(dsInceptor, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    response.type = 'success';
                    response.message = '创建成功';
                    saveDatasetId(data.object_id);
                    let url = '/' + opeType + '/preview/' + me.state.dataset_type + '/';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                }
                showAlert(response);
            }
        }
    }
    /* inceptor field operation end */


    /* hdfs field operation start */
    createHDFSConnect() {
        const { dispatch } = this.props;
        let createHDFSConnectPopup = render(
            <CreateHDFSConnect
                dispatch={dispatch}
                />,
            document.getElementById('popup_root')
        );
        if(createHDFSConnectPopup) {
            createHDFSConnectPopup.showDialog();
        }
    }

    createInceptorConnect() {
        const { dispatch } = this.props;
        let createInceptorConnectPopup = render(
            <CreateInceptorConnect
                dispatch={dispatch}
                callbackRefresh={this.callbackRefresh}
            />,
            document.getElementById('popup_root')
        );
        if(createInceptorConnectPopup) {
            createInceptorConnectPopup.showDialog();
        }
    }

    onHDFSConnectChange(value, node) {
        this.state.dsHDFS.hdfsConnectId = value;
        this.state.dsHDFS.hdfsConnectName = node.props.children;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    onInceptorConnectChange(value, node) {
        this.state.dsHDFS.inceptorConnectId = value;
        this.state.dsHDFS.inceptorConnectName = node.props.children;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    onSelectHDFS(value, node) {
        this.state.dsHDFS.hdfsPath = node.props.hdfs_path;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    onLoadDataHDFS(node) {
        const me = this;
        const folderName = node.props.value;
        const { fetchHDFSFileBrowser } = me.props;
        //return fetchHDFSFileBrowser(callback);
        callback(true, fileBrowserData2);
        function callback(success, data) {
            if(success) {
                let treeData = appendTreeChildren(folderName, data, JSON.parse(JSON.stringify(me.state.dsHDFS.fileBrowserData)));
                me.state.dsHDFS.fileBrowserData = treeData;
                me.setState({
                    dsHDFS: me.state.dsHDFS
                });
            }
        }
    }

    onConfig() {
        const { saveHDFSDataset } = this.props;
        saveHDFSDataset(this.state.dsHDFS);
    }
    /* hdfs field operation end */


    /* file field operation start */
    handleFile() {
        this.refs.fileName.innerText = this.refs.fileSelect.files[0].name;
        this.state.dsHDFS.uploadFileName = this.refs.fileSelect.files[0].name;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    uploadFile() {//only upload one file
        if(this.state.dsHDFS.uploadFileName === '') {
            let confirmPopup = render(
                <Confirm />,
                document.getElementById('popup_root'));
            if(confirmPopup) {
                confirmPopup.showDialog();
            }
            return;
        }
        const { fetchUploadFile } = this.props;
        fetchUploadFile(
            this.refs.fileSelect.files[0],
            this.state.dsHDFS.hdfsConnectId,
            this.state.dsHDFS.hdfsPath,
            callback
        );
        function callback(success) {
            let response = {};
            if(success) {
                response.type = 'success';
                response.message = '上传成功';
            }else {
                response.type = 'error';
                response.message = '上传失败';
            }
            showAlert(response);
        }
    }
    /* file field operation end */

    callbackRefresh(type) {
        if(type === 'inceptor') {
            this.doFetchDatabaseList();
        }else if(type === 'hdfs') {
            this.doFetchInceptorList();
            this.doFetchHDFSList();
        }
    }

    doFetchDatabaseList() {
        const { fetchDatabaseList } = this.props;
        const me = this;
        fetchDatabaseList(callback);
        function callback(success, data) {
            if(success) {
                me.state.dsInceptor.databases = data;
                me.setState({
                    dsInceptor: me.state.dsInceptor
                });
            }
        }
    }

    doFetchInceptorList() {
        const { fetchInceptorConnectList } = this.props;
        const me = this;
        fetchInceptorConnectList(inceptorCallback);
        function inceptorCallback(success, data) {
            if(success) {
                me.state.dsHDFS.inceptorConnections = data;
                me.setState({
                    dsHDFS: me.state.dsHDFS
                });
            }
        }
    }

    doFetchHDFSList() {
        const { fetchHDFSConnectList, switchHDFSConnected } = this.props;
        const me = this;
        fetchHDFSConnectList(hdfsCallback);
        function hdfsCallback(success, data) {
            if(success) {
                me.state.dsHDFS.hdfsConnections = data;
                me.setState({
                    dsHDFS: me.state.dsHDFS
                });
                if(data.length > 0) {
                    switchHDFSConnected(true);
                }else {
                    switchHDFSConnected(false);
                }
            }
        }
    }

    componentDidMount() {
        const me = this;
        const {
            fetchHDFSFileBrowser,
            fetchDatasetDetail,
            fetchDBDetail,
            saveDatasetId,
            fetchSchemaList,
            fetchHDFSDetail} = me.props;
        if(window.location.hash.indexOf('/edit') > 0) {
            let datasetId = getDatasetId('edit', window.location.hash);
            saveDatasetId(datasetId);
        }else {
            saveDatasetId('');//clear datasetId
        }
        if(this.state.dataset_type === 'INCEPTOR') {
            this.doFetchDatabaseList();
        }else if(this.state.dataset_type === 'HDFS' || this.state.dataset_type === 'UPLOAD') {
            this.doFetchInceptorList();
            this.doFetchHDFSList();
            //fetchHDFSFileBrowser(fileCallback);
            fileCallback(true, fileBrowserData);
            function fileCallback(success, fileBrowserData) {
                if(success) {
                    me.state.dsHDFS.fileBrowserData = constructFileBrowserData(fileBrowserData);
                    me.setState({
                        dsHDFS: me.state.dsHDFS
                    });
                }
            }
        }
        if(window.location.hash.indexOf('/edit') > 0) {
            let pathArray = window.location.hash.split('/');
            let datasetId = pathArray[pathArray.length - 1];
            let datasetType = pathArray[pathArray.length -2];
            fetchDatasetDetail(datasetId, callback);
            function callback(success, data) {
                if(success) {
                    if(datasetType === 'INCEPTOR') {
                        fetchDBDetail(data.database_id, callbackDBName);
                        fetchSchemaList(data.database_id, callbackSchemaList);
                        function callbackDBName(success, db) {
                            if(success) {
                                me.state.dsInceptor.db_name = db.database_name;
                                me.setState({
                                    dsInceptor: initDatasetData('INCEPTOR', data, me.state.dsInceptor)
                                });
                            }
                        }
                        function callbackSchemaList(success, data) {
                            if(success) {
                                let treeData = constructTreeData(data, false, 'folder');
                                me.state.dsInceptor.treeData = treeData;
                                me.setState({
                                    dsInceptor: me.state.dsInceptor
                                });
                            }
                        }
                    }else if(datasetType === 'HDFS') {

                        fetchDBDetail(data.database_id, dbCallback);
                        fetchHDFSDetail(data.hdfs_connection_id, hdfsCallback);
                        function dbCallback(success, dbData) {
                            if(success) {
                                me.state.dsHDFS.inceptorConnectName = dbData.database_name;
                                me.setState({
                                    dsHDFS: initDatasetData('HDFS', data, me.state.dsHDFS)
                                });

                            }
                        }
                        function hdfsCallback(success, hdfsData) {
                            if(success) {
                                me.state.dsHDFS.hdfsConnectName = hdfsData.connection_name;
                                me.setState({
                                    dsHDFS: initDatasetData('HDFS', data, me.state.dsHDFS)
                                });
                            }
                        }
                    }else if(datasetType === 'UPLOAD') {
                        //TODO
                    }
                }
            }
        }
    }

    render () {
        const me = this;
        const { HDFSConnected } = me.props;
        let datasetType = me.props.datasetType;
        let opeType = extractOpeType(window.location.hash);
        let datasetId = getDatasetId(opeType, window.location.hash);
        if(datasetType === '') { //for browser refresh
            datasetType = extractUrlType(window.location.hash);
        }
        const Option = Select.Option;
        let dbOptions=[], hdfsOptions=[], inceptorOptions=[];
        if(datasetType === 'INCEPTOR') {
            if(me.state.dsInceptor.databases) {
                dbOptions = me.state.dsInceptor.databases.map(database => {
                    return <Option key={database.id}>{database.database_name}</Option>
                });
            }
        }else if(datasetType === 'HDFS' || datasetType === 'UPLOAD') {
            if(me.state.dsHDFS.hdfsConnections) {
                hdfsOptions = me.state.dsHDFS.hdfsConnections.map(hdfs => {
                    return <Option key={hdfs.id}>{hdfs.connection_name}</Option>
                });
            }
            if(me.state.dsHDFS.inceptorConnections) {
                inceptorOptions = me.state.dsHDFS.inceptorConnections.map(inceptor => {
                    return <Option key={inceptor.id}>{inceptor.database_name}</Option>
                });
            }
        }
        console.log('this.state.dsInceptor=', this.state.dsInceptor);
        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    {/* inceptor corresponding dom*/}
                    <div className={datasetType==='INCEPTOR'?'':'none'}>
                        <label className="data-detail-item">
                            <span>数据集名称：</span>
                            <input type="text" onChange={this.handleDatasetChange}
                                   value={this.state.dsInceptor.dataset_name}/>
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                        <textarea value={this.state.dsInceptor.description}
                                  defaultValue="" onChange={this.handleDescriptionChange}/>
                        </label>
                        <label className="data-detail-item">
                            <span>选择连接：</span>
                            <Select
                                style={{ width: 230 }}
                                value={this.state.dsInceptor.db_name}
                                onSelect={this.onConnectChange}
                            >
                                {dbOptions}
                            </Select>
                            <div className="connect-success">
                                &nbsp;<button onClick={this.createInceptorConnect}>新建连接</button>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>选择表：</span>
                            <TreeSelect
                                showSearch
                                value={this.state.dsInceptor.table_name}
                                style={{ width: 782 }}
                                placeholder="Please select"
                                treeData={this.state.dsInceptor.treeData}
                                loadData={this.onLoadDataInceptor}
                                onSelect={this.onSelectTable}
                                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                            >
                            </TreeSelect>
                            <Tooltip title="选择表">
                                <i className="icon icon-info"/>
                            </Tooltip>
                        </label>
                        <div>
                            <label className="data-detail-item">
                                <span>SQL：</span>
                                <textarea cols="30" rows="10" value={this.state.dsInceptor.sql || ''}
                                          onChange={this.handleSQLChange}/>
                                <a href={ window.location.origin + '/pilot/sqllab' } target="_blank">
                                    切换至SQL LAB编辑
                                </a>
                            </label>
                        </div>
                        <label className="sub-btn">
                            <input type="button" defaultValue="保存" onClick={this.onSave}/>
                        </label>
                    </div>

                    {/* HDFS corresponding dom*/}
                    <div className={(datasetType==='HDFS' || datasetType==='UPLOAD')?'':'none'}>
                        <label className="data-detail-item">
                            <span>数据集名称：</span>
                            <input type="text" onChange={this.handleDatasetChange}
                                   value={this.state.dsHDFS.dataset_name}/>
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                        <textarea value={this.state.dsHDFS.description}
                                  defaultValue="" onChange={this.handleDescriptionChange}/>
                        </label>
                        <div className={datasetType==='UPLOAD'?'':'none'}>
                            <label className="data-detail-item">
                                <span></span>
                                <div>
                                    <label className="file-browser" htmlFor="xFile" style={{width: 200}}>
                                        <span>选择文件</span>
                                    </label>
                                    <div className="file-name">
                                        <i className="icon icon-file"/>
                                        <span ref="fileName"/>
                                    </div>
                                    <div className="file-upload" style={{display: 'none'}}>
                                        <input type="file" id="xFile" className="file-select" onChange={this.handleFile}
                                               ref="fileSelect"/>
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div className={HDFSConnected===false?'':'none'}>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="data-connect-status">
                                    <span>尚未建立HDFS连接</span>
                                    <button onClick={this.createHDFSConnect}>建立HDFS连接</button>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10"/>
                            </label>
                        </div>
                        <div className={HDFSConnected===true?'':'none'}>
                            <label className="data-detail-item">
                                <span>选择连接：</span>
                                <Select
                                    style={{ width: 300 }}
                                    value={this.state.dsHDFS.hdfsConnectName}
                                    onSelect={this.onHDFSConnectChange}
                                >
                                    {hdfsOptions}
                                </Select>
                            </label>
                            <label className="data-detail-item">
                                <span>关联inceptor连接：</span>
                                <Select
                                    style={{ width: 300 }}
                                    value={this.state.dsHDFS.inceptorConnectName}
                                    onSelect={this.onInceptorConnectChange}
                                >
                                    {inceptorOptions}
                                </Select>
                            </label>
                        </div>
                        <div>
                            <label className="data-detail-item">
                                <span>选择数据目录：</span>
                                <TreeSelect
                                    showSearch
                                    style={{ width: 300 }}
                                    placeholder="please select"
                                    treeCheckable={false}
                                    treeData={this.state.dsHDFS.fileBrowserData}
                                    onSelect={this.onSelectHDFS}
                                    loadData={this.onLoadDataHDFS}
                                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                    >
                                </TreeSelect>
                            </label>
                        </div>
                        <label className="sub-btn">
                            <input type="button" defaultValue="上传文件" className={this.state.dataset_type==='HDFS'?'none':''}
                                   onClick={this.uploadFile}/>
                            <Link to={`/${opeType}/preview/${this.state.dataset_type}/${datasetId}`} onClick={this.onConfig}>
                                配置
                            </Link>
                        </label>
                    </div>
                    <div id="showAlert" className="alert-tip"></div>
                </div>
            </div>
        );
    }
}

function mapStateToProps (state) {
    return state.subDetail;
}

function mapDispatchToProps (dispatch) {

    //filter out all necessary properties
    const {
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        editDataset,
        saveDatasetId,
        saveHDFSDataset,
        saveInceptorDataset,
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser,
        fetchUploadFile,
        fetchDatasetDetail,
        fetchDBDetail,
        fetchHDFSDetail,
        switchHDFSConnected
    } = bindActionCreators(actionCreators, dispatch);

    return {
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        editDataset,
        saveDatasetId,
        saveHDFSDataset,
        saveInceptorDataset,
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser,
        fetchUploadFile,
        fetchDatasetDetail,
        fetchDBDetail,
        fetchHDFSDetail,
        switchHDFSConnected,
        dispatch
    };
}
export default connect (mapStateToProps, mapDispatchToProps ) (withRouter(SubDetail));
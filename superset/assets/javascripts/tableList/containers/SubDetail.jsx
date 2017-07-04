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
import { constructInceptorDataset, constructFileBrowserData, appendTreeChildren, initDatasetData } from '../module';
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
            dsInceptor: {
                dataset_type: props.match.params.type,
                dataset_name: '',
                table_name: '',
                schema: '',
                database_id: '',
                db_name: '',
                sql: '',
                description: '',
                databases: [],
                treeData: []
            },
            dsHDFS: {
                dataset_type: props.match.params.type,
                dataset_name: '',
                description: '',
                hdfsConnections: [],
                inceptorConnections: [],
                hdfsConnectId: '',
                inceptorConnectId: '',
                fileBrowserData: [],
                hdfsPath: '',
                uploadFileName: ''
            }
        };

        this.onSave = this.onSave.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
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

    onConnectChange(dbId) {
        const me = this;
        const { fetchSchemaList } = me.props;
        fetchSchemaList(dbId, callback);
        function callback(success, data) {
            if(success) {
                let treeData = constructTreeData(data, false, 'folder');
                me.state.dsInceptor.database_id = dbId;
                me.state.dsInceptor.treeData = treeData;
                me.setState({
                    dsInceptor: me.state.dsInceptor
                });
            }else {

            }
        }
    }

    onHDFSConnectChange(value) {
        this.state.dsHDFS.hdfsConnectId = value;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    onInceptorConnectChange(value) {
        this.state.dsHDFS.inceptorConnectId = value;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    onSelect(value, node) {
        if(node.props.category === 'file') {
            this.state.dsInceptor.table_name = value;
            this.setState({
                dsInceptor: this.state.dsInceptor
            });
        }
    }

    onLoadData(node) {
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

    onSave() {
        const me = this;
        const { createDataset, saveDatasetId } = this.props;
        if(window.location.hash.indexOf('/edit') > 0) {
            let url = '/add/preview/' + me.state.dataset_type;
            me.props.history.push(url);
        }else {
            const dsInceptor = constructInceptorDataset(me.state.dsInceptor);
            createDataset(dsInceptor, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    response.type = 'success';
                    response.message = '创建成功';
                    saveDatasetId(data.object_id);
                    let url = '/add/preview/' + me.state.dataset_type;
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                }
                showAlert(response);
            }
        }
    }

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
        const {fetchHDFSFileBrowser, fetchDatasetDetail, fetchDBDetail} = me.props;
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
                        fetchDBDetail(data.database_id, callback);
                        function callback(success, db) {
                            if(success) {
                                me.state.dsInceptor.db_name = db.database_name;
                                me.setState({
                                    dsInceptor: initDatasetData('INCEPTOR', data, me.state.dsInceptor)
                                });
                            }
                        }
                    }else if(datasetType === 'HDFS') {
                        //TODO
                    }else if(datasetType === 'UPLOAD') {
                        //TODO
                    }
                }
            }
        }
    }

    render () {
        const me = this;
        const { operationType, HDFSConnected } = me.props;
        let datasetType = me.props.datasetType;
        if(datasetType === '') { //for browser refresh
            datasetType = extractUrlType(window.location.hash);
        }
        const Option = Select.Option;
        let dbOptions=[], hdfsOptions=[], inceptorOptions=[];
        if(datasetType === 'INCEPTOR') {
            dbOptions = me.state.dsInceptor.databases.map(database => {
                return <Option key={database.id}>{database.database_name}</Option>
            });
        }else if(datasetType === 'HDFS' || datasetType === 'UPLOAD') {
            hdfsOptions = me.state.dsHDFS.hdfsConnections.map(hdfs => {
                return <Option key={hdfs.id}>{hdfs.connection_name}</Option>
            });
            inceptorOptions = me.state.dsHDFS.inceptorConnections.map(inceptor => {
                return <Option key={inceptor.id}>{inceptor.database_name}</Option>
            });
        }
        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    <div>
                        <label className="data-detail-item">
                            <span>数据集名称：</span>
                            <input type="text" onChange={this.handleDatasetChange}
                                   value={this.state.dsInceptor.dataset_name || this.state.dsHDFS.dataset_name}/>
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                            <textarea value={this.state.dsInceptor.description || this.state.dsHDFS.description}
                                onChange={this.handleDescriptionChange}/>
                        </label>
                    </div>

                    {/* inceptor corresponding dom*/}
                    <div className={datasetType==='INCEPTOR'?'':'none'}>
                        <label className="data-detail-item">
                            <span>选择连接：</span>
                            <Select
                                style={{ width: 230 }}
                                value={this.state.dsInceptor.db_name}
                                onChange={this.onConnectChange}
                            >
                                {dbOptions}
                            </Select>
                            <div className="connect-success">
                                &nbsp;<button onClick={this.createInceptorConnect}>新建连接</button>
                            </div>
                        </label>
                        <div className={operationType==='table'?'':'none'}>
                            <label className="data-detail-item">
                                <span>选择表：</span>
                                <TreeSelect
                                    showSearch
                                    value={this.state.dsInceptor.table_name}
                                    style={{ width: 782 }}
                                    placeholder="Please select"
                                    treeData={this.state.dsInceptor.treeData}
                                    loadData={this.onLoadData}
                                    onSelect={this.onSelect}
                                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                >
                                </TreeSelect>
                                <Tooltip title="选择表">
                                    <i className="icon icon-info"/>
                                </Tooltip>
                            </label>
                        </div>
                        <div>
                            <label className="data-detail-item">
                                <span>SQL：</span>
                                <textarea name="" id="" cols="30" rows="10" value={this.state.dsInceptor.sql}
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
                                    onChange={this.onHDFSConnectChange}
                                >
                                    {hdfsOptions}
                                </Select>
                            </label>
                            <label className="data-detail-item">
                                <span>关联inceptor连接：</span>
                                <Select
                                    style={{ width: 300 }}
                                    onChange={this.onInceptorConnectChange}
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
                            <Link to={`/add/preview/${this.state.dataset_type}`}>
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
        saveDatasetId,
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
        saveDatasetId,
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
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Link } from 'react-router-dom';
import { Select, Tooltip, TreeSelect, Alert } from 'antd';
import * as actionCreators from '../actions';
import { extractUrlType } from '../utils';
import { constructInceptorDataset, constructFileBrowserData, appendTreeChildren } from '../module';
import { appendTreeData, constructTreeData } from '../../../utils/common2';

const fileBrowserData = {"path": "/user/hive/employee", "descending": null, "sortby": null, "files": [{"path": "/user/hive", "mtime": "May 13, 2017 12:00 AM", "name": "..", "size": 0, "mode": 16832, "stats": {"path": "/user/hive/employee/..", "mtime": 1494663357.534, "atime": 0.0, "size": 0, "mode": 16832, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwx------", "url": "http://localhost:8086/view/user/hive", "type": "dir"}, {"path": "/user/hive/employee", "mtime": "May 27, 2017 12:00 AM", "name": ".", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee", "mtime": 1495874611.498, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee", "type": "dir"}, {"path": "/user/hive/employee/employee5.txt", "mtime": "May 26, 2017 12:00 AM", "name": "employee5.txt", "size": 27, "mode": 33188, "stats": {"path": "/user/hive/employee/employee5.txt", "mtime": 1495784089.918, "atime": 1495784089.356, "size": 27, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/employee5.txt", "type": "file"}, {"path": "/user/hive/employee/subdir", "mtime": "May 27, 2017 12:00 AM", "name": "subdir", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee/subdir", "mtime": 1495874578.136, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee/subdir", "type": "dir"}, {"path": "/user/hive/employee/test_upload2.txt", "mtime": "May 27, 2017 12:00 AM", "name": "test_upload2.txt", "size": 14, "mode": 33188, "stats": {"path": "/user/hive/employee/test_upload2.txt", "mtime": 1495874611.693, "atime": 1495874611.498, "size": 14, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/test_upload2.txt", "type": "file"}], "pagesize": 4, "page": {"number": 2, "end_index": 7, "next_page_number": 2, "previous_page_number": 1, "num_pages": 2, "total_count": 7, "start_index": 5}}
const fileBrowserData2 = {"path": "/user/hive/employee", "descending": null, "sortby": null, "files": [{"path": "/user/hive", "mtime": "May 13, 2017 12:00 AM", "name": "..", "size": 0, "mode": 16832, "stats": {"path": "/user/hive/employee/..", "mtime": 1494663357.534, "atime": 0.0, "size": 0, "mode": 16832, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwx------", "url": "http://localhost:8086/view/user/hive", "type": "dir"}, {"path": "/user/hive/employee", "mtime": "May 27, 2017 12:00 AM", "name": ".", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee", "mtime": 1495874611.498, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee", "type": "dir"}, {"path": "/user/hive/employee/employee5.txt", "mtime": "May 26, 2017 12:00 AM", "name": "employee55.txt", "size": 27, "mode": 33188, "stats": {"path": "/user/hive/employee/employee5.txt", "mtime": 1495784089.918, "atime": 1495784089.356, "size": 27, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/employee5.txt", "type": "file"}, {"path": "/user/hive/employee/subdir", "mtime": "May 27, 2017 12:00 AM", "name": "subdirr", "size": 0, "mode": 16877, "stats": {"path": "/user/hive/employee/subdir", "mtime": 1495874578.136, "atime": 0.0, "size": 0, "mode": 16877, "user": "hive", "group": "hive", "replication": 0, "blockSize": 0}, "rwx": "drwxr-xr-x", "url": "http://localhost:8086/view/user/hive/employee/subdir", "type": "dir"}, {"path": "/user/hive/employee/test_upload2.txt", "mtime": "May 27, 2017 12:00 AM", "name": "test_upload22.txt", "size": 14, "mode": 33188, "stats": {"path": "/user/hive/employee/test_upload2.txt", "mtime": 1495874611.693, "atime": 1495874611.498, "size": 14, "mode": 33188, "user": "hive", "group": "hive", "replication": 3, "blockSize": 134217728}, "rwx": "-rw-r--r--", "url": "http://localhost:8086/view/user/hive/employee/test_upload2.txt", "type": "file"}], "pagesize": 4, "page": {"number": 2, "end_index": 7, "next_page_number": 2, "previous_page_number": 1, "num_pages": 2, "total_count": 7, "start_index": 5}}

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
                sql: '',
                description: '',
                databases: [],
                treeData: []
            },
            dsHDFS: {
                hdfsConnections: [],
                inceptorConnections: [],
                hdfsConnect: '',
                inceptorConnect: '',
                fileBrowserData: []
            },
            dsUpload: {

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
    }

    handleDatasetChange(e) {
        if(this.state.dataset_type === 'INCEPTOR') {
            this.state.dsInceptor.dataset_name = e.currentTarget.value;
            this.setState({
                dsInceptor: this.state.dsInceptor
            });
        }else if(this.state.dataset_type === 'HDFS') {
            this.state.dsHDFS.dataset_name = e.currentTarget.value;
            this.setState({
                dsHDFS: this.state.dsHDFS
            });
        }else if(this.state.dataset_type === 'UPLOAD') {

        }
    }

    handleDescriptionChange(e) {
        if(this.state.dataset_type === 'INCEPTOR') {
            this.state.dsInceptor.description = e.currentTarget.value;
            this.setState({
                dsInceptor: this.state.dsInceptor
            });
        }else if(this.state.dataset_type === 'HDFS') {
            this.state.dsHDFS.description = e.currentTarget.value;
            this.setState({
                dsHDFS: this.state.dsHDFS
            });
        }else if(this.state.dataset_type === 'UPLOAD') {

        }
    }

    handleSQLChange(e) {
        this.state.dsInceptor.sql = e.currentTarget.value;
        this.setState({
            dsInceptor: this.state.dsInceptor
        });
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
        console.log('value-hdfs=', value);
        this.state.dsHDFS.hdfsConnect = value;
        this.setState({
            dsHDFS: this.state.dsHDFS
        });
    }

    onInceptorConnectChange(value) {
        console.log('value-inceptor=', value);
        this.state.dsHDFS.inceptorConnect = value;
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

    }

    onLoadDataHDFS(node) {
        const me = this;
        const folderName = node.props.value;
        const path = node.props.hdfs_path;
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

    onSave() {
        const me = this;
        const { createDataset, saveDatasetId } = this.props;
        const dsInceptor = constructInceptorDataset(me.state.dsInceptor);
        createDataset(dsInceptor, callback);
        function callback(success, data) {
            let response = {};
            if(success) {
                response.type = 'success';
                response.message = '创建成功';
                saveDatasetId(data.object_id);
            }else {
                response.type = 'error';
                response.message = data;
            }
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
    }

    componentDidMount() {
        const me = this;
        const { fetchDatabaseList, fetchHDFSConnectList, fetchInceptorConnectList, fetchHDFSFileBrowser } = me.props;
        if(this.state.dataset_type === 'INCEPTOR') {
            fetchDatabaseList(callback);
            function callback(success, data) {
                if(success) {
                    me.state.dsInceptor.databases = data;
                    me.setState({
                        dsInceptor: me.state.dsInceptor
                    });
                }else {

                }
            }
        }else if(this.state.dataset_type === 'HDFS') {
            fetchHDFSConnectList(hdfsCallback);
            fetchInceptorConnectList(inceptorCallback);
            //fetchHDFSFileBrowser(fileCallback);
            fileCallback(true, fileBrowserData);
            function hdfsCallback(success, data) {
                if(success) {
                    console.log('data-hdfs=', data);
                    me.state.dsHDFS.hdfsConnections = data;
                    me.setState({
                        dsHDFS: me.state.dsHDFS
                    });
                }
            }
            function inceptorCallback(success, data) {
                if(success) {
                    console.log('data-inceptor=', data);
                    me.state.dsHDFS.inceptorConnections = data;
                    me.setState({
                        dsHDFS: me.state.dsHDFS
                    });
                }
            }
            function fileCallback(success, fileBrowserData) {
                console.log('fileBrowserData=', fileBrowserData);
                if(success) {
                    me.state.dsHDFS.fileBrowserData = constructFileBrowserData(fileBrowserData);
                    me.setState({
                        dsHDFS: me.state.dsHDFS
                    });
                }
            }
        }else if(this.state.dataset_type === 'UPLOAD') {

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
        }else if(datasetType === 'HDFS') {
            hdfsOptions = me.state.dsHDFS.hdfsConnections.map(hdfs => {
                return <Option key={hdfs.id}>{hdfs.connection_name}</Option>
            });
            inceptorOptions = me.state.dsHDFS.inceptorConnections.map(inceptor => {
                return <Option key={inceptor.id}>{inceptor.database_name}</Option>
            });
        }else if(datasetType === 'UPLOAD') {

        }
        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    <div>
                        <label className="data-detail-item">
                            <span>数据集名称：</span>
                            <input type="text" onChange={this.handleDatasetChange} />
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                            <textarea onChange={this.handleDescriptionChange}/>
                        </label>
                    </div>

                    {/* inceptor corresponding dom*/}
                    <div className={datasetType==='INCEPTOR'?'':'none'}>
                        <label className="data-detail-item">
                            <span>选择连接：</span>
                            <Select
                                style={{ width: 230 }}
                                onChange={this.onConnectChange}
                            >
                                {dbOptions}
                            </Select>
                            <div className="connect-success">
                                &nbsp;<button>新建连接</button>
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
                                <textarea name="" id="" cols="30" rows="10" onChange={this.handleSQLChange}/>
                                <a href={ window.location.origin + '/pilot/sqllab' } target="_blank">
                                    切换至SQL LAB编辑
                                </a>
                            </label>
                        </div>
                        <label className="sub-btn">
                            <input type="button" defaultValue="保存" onClick={this.onSave}/>
                        </label>
                        <div id="showAlert" className="alert-tip"></div>
                    </div>

                    {/* HDFS corresponding dom*/}
                    <div className={datasetType==='HDFS'?'':'none'} >
                        <div className={HDFSConnected===false?'none':''}>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="data-connect-status">
                                    <span>尚未建立HDFS连接</span>
                                    <button>建立HDFS连接</button>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10"/>
                            </label>
                        </div>
                        <div className={HDFSConnected===true?'none':''}>
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
                                    multiple={true}
                                    treeCheckable={true}
                                    showCheckedStrategy={TreeSelect.SHOW_PARENT}
                                    treeData={this.state.dsHDFS.fileBrowserData}
                                    onSelect={this.onSelectHDFS}
                                    loadData={this.onLoadDataHDFS}
                                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                    >
                                </TreeSelect>
                            </label>
                        </div>
                        <label className="sub-btn">
                            <Link to={`/add/preview/${this.state.dataset_type}`}>
                                配置
                            </Link>
                        </label>
                    </div>

                    {/* upload file corresponding dom*/}
                    <div className={datasetType==='UPLOAD'?'':'none'} >
                        <label className="data-detail-item">
                            <span></span>

                        </label>
                        <label className="data-detail-item">
                            <span>路径：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <button className="uploading-btn">上传文件</button>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-uploading">
                                <i className="icon"/>
                                <span>package.json</span>
                                <div className="progress"></div>
                            </div>

                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-uploaded">
                                <i className="icon"/>
                                <span>package.json</span>
                                <div className="finish"></div>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="connect-success">
                                <span>连接成功</span>&nbsp;&nbsp;
                                <button>配置></button>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                            <textarea name="" id="" cols="30" rows="10"/>
                        </label>
                    </div>
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
        fetchHDFSFileBrowser
    } = bindActionCreators(actionCreators, dispatch);

    return {
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        saveDatasetId,
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser
    };
}
export default connect (mapStateToProps, mapDispatchToProps ) (SubDetail);
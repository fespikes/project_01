import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import { Select, Tooltip, TreeSelect, Alert, Popconfirm } from 'antd';
import { Confirm, CreateHDFSConnect, CreateInceptorConnect } from '../../popup';
import { constructFileBrowserData, appendTreeChildren, initDatasetData, extractOpeType, getDatasetId, extractDatasetType } from '../../module';
import { renderLoadingModal, renderAlertTip } from '../../../../utils/utils';

class HDFSUploadDetail extends Component {

    constructor (props) {
        super(props);
        this.state={
            dsHDFS: props.dsHDFS
        };
        //bindings
        this.onConfig = this.onConfig.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.createHDFSConnect = this.createHDFSConnect.bind(this);
        this.onHDFSConnectChange = this.onHDFSConnectChange.bind(this);
        this.onInceptorConnectChange = this.onInceptorConnectChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
        this.uploadFile = this.uploadFile.bind(this);
        this.handleFile = this.handleFile.bind(this);
    }

    handleChange(e) {
        const target = e.currentTarget;
        const name = target.name;
        const val = target.value;
        const objHDFS = {
            ...this.state.dsHDFS,
            [name]: val
        };
        this.setState({
            dsHDFS: objHDFS
        });
    }

    createHDFSConnect() {
        const { dispatch } = this.props;
        render(
            <CreateHDFSConnect
                dispatch={dispatch}
            />,
            document.getElementById('popup_root')
        );
    }

    onHDFSConnectChange(value, node) {
        let objHDFS = {...this.state.dsHDFS};
        objHDFS.hdfsConnectId = value;
        objHDFS.hdfsConnectName = node.props.children;
        this.setState({
            dsHDFS: objHDFS
        });
    }

    onInceptorConnectChange(value, node) {
        let objHDFS = {...this.state.dsHDFS};
        objHDFS.inceptorConnectId = value;
        objHDFS.inceptorConnectName = node.props.children;
        this.setState({
            dsHDFS: objHDFS
        });
    }

    onSelect(value, node) {
        let objHDFS = {
            ...this.state.dsHDFS,
            hdfsPath: node.props.hdfs_path
        };
        this.setState({
            dsHDFS: objHDFS
        });
    }

    onLoadData(node) {
        const me = this;
        const hdfsPath = node.props.hdfs_path;
        const { fetchHDFSFileBrowser } = me.props;
        return fetchHDFSFileBrowser(node.props.hdfs_path, callback);
        function callback(success, data) {
            if(success) {
                let treeData = appendTreeChildren(
                    hdfsPath,
                    data,
                    JSON.parse(JSON.stringify(me.state.dsHDFS.fileBrowserData))
                );
                let objHDFS = {
                    ...me.state.dsHDFS,
                    fileBrowserData: treeData
                };
                me.setState({
                    dsHDFS: objHDFS
                });
            }
        }
    }

    handleFile() {
        this.refs.fileName.innerText = this.refs.fileSelect.files[0].name;
        let objUpload = {
            ...this.state.dsHDFS,
            uploadFileName: this.refs.fileSelect.files[0].name
        };
        this.setState({
            dsHDFS: objUpload
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
            this.state.dsHDFS.uploadFileName,
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
                renderAlertTip(response, 'showAlert');
            }
        }
    }

    onConfig() {
        const { saveHDFSDataset } = this.props;
        saveHDFSDataset(this.state.dsHDFS);
    }

    componentDidMount() {
        const datasetType = extractDatasetType(window.location.hash);
        if(datasetType === "HDFS" || datasetType === "UPLOAD FILE") {
            this.doFetchInceptorList();
            this.doFetchHDFSList();
            this.doFetchHDFSFileData('/');
            if(window.location.hash.indexOf('/edit') > 0) {
                this.doDatasetEdit();
            }
        }
    }

    doFetchInceptorList() {
        const me = this;
        const { fetchInceptorConnectList } = me.props;
        fetchInceptorConnectList(inceptorCallback);
        function inceptorCallback(success, data) {
            if(success) {
                let objHDFS = {
                    ...me.state.dsHDFS,
                    inceptorConnections: data
                };
                me.setState({
                    dsHDFS: objHDFS
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
                let objHDFS = {
                    ...me.state.dsHDFS,
                    hdfsConnections: data
                };
                me.setState({
                    dsHDFS: objHDFS
                });
                if(data.length > 0) {
                    switchHDFSConnected(true);
                }else {
                    switchHDFSConnected(false);
                }
            }
        }
    }

    doFetchHDFSFileData(path) {
        const me = this;
        const { fetchHDFSFileBrowser } = me.props;
        fetchHDFSFileBrowser(path, fileCallback);
        function fileCallback(success, fileBrowserData) {
            console.log('success=', success);
            console.log('fileBrowserData=', fileBrowserData);
            if(success) {
                const browserData = constructFileBrowserData(fileBrowserData);
                console.log('browserData=', browserData);
                let objHDFS = {
                    ...me.state.dsHDFS,
                    fileBrowserData: browserData
                };
                me.setState({
                    dsHDFS: objHDFS
                });
            }
        }
    }

    doDatasetEdit() {
        const me = this;
        const {fetchDatasetDetail, fetchDBDetail, fetchHDFSDetail} = me.props;
        let datasetId = getDatasetId('edit', window.location.hash);
        fetchDatasetDetail(datasetId, callback);
        function callback(success, data) {
            if(success) {
                fetchDBDetail(data.database_id, dbCallback);
                fetchHDFSDetail(data.hdfs_connection_id, hdfsCallback);
                function dbCallback(success, dbData) {
                    if(success) {
                        let objHDFS = {
                            ...me.state.dsHDFS,
                            inceptorConnectName: dbData.database_name
                        };
                        me.setState({
                            dsHDFS: initDatasetData('HDFS', data, objHDFS)
                        });

                    }
                }
                function hdfsCallback(success, hdfsData) {
                    if(success) {
                        let objHDFS = {
                            ...me.state.dsHDFS,
                            hdfsConnectName: hdfsData.connection_name
                        };
                        me.setState({
                            dsHDFS: initDatasetData('HDFS', data, objHDFS)
                        });
                    }
                }
            }
        }
    }

    render () {
        const dsHDFS = this.state.dsHDFS;
        const {HDFSConnected, datasetType, datasetId} = this.props;
        const opeType = extractOpeType(window.location.hash);
        const Option = Select.Option;
        let hdfsOptions = [], inceptorOptions = [];
        if(this.state.dsHDFS.hdfsConnections) {
            hdfsOptions = this.state.dsHDFS.hdfsConnections.map(hdfs => {
                return <Option key={hdfs.id}>{hdfs.connection_name}</Option>
            });
        }
        if(this.state.dsHDFS.inceptorConnections) {
            inceptorOptions = this.state.dsHDFS.inceptorConnections.map(inceptor => {
                return <Option key={inceptor.id}>{inceptor.database_name}</Option>
            });
        }
        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    <div className="data-detail-item">
                        <span>数据集名称：</span>
                        <input type="text" name="dataset_name" value={dsHDFS.dataset_name || ''}
                               onChange={this.handleChange}/>
                    </div>
                    <div className="data-detail-item">
                        <span>描述：</span>
                        <textarea name="description" value={dsHDFS.description} defaultValue=""
                              onChange={this.handleChange}/>
                    </div>
                    <div className={datasetType==='UPLOAD FILE'?'data-detail-item':'none'}>
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
                    </div>
                    <div className={HDFSConnected===false?'':'none'}>
                        <div className="data-detail-item">
                            <span></span>
                            <div className="data-connect-status">
                                <span>尚未建立HDFS连接</span>
                                <button onClick={this.createHDFSConnect}>建立HDFS连接</button>
                            </div>
                        </div>
                        <div className="data-detail-item">
                            <span>描述：</span>
                            <textarea name="" id="" cols="30" rows="10"/>
                        </div>
                    </div>
                    <div className={HDFSConnected===true?'':'none'}>
                        <div className="data-detail-item">
                            <span>选择连接：</span>
                            <Select
                                style={{ width: 300 }}
                                value={dsHDFS.hdfsConnectName}
                                onSelect={this.onHDFSConnectChange}
                            >
                                {hdfsOptions}
                            </Select>
                        </div>
                        <div className="data-detail-item">
                            <span>关联inceptor连接：</span>
                            <Select
                                style={{ width: 300 }}
                                value={dsHDFS.inceptorConnectName}
                                onSelect={this.onInceptorConnectChange}
                            >
                                {inceptorOptions}
                            </Select>
                        </div>
                    </div>
                    <div className="data-detail-item">
                        <span>选择数据目录：</span>
                        <div className="dataset-detail" id="dataset-detail-tree-select">
                            <TreeSelect
                                showSearch
                                style={{ width: 300 }}
                                placeholder="please select"
                                treeCheckable={false}
                                treeData={dsHDFS.fileBrowserData}
                                onSelect={this.onSelect}
                                loadData={this.onLoadData}
                                getPopupContainer={() => document.getElementById('dataset-detail-tree-select')}
                                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                            >
                            </TreeSelect>
                        </div>
                    </div>
                    <div className="sub-btn">
                        <input type="button" defaultValue="上传文件" onClick={this.uploadFile}/>
                        <Link to={`/${opeType}/preview/${datasetType}/${datasetId}`} onClick={this.onConfig}>
                            配置
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
}

export default HDFSUploadDetail;
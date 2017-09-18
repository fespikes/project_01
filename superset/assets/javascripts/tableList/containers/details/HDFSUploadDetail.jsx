import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import { Select, Tooltip, TreeSelect, Alert, message } from 'antd';
import { Confirm, CreateHDFSConnect, CreateInceptorConnect } from '../../popup';
import { datasetTypes } from '../../actions';
import { constructFileBrowserData, appendTreeChildren, initDatasetData, extractOpeType, getDatasetId, extractDatasetType } from '../../module';
import { renderLoadingModal, renderAlertTip } from '../../../../utils/utils';

class HDFSUploadDetail extends Component {

    constructor (props) {
        super(props);
        this.state={
            dsHDFS: props.dsHDFS,
            disabledConfig: 'disabled',
            disabledUpload: 'disabled'
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
            hdfsPath: node.props.value
        };
        let disabled = 'disabled';
        if(objHDFS.uploadFileName && objHDFS.uploadFileName.length > 0) {
            disabled = null;
        }
        this.setState({
            dsHDFS: objHDFS,
            disabledUpload: disabled
        });
    }

    onLoadData(node) {
        const me = this;
        const hdfsPath = node.props.value;
        const { fetchHDFSFileBrowser } = me.props;
        return fetchHDFSFileBrowser(hdfsPath, callback);
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
            }else {
                message.error(data, 5);
            }
        }
    }

    handleFile() {
        const me = this;
        let reader = new FileReader();
        reader.readAsBinaryString(this.refs.fileSelect.files[0]);
        reader.onload = function(e) {
            let objUpload = {
                ...me.state.dsHDFS,
                uploadFileName: me.refs.fileSelect.files[0].name,
                binaryFile: e.target.result
            };
            let disabled = 'disabled';
            if(me.state.dsHDFS.hdfsPath && me.state.dsHDFS.hdfsPath.length > 0) {
                disabled = null;
            }
            me.setState({
                dsHDFS: objUpload,
                disabledUpload: disabled
            });
        }
    }

    uploadFile() {//only upload one file
        const me = this;
        if(this.state.dsHDFS.uploadFileName === '') {
            render(
                <Confirm />,
                document.getElementById('popup_root')
            );
            return;
        }
        const { fetchUploadFile } = this.props;
        fetchUploadFile(
            this.state.dsHDFS.binaryFile,
            this.state.dsHDFS.uploadFileName,
            this.state.dsHDFS.hdfsPath,
            callback
        );
        function callback(success) {
            let response = {};
            let fileUploaded = false;
            if(success) {
                response.type = 'success';
                fileUploaded = true;
                response.message = '上传成功';
            }else {
                response.type = 'error';
                fileUploaded = false;
                response.message = '上传失败';
            }
            me.setState({
                fileUploaded: fileUploaded
            });
            renderAlertTip(response, 'showAlertDetail', 400);
        }
    }

    onConfig() {
        const { saveHDFSDataset, datasetType, datasetId, history } = this.props;
        const opeType = extractOpeType(window.location.hash);
        saveHDFSDataset(this.state.dsHDFS);
        const url = '/' + opeType + '/preview/' + datasetType + '/' + datasetId;
        history.push(url);
    }

    checkIfSubmit() {
        const datasetType = extractDatasetType(window.location.hash);
        var fields = $(".hdfs-detail input[required]");
        let disabled = null;

        fields.each((idx, obj) => {
            if (obj.value === '') {
                disabled = 'disabled';
                return;
            }
        });

        if(datasetType === datasetTypes.uploadFile && !this.state.fileUploaded) {
           disabled = 'disabled';
        }
        if(disabled === this.state.disabledConfig) {
            return;
        }
        this.setState({
            disabledConfig: disabled
        });
    }

    componentDidUpdate() {
        this.checkIfSubmit();
    }

    componentDidMount() {
        const datasetType = extractDatasetType(window.location.hash);
        if(datasetType === datasetTypes.hdfs || datasetType === datasetTypes.uploadFile) {
            this.doFetchInceptorList();
            this.doFetchHDFSList();
            this.doFetchHDFSFileData('/');
            if(window.location.hash.indexOf('/edit') > 0) {
                this.doDatasetEdit();
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.dsHDFS.dataset_name &&
            nextProps.dsHDFS.dataset_name !== this.props.dsHDFS.dataset_name) {
            this.setState({
                dsHDFS: nextProps.dsHDFS
            });
        }
    };

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
            if(success) {
                const browserData = constructFileBrowserData(fileBrowserData);
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
                            inceptorConnectName: dbData.database_name,
                            inceptorConnectId: dbData.id
                        };
                        me.setState({
                            dsHDFS: initDatasetData(datasetTypes.hdfs, data, objHDFS)
                        });
                    }
                }
                function hdfsCallback(success, hdfsData) {
                    if(success) {
                        let objHDFS = {
                            ...me.state.dsHDFS,
                            hdfsConnectName: hdfsData.connection_name,
                            hdfsConnectId: hdfsData.id
                        };
                        me.setState({
                            dsHDFS: initDatasetData(datasetTypes.hdfs, data, objHDFS)
                        });
                    }
                }
            }
        }
    }

    render () {
        const dsHDFS = this.state.dsHDFS;
        const {HDFSConnected, datasetType} = this.props;
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
            <div className="data-detail-centent hdfs-detail">
                <div className="data-detail-item">
                    <div>
                        <i>*</i>
                        <span>数据集名称：</span>
                    </div>
                    <input
                        type="text"
                        name="dataset_name"
                        className="tp-input"
                        value={dsHDFS.dataset_name}
                        required="required"
                        onChange={this.handleChange}
                    />
                </div>
                <div className="data-detail-item">
                    <span>描述：</span>
                    <textarea
                        name="description"
                        value={dsHDFS.description || ''}
                        className="tp-textarea"
                        required="required"
                        onChange={this.handleChange}
                    />
                </div>
                <div className={datasetType===datasetTypes.uploadFile?'data-detail-item':'none'}>
                    <div>
                        <i>*</i>
                    </div>
                    <div>
                        <label className="file-browser" htmlFor="xFile" style={{width: 200}}>
                            <span>选择文件</span>
                        </label>
                        <div className="file-name">
                            <i className="icon icon-file"/>
                            <span ref="fileName">{dsHDFS.uploadFileName}</span>
                        </div>
                        <div className="file-upload" style={{display: 'none'}}>
                            <input
                                type="file"
                                id="xFile"
                                className="file-select"
                                onChange={this.handleFile}
                                ref="fileSelect"
                            />
                        </div>
                    </div>
                </div>
                <div className={HDFSConnected===false?'':'none'}>
                    <div className="data-detail-item">
                        <span></span>
                        <div className="data-connect-status">
                            <span>尚未建立HDFS连接</span>
                            <Tooltip placement="top" title="需要到连接页面创建HDFS连接">
                                <button>建立HDFS连接</button>
                            </Tooltip>
                            {/*<button onClick={this.createHDFSConnect}>建立HDFS连接</button>*/}
                        </div>
                    </div>
                    <div className="data-detail-item">
                        <span>描述：</span>
                        <textarea className="tp-textarea" cols="30" rows="10"/>
                    </div>
                </div>
                <div className={HDFSConnected===true?'':'none'}>
                    <div className="data-detail-item">
                        <div>
                            <i>*</i>
                            <span>HDFS连接：</span>
                        </div>
                        <Select
                            style={{ width: 300 }}
                            value={dsHDFS.hdfsConnectName}
                            onSelect={this.onHDFSConnectChange}
                        >
                            {hdfsOptions}
                        </Select>
                        <input
                            type="hidden"
                            required="required"
                            value={dsHDFS.hdfsConnectName}
                        />
                    </div>
                </div>
                <div className="data-detail-item">
                    <div>
                        <i>*</i>
                        <span>数据目录：</span>
                    </div>
                    <div className="dataset-detail" id="dataset-detail-tree-select">
                        <TreeSelect
                            showSearch
                            value={dsHDFS.hdfsPath}
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
                        <input type="hidden" required="required" value={dsHDFS.hdfsPath}/>
                    </div>
                    <Tooltip title="选择创建外表的文件目录">
                        <i
                            className="icon icon-info"
                            style={{right: '-5px', position: 'relative'}}
                        />
                    </Tooltip>
                </div>
                <div className="data-detail-item">
                    <div>
                        <i>*</i>
                        <span>关联inceptor连接：</span>
                    </div>
                    <Select
                        style={{ width: 300 }}
                        value={dsHDFS.inceptorConnectName}
                        onSelect={this.onInceptorConnectChange}
                    >
                        {inceptorOptions}
                    </Select>
                    <Tooltip title="会在该连接下创建HDFS文件的外表">
                        <i
                            className="icon icon-info"
                            style={{right: '-5px', position: 'relative'}}
                        />
                    </Tooltip>
                    <input
                        type="hidden"
                        required="required"
                        value={dsHDFS.inceptorConnectName}
                    />
                </div>
                <div className="sub-btn">
                    <button
                        className={datasetType===datasetTypes.uploadFile?'':'none'}
                        onClick={this.uploadFile}
                        style={{marginRight: 20}}
                        disabled={this.state.disabledUpload}
                    >
                        上传文件
                    </button>
                    <button onClick={this.onConfig}
                            disabled={this.state.disabledConfig}>
                        配置
                    </button>
                </div>
            </div>
        );
    }
}

export default HDFSUploadDetail;
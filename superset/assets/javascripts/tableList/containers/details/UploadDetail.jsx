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
import { appendTreeData, constructTreeData } from '../../../../utils/common2';
import { renderLoadingModal, renderAlertTip } from '../../../../utils/utils';

class UploadDetail extends Component {

    constructor (props) {
        super(props);
        this.state={
            dsUpload: props.dsUpload
        };
        //bindings
        this.onConfig = this.onConfig.bind(this);
        this.uploadFile = this.uploadFile.bind(this);
        this.handleFile = this.handleFile.bind(this);
    }

    handleFile() {
        this.refs.fileName.innerText = this.refs.fileSelect.files[0].name;
        let objUpload = {
            ...this.state.dsUpload,
            uploadFileName: this.refs.fileSelect.files[0].name
        };
        this.setState({
            dsUpload: objUpload
        });
    }

    uploadFile() {//only upload one file
        if(this.state.dsUpload.uploadFileName === '') {
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
                renderAlertTip(response, 'showAlert');
            }
        }
    }

    onConfig() {

    }

    componentDidMount() {

    }

    render () {

        return (
            <div>
                <div className="data-detail-item">
                    <span>数据集名称：</span>
                    <input type="text" />
                </div>
                <div className="data-detail-item">
                    <span>描述：</span>
                    <textarea defaultValue=""/>
                </div>
                <div className="data-detail-item">
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
                <div className="data-detail-item">
                    <span>选择连接：</span>
                    <Select
                        style={{ width: 300 }}
                    >

                    </Select>
                </div>
                <div className="data-detail-item">
                    <span>关联inceptor连接：</span>
                    <Select
                        style={{ width: 300 }}
                    >
                    </Select>
                </div>
                <div className="data-detail-item">
                    <span>选择数据目录：</span>
                    <TreeSelect
                        showSearch
                        style={{ width: 300 }}
                        placeholder="please select"
                        treeCheckable={false}
                        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                    >
                    </TreeSelect>
                </div>
                <div className="sub-btn">
                    <input type="button" defaultValue="上传文件" onClick={this.uploadFile}/>
                    <Link to='' onClick={this.onConfig}>
                        配置
                    </Link>
                </div>
            </div>
        );
    }
}

export default UploadDetail;
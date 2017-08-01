import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert, Table } from 'antd';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux';

import { Select, TreeSelect } from './';
import * as ActionCreators from '../actions'
import { CONSTANT } from '../actions'
import { getPermColumns, updatePermData, updatePermMode } from '../module'

import PropTypes from 'prop-types';
import './popup.scss';
const $ = window.$ = require('jquery');

class Popup extends React.Component {
    constructor(props, context) {
        super(props);

        this.closeDialog = this.closeDialog.bind(this);
        this.submit = this.submit.bind(this);
        this.checkIfSubmit = this.checkIfSubmit.bind(this);
        this.onInputChange = this.onInputChange.bind(this);
        this.handleFile = this.handleFile.bind(this);
        this.onPermChange = this.onPermChange.bind(this);

        //popupType = ['mkdir', 'upload'][0];
        this.state = {}
    }

    componentDidUpdate() {
        this.checkIfSubmit();

    }

    closeDialog() {
        const popupNormalParam = this.props;
        this.props.setPopupNormalParams({
            ...popupNormalParam,
            status: 'none',
            alertStatus: 'none',
            alertMsg: '',
            alertType: ''
        });
    }

    timer = 0;

    checkIfSubmit() {
        var fields = $(".popup-body input[required]");
        let disabled = null;
        fields.each((idx, obj) => {
            if (obj.value === '') {
                disabled = 'disabled';
                return;
            }
        });

        if (disabled === this.props.popupNormalParam.disabled) {
            return;
        }
        this.props.setPopupNormalParam({
            disabled: disabled
        });
    }

    onInputChange(e, eventType) {
        const target = e.currentTarget;
        const key = target.name;
        let val = '';
        if (eventType === "selectFile") {
            const pathArray = target.value.split('\\');
            val = pathArray[pathArray.length - 1];
        } else {
            val = target.value;
        }
        const setPopupNormalParam = this.props.setPopupNormalParam;
        setPopupNormalParam({
            [key]: val
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.checkIfSubmit();
        }, 800);
    }

    handleFile(e) {
        this.refs.fileName.innerText = this.refs.fileSelect.files[0].name;
        this.onInputChange(e, 'selectFile');

        const me = this;
        let reader = new FileReader();
        reader.readAsBinaryString(this.refs.fileSelect.files[0]);
        reader.onload = function(event) {
            event.currentTarget.name = 'binaryFile';
            event.currentTarget.value = event.target.result;
            me.onInputChange(event);
        }
    }

    onPermChange(record, type) {
        const {setPermData, setPermMode, popupNormalParam} = this.props;
        const permData = updatePermData(record, type, popupNormalParam.permData);
        const permMode = updatePermMode(permData);
        setPermData(permData);
        setPermMode(permMode);
    }

    submit() {
        const me = this;
        function callback(success, popupType, response) {
            switch (popupType) {
            case CONSTANT.mkdir:
            case CONSTANT.move:
            case CONSTANT.copy:
            case CONSTANT.auth:
            case CONSTANT.upload:
            case CONSTANT.remove:
                break;
            case CONSTANT.noSelect:
                me.props.popupNormalChangeStatus('none');
                break;
            default:
                break;
            }
        }
        this.props.popupNormalParam.submit(callback);
    }

    render() {
        const me = this;

        //'inceptor', //uploadFile HDFS inceptor
        const {closeDialog, condition, popupNormalParam, //
            setPopupNormalParams, popupNormalChangeStatus, //
            fetchLeafData} = this.props;

        const {popupType, disabled, dest_path, treeData,//
            status, alertStatus, alertMsg,//
            alertType, permData, deleteTips} = popupNormalParam;

        const setPopupState = (obj) => {
            me.closeDialog();
        };

        let btnTitle = "提交";
        if (popupType === CONSTANT.noSelect) {
            btnTitle = "确定";
        }

        let permColumns = [];

        //TODO:popupType from props
        const getConfig = (popupType) => {
            let title = '';
            switch (popupType) {
            case CONSTANT.move:
                title = '移至';
                break;
            case CONSTANT.copy:
                title = '复制到';
                break;
            case CONSTANT.auth:
                title = '修改权限';
                permColumns = getPermColumns(me);
                break;
            case CONSTANT.upload:
                title = '上传文件';
                break;
            case CONSTANT.mkdir:
                title = '创建目录';
                break;
            case CONSTANT.remove:
                title = '删除HDFS连接';
                break;
            case CONSTANT.noSelect:
                title = '提示';
            }
            return {
                title
            };
        }

        const config = getConfig(popupType);

        const getChildren = (popupType) => {
            switch (popupType) {
            case CONSTANT.move:
                return <div
                    className="popup-body move"
                    style={{
                        height: '200px'
                    }}
                    >
                    <div className="add-connection">
                        <div className='data-detail-border'>
                            <div id="tree-select-box"></div>
                            <label className="data-detail-item">
                                <span>移动至：</span>
                                <div
                    style={{
                        width: '420px'
                    }}
                    className="tree-here">
                                    <TreeSelect
                    treeData={treeData}
                    fetchLeafData={fetchLeafData}
                    setPopupNormalParams={setPopupNormalParams}
                    checkIfSubmit={this.checkIfSubmit}

                    popupNormalParam={popupNormalParam}
                    condition={condition} />
                                </div>
                            </label>
                            <label className="data-detail-item">
                                    <span></span>
                                    <input
                    type="text"
                    disabled="disabled"
                    required="required"
                    value={dest_path}
                    onChange={this.onInputChange}
                    />
                                </label>
                        </div>
                    </div>
                </div>
                break;
            case CONSTANT.copy:
                return <div
                    className="popup-body move"
                    style={{
                        height: '200px'
                    }}
                    >
                    <div className="add-connection">
                        <div className='data-detail-border'>
                            <div id="tree-select-box"></div>
                            <label className="data-detail-item">
                                <span> </span>
                                <div
                    style={{
                        width: '420px'
                    }}
                    className="tree-here">
                                    <TreeSelect
                    treeData={treeData}
                    fetchLeafData={fetchLeafData}
                    setPopupNormalParams={setPopupNormalParams}

                    popupNormalParam={popupNormalParam}
                    condition={condition} />
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                break;
            case CONSTANT.auth:
                return <div className="popup-body">
                            <div className="add-connection">
                                <div className='data-detail-border'>
                                    <Table
                    columns={permColumns}
                    dataSource={permData}
                    size='small'
                    pagination={false}
                    />
                                </div>
                            </div>
                        </div>
                break;
            case CONSTANT.upload:
                return <div className="popup-body">
                            <div className="add-connection">
                            <div className={popupType === CONSTANT.upload ? 'data-detail-border' : 'none'} >
                                <label className="data-detail-item">
                                    <span>上传到：</span>
                                    <input
                    type="text"
                    defaultValue=""
                    value={condition.selectedRows[0].path}
                    required="required"
                    onChange={this.onInputChange}
                    />
                                </label>
                                <div className="data-detail-item">
                                    <span></span>
                                    <div>
                                        <label className="file-browser" htmlFor="xFile" style={{
                        width: 200
                    }}>
                                            <span>选择文件</span>
                                        </label>
                                        <div className="file-name">
                                            <i className="icon icon-file"/>
                                            <span ref="fileName"/>
                                        </div>
                                        <div className="file-upload" style={{
                        display: 'none'
                    }}>
                                            <input type="file" id="xFile" name="file_name" className="file-select"
                    required="required" onChange={this.handleFile} ref="fileSelect"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>;
                break;
            case CONSTANT.mkdir:
                return <div className="popup-body">
                            <div className="add-connection">
                            <div className='data-detail-border'>
                                <label className="data-detail-item">
                                    <span>目录名称：</span>
                                    <input
                    required="required"
                    type="text"
                    defaultValue=""
                    name="path"
                    onChange={this.onInputChange}
                    />
                                </label>
                                <label className="data-detail-item">
                                    <span>文件名称：</span>
                                    <input
                    required="required"
                    type="text"
                    defaultValue=""
                    name="dir_name"
                    onChange={this.onInputChange}
                    />
                                </label>
                </div></div></div>;
                break;

            case CONSTANT.remove:
                return <div className="popup-body">
                    <div className="warning">
                                <Alert
                    message="Warning"
                    description={deleteTips}
                    type="warning"
                    showIcon
                    />
                    </div>
                </div>;

            case CONSTANT.noSelect:
                return <div className="popup-body">
                    <div className="warning">
                        <Alert
                    message="Warning"
                    description="没有选择HDFS路径，请先选择！"
                    type="warning"
                    showIcon
                    />
                    </div>
                </div>;
            default:
                return '';
                break;
            }
        }

        return (
            <div className="popup" ref="popupContainer" style={{
                display: status
            }}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className={'icon '}/>
                                <span>{config.title}</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}/>
                            </div>
                        </div>
                        
                        {getChildren(popupType)}

                        <div className="popup-footer">
                            <button
            disabled={disabled}
            className="tp-btn tp-btn-middle tp-btn-primary j_submit"
            onClick={me.submit}>
                                {btnTitle}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = function(state, props) {
    const {popupNormalParam, emitFetch, condition} = state;
    return {
        popupNormalParam,
        condition
    }
}

/*const mapDispatchToProps = function(dispatch, props) {
    return bindActionCreators({
        setPopupNormalParams,
        setPopupNormalParam,
        popupNormalChangeStatus,
        fetchLeafData
    }, dispatch);
}*/

Popup.propTypes = {};
Popup.defaultProps = {};

export default connect(mapStateToProps, ActionCreators)(Popup);
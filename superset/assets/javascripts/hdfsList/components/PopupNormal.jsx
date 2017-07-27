import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux';

import { Select, TreeSelect } from './';
// import { setPopupNormalParams, setPopupNormalParam, popupNormalChangeStatus, CONSTANT } from '../actions'
import * as actions from '../actions'
import { CONSTANT } from '../actions'

import PropTypes from 'prop-types';
import './popup.scss';

class Popup extends React.Component {
    constructor(props, context) {
        super(props);

        this.closeDialog = this.closeDialog.bind(this);
        this.submit = this.submit.bind(this);

        //popupType = ['mkdir', 'upload'][0];
        this.state = {}
    }

    componentDidMount() {}

    closeDialog() {
        this.props.popupNormalChangeStatus('none');
    }

    onInputChange(e) {
        const target = e.currentTarget;
        const key = target.name;
        const val = target.value;
        const setPopupNormalParam = this.props.setPopupNormalParam;
        setPopupNormalParam({
            [key]: val
        });
    }

    /*    setParams() {
            const popupType = this.state.popupType;
            const setPopupNormalParams = this.props.setPopupNormalParams;

            //params of mkdir
            let mkdirPath = this.refs.mkdirPath.value;
            let dirName = this.refs.dirName.value;

            //params of upload file
            let uploadPath = this.refs.uploadPath.value;
            let hdfsFile = this.refs.hdfsFile.value;

            if (popupType === CONSTANT.move) {

            } else if (popupType === CONSTANT.mkdir) {
                setPopupNormalParams({
                    path: mkdirPath,
                    dirName,
                    popupType
                });
            } else if (popupType === CONSTANT.upload) {
                setPopupNormalParams({
                    path: uploadPath,
                    hdfsFile,
                    popupType
                });
            }
        }*/

    submit() {
        console.log('submit this popup');
        // this.setParams();
        this.props.submit();
    }

    render() {
        const me = this;

        //'inceptor', //uploadFile HDFS inceptor
        const {closeDialog, condition, status, popupType, setPopupNormalParams, popupNormalChangeStatus, fetchLeafData, response} = this.props;

        const setPopupState = (obj) => {
            me.closeDialog();
        }

        //TODO:popupType from props
        const getConfig = (popupType) => {
            let title = '';
            switch (popupType) {
            case CONSTANT.move:
                title = '移至';
                break;
            case CONSTANT.copy:
                title = '拷贝';
                break;
            case CONSTANT.auth:
                title = '修改权限';
                break;
            case CONSTANT.mkdir:
                title = '创建目录';
                break;
            case CONSTANT.upload:
                title = '上传文件';
                break;
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
                    className="popup-body"
                    style={{
                        height: '200px'
                    }}
                    >
                    <div className="add-connection">
                        <div className='data-detail-border'>
                            <label className="data-detail-item">
                                <span>移动至：</span>
                                <div
                                    style={{width:'420px'}}
                                    className="tree-here">
                                    <TreeSelect
                                        response={response}
                                        fetchLeafData={fetchLeafData}
                                        condition={condition} />
                                </div>
                            </label>
{/*                            <label className="data-detail-item">
                                <span>目录path：</span>
                                <input
                        type="text"
                        defaultValue=""
                        required="required"
                        name="dir_name"
                        onChange={(e) => this.onInputChange(e)}
                        />
                            </label>*/}
                        </div>
                    </div>
                </div>
                break;
            case CONSTANT.copy:
                return <div className="popup-body">
                            <div className="add-connection">
                            <div className='data-detail-border'>
                    <label className="data-detail-item">
                        <span>from路径：</span>
                        <input
                    type="text"
                    defaultValue=""
                    disabled
                    ref="path"
                    onChange={argu => argu}
                    />
                    </label>
                    <label className="data-detail-item">
                        <span>目录path：</span>
                        <input
                    type="text"
                    defaultValue=""
                    required="required"
                    name="dir_name"
                    onChange={(e) => this.onInputChange(e)}
                    />
                    </label>
                </div>
                </div>
                        </div>
                break;
            case CONSTANT.auth:
                return <div className="popup-body">
                            <div className="add-connection"><div className='data-detail-border'>
                    <label className="data-detail-item">
                        <span>from路径：</span>
                        <input
                    type="text"
                    defaultValue=""
                    disabled
                    ref="path"
                    onChange={argu => argu}
                    />
                    </label>
                    <label className="data-detail-item">
                        <span>目录path：</span>
                        <input
                    type="text"
                    defaultValue=""
                    required="required"
                    name="dir_name"
                    onChange={(e) => this.onInputChange(e)}
                    />
                    </label>
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
                    required="required"
                    ref="uploadPath"
                    />
                    </label>
                    <label className="data-detail-item">
                        <span>$nbsp;$nbsp;</span>
                        <input
                    type="file"
                    defaultValue="浏览文件"
                    ref="hdfsFile"
                    />
                    </label>
                </div>
                </div>                </div>;
                break;
            case CONSTANT.mkdir:
                return <div className="popup-body">
                            <div className="add-connection">
                            <div className='data-detail-border'>
                    <label className="data-detail-item">
                        <span>路径名：</span>
                        <input
                    type="text"
                    defaultValue=""
                    required="required"
                    ref="mkdirPath"
                    />
                    </label>
                    <label className="data-detail-item">
                        <span>目录名：</span>
                        <input
                    type="text"
                    defaultValue=""
                    required="required"
                    name="dir_name"
                    ref="dirName"
                    />
                    </label>
                </div></div></div>;
                break;
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
                                <i className={'icon '}></i>
                                <span>{config.title}</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        
                        {getChildren(popupType)}

                        <div className="popup-footer">
                            <button
            className="tp-btn tp-btn-middle tp-btn-primary"
            onClick={this.submit}>
                                提交
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = function(state, props) {
    const {popupNormalParam, emitFetch, condition}=state;
    return {
        ...popupNormalParam,
        response: emitFetch.response,
        condition
    }
}

/*const mapDispatchToProps = function(dispatch, props) {
    return bindActionCreators({
        setPopupNormalParams,
        setPopupNormalParam,
        popupNormalChangeStatus,
    }, dispatch);
}*/

Popup.propTypes = {};
Popup.defaultProps = {};

export default connect(mapStateToProps, actions)(Popup);
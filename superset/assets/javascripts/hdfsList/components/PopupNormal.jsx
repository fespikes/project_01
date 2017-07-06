import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux';

import {Select} from './';
import {
    setPopupNormalParam,
    popupNormalChangeStatus,

    CONSTANT
} from '../actions'

import PropTypes from 'prop-types';
import './popup.scss';

class Popup extends React.Component {
    constructor (props, context) {
        super(props);

        this.dispatch = context.dispatch;

        this.closeDialog = this.closeDialog.bind(this);
        this.submit = this.submit.bind(this);

//popupType = ['mkdir', 'upload'][0];
        this.state = {
            connectionID: context.connectionID
        }
    }

    componentDidMount () {
    }

    closeDialog () {
        this.props.popupNormalChangeStatus('none');
    }

    setParams () {
        const popupType = this.state.popupType;
        const setPopupNormalParam = this.props.setPopupNormalParam;
        const connectionID = this.context.connectionID;

        let uploadPath = this.refs.uploadPath.value;
        let mkdirPath = this.refs.mkdirPath.value;
        let dirName = this.refs.dirName.value;
        let hdfsFile = this.refs.hdfsFile.value;

        if (popupType==='mkdir') {
            setPopupNormalParam({path:mkdirPath, dirName, connectionID, popupType});
        } else if (popupType==='upload') {
            setPopupNormalParam({path:uploadPath, hdfsFile, connectionID, popupType});
        }
    }

    submit () {
        console.log('submit this popup');
        this.setParams();
        this.props.submit();
    }

    render () {
        const me = this;

        const {
            closeDialog,          //'inceptor', //uploadFile HDFS inceptor
            status,

            popupType,

            setPopupNormalParam,
            popupNormalChangeStatus
        } = this.props;

        const setPopupState = (obj) => {
            me.closeDialog();
        }

        //TODO:popupType from props
        const getConfig = (popupType) => {
            let title = '';
            switch (popupType) {
                case CONSTANT.mkdir:
                    title = '创建目录';
                    break;
                case CONSTANT.upload:
                    title = '上传文件';
                    break;
            }
            return {title};
        }

        const config = getConfig(this.props.popupType);

        return (
            <div className="popup" ref="popupContainer" style={{display:status}}>
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
                        <div className="popup-body">
                            <div className="add-connection">
                                <div
                                    className={popupType===CONSTANT.mkdir?'data-detail-border':'none'}
                                >
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
                                </div>
                                <div className={popupType===CONSTANT.upload?'data-detail-border':'none'} >
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
                            </div>
                        </div>

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

const mapStateToProps = function (state, props) {
    return {
        ...state.popupNormalParam
    }
}

const mapDispatchToProps = function (dispatch, props) {
    return bindActionCreators({
        setPopupNormalParam,
        popupNormalChangeStatus
    }, dispatch);
}

Popup.propTypes = {};
Popup.defaultProps = {};
Popup.contextTypes = {
    connectionID: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired
};
export default connect(mapStateToProps, mapDispatchToProps)(Popup);
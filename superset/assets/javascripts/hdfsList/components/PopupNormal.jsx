import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux';

import { Select, TreeSelect } from './';
// import { setPopupNormalParams, setPopupNormalParam, popupNormalChangeStatus, CONSTANT } from '../actions'
import * as ActionCreators from '../actions'
import { CONSTANT } from '../actions'

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

        //popupType = ['mkdir', 'upload'][0];
        this.state = {}
    }

    componentDidMount() {}

    closeDialog() {
        this.props.popupNormalChangeStatus('none');
    }

    timer = 0

    checkIfSubmit() {
        var fields = $(".popup-body input[required]");
        var bool = false;
        fields.each((idx, obj) => {
            if (obj.value === '') {
                bool = true;
                return;
            }
        });

        if (bool) {
            this.refs.submit.disabled = 'disabled';
        } else {
            this.refs.submit.disabled = null;
        }
    }

    onInputChange(e) {
        const target = e.currentTarget;
        const key = target.name;
        const val = target.value;
        const setPopupNormalParam = this.props.setPopupNormalParam;
        setPopupNormalParam({
            [key]: val
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.checkIfSubmit();
        }, 800);
    }
    
    submit() {
        this.props.popupNormalParam.submit();
    }

    render() {
        const me = this;

        //'inceptor', //uploadFile HDFS inceptor
        const {closeDialog, condition, popupNormalParam, //
            setPopupNormalParams, popupNormalChangeStatus, //
            fetchLeafData} = this.props;

        const {popupType, dest_path, treeData, status} = popupNormalParam;

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
                title = '复制到';
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
                                    <input
                                    type="text"
                                    required="required"
                                    value={dest_path}
                                    onChange={this.onInputChange}
                                    style={{display:'none'}}
                                    />
                                </div>
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
                        </div>
                    </div>
                </div>
                break;
            case CONSTANT.upload:
                return <div className="popup-body">
                            <div className="add-connection">
                            <div className={popupType === CONSTANT.upload ? 'data-detail-border' : 'none'} >
                                <label className="data-detail-item">
                                    <span>上传ddd到：</span>
                                    <input
                    type="text"
                    defaultValue=""
                    required="required"
                    onChange={this.onInputChange}
                    />
                                </label>
                                <label className="data-detail-item">
                                    <span>$nbsp;$nbsp;</span>
                                    <input
                    type="file"
                    required="required"
                    defaultValue="浏览文件"
                    onChange={this.onInputChange}
                    />
                                </label>
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
                            disabled='disabled'
                            ref="submit"
            className="tp-btn tp-btn-middle tp-btn-primary j_submit"
            onClick={me.submit}>
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
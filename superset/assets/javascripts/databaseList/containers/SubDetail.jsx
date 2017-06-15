import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';

import * as actionCreators from '../actions';

class SubDetail extends Component {

    static staticProps = {
    }

    constructor (props) {
        super(props);
    }

    switchDatasetType (datasetType) {
        this.props.dispatch(switchDatasetType(datasetType));
    }

    render () {
        const me = this;

        const {
            datasetType,
            operationType,
            HDFSConnected,

            switchDatasetType,
            switchOperationType
        } = this.props;

        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    <label className="data-detail-item">
                        <span>数据集名称：</span>
                        <input type="text" defaultValue="Heatmap" />
                    </label>
                    <label className="data-detail-item">
                        <span>数据集类型：</span>
                        <dl>
                            <dt
                                className={(datasetType==='inceptor'?'radio-glugin-active ':'') + 'radio-glugin'}
                                onClick={() => switchDatasetType('inceptor')} >
                            </dt>
                            <dd className="active">inceptor</dd>
                        </dl>
                        <dl>
                            <dt
                                className={(datasetType==='HDFS'?'radio-glugin-active ':'') + 'radio-glugin'}
                                onClick={() => switchDatasetType('HDFS')}>
                            </dt>
                            <dd>HDFS</dd>
                        </dl>
                        <dl>
                            <dt
                                className={(datasetType==='uploadFile'?'radio-glugin-active ':'') + 'radio-glugin'}
                                onClick={() => switchDatasetType('uploadFile')}>
                            </dt>
                            <dd>上传文件</dd>
                        </dl>
                    </label>

                    {/* inceptor corresponding dom*/}
                    <div className={datasetType==='inceptor'?'':'none'}>
                        <label className="data-detail-item">
                            <span>选择连接：</span>
                            <input type="text" defaultValue="Heatmap" />
                            <div className="connect-success">
                                &nbsp;<button>新建连接</button>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <dl>
                                <dt
                                    className={(operationType==='table'?'radio-glugin-active ':'') + 'radio-glugin'}
                                    onClick={() => switchOperationType('table')}
                                ></dt>
                                <dd>选择表</dd>
                            </dl>
                            <dl>
                                <dt
                                    className={(operationType==='SQL'?'radio-glugin-active ':'') + 'radio-glugin'}
                                    onClick={() => switchOperationType('SQL')}
                                ></dt>
                                <dd>SQL</dd>
                            </dl>
                        </label>

                        <div className={operationType==='table'?'':'none'}>
                            <label className="data-detail-item">
                                <span>选择表：</span>
                                <input type="text" defaultValue="Heatmap" />
                            </label>
                        </div>

                        <div className={operationType==='SQL'?'':'none'}>
                            <label className="data-detail-item">
                                <span>SQL：</span>
                                <textarea name="" id="" cols="30" rows="10">
                                </textarea>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10">
                                </textarea>
                            </label>
                        </div>
                    </div>

                    {/* HDFS corresponding dom*/}
                    <div className={datasetType==='HDFS'?'':'none'} >
                        <div className={HDFSConnected===true?'':'none'}>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="file-show">
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold-active">
                                        <i className="icon"></i>
                                        <span>AD</span>
                                        <div className="file-fold">
                                            <i className="icon"></i>
                                            <span>DEV</span>
                                        </div>
                                        <div className="file-fold">
                                            <i className="icon"></i>
                                            <span className="active">DEV</span>
                                        </div>
                                        <div className="file-fold">
                                            <i className="icon"></i>
                                            <span>DEV</span>
                                        </div>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span>DEV</span>
                                    </div>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="connect-success">
                                    <span>连接成功</span>
                                    <button>配置&gt;</button>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10"></textarea>
                            </label>
                        </div>
                        <div className={HDFSConnected===true?'none':''}>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="data-connect-status">
                                    <span>尚未建立HDFS连接</span>
                                    <button>建立HDFS连接</button>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10"></textarea>
                            </label>
                        </div>
                    </div>

                    {/* upload file corresponding dom*/}
                    <div className={datasetType==='uploadFile'?'':'none'} >
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-show">
                                <div className="file-fold">
                                    <i className="icon"></i>
                                    <span>DEV</span>
                                </div>
                                <div className="file-fold-active">
                                    <i className="icon"></i>
                                    <span>AD</span>
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span className="active">DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"></i>
                                        <span>DEV</span>
                                    </div>
                                </div>
                                <div className="file-fold">
                                    <i className="icon"></i>
                                    <span>DEV</span>
                                </div>
                                <div className="file-fold">
                                    <i className="icon"></i>
                                    <span>DEV</span>
                                </div>
                                <div className="file-fold">
                                    <i className="icon"></i>
                                    <span>DEV</span>
                                </div>
                            </div>
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
                                <i className="icon"></i>
                                <span>package.json</span>
                                <div className="progress"></div>
                            </div>

                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-uploaded">
                                <i className="icon"></i>
                                <span>package.json</span>
                                <div className="finish"></div>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="connect-success">
                                <span>连接成功</span>
                                <button>配置></button>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                            <textarea name="" id="" cols="30" rows="10"></textarea>
                        </label>
                    </div>

                    <div className="data-detail-wrap-item">
                        <label className="data-detail-item data-detail-item-time">
                            <span>主列时间：</span>
                            <input type="text"/>
                        </label>
                        <label className="data-detail-item data-detail-item-time">
                            <span>缓存时间：</span>
                            <input type="text" />
                        </label>
                    </div>
                </div>
                <label className="sub-btn">
                    <input type="button" defaultValue="保存" />
                </label>
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
        switchDatasetType,
        switchHDFSConnected,
        switchOperationType
    } = bindActionCreators(actionCreators, dispatch);

    return {
        switchDatasetType,
        switchHDFSConnected,
        switchOperationType
    };
}
export default connect (mapStateToProps, mapDispatchToProps ) (SubDetail);
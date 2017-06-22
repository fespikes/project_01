import React from 'react';
import { render } from 'react-dom';
import { Tooltip } from 'antd';

import {Select} from './';
import PropTypes from 'prop-types';
import './popup.scss';

console.log('Select:', Select);

class Popup extends React.Component {
    constructor (props, context) {
        super(props);
        this.state = {
            datasetType: 'inceptor',     //uploadFile HDFS inceptor
            databaseName: '',
            sqlalchemyUri: '',

            verfifyType: 'password',     //verfifyType: keyTab password
            connectionNames: [],
            connectionName:'',
            databaseId:'',
            configFile:''
        };
        this.dispatch = context.dispatch;

        this.submit = this.submit.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.onChange = this.onChange.bind(this);

        this.HDFSOnChange = this.HDFSOnChange.bind(this);
        this.keyTabOnChange = this.keyTabOnChange.bind(this);
    };

    //showDialog () {
    //    this.refs.popupContainer.style.display = "flex";
    //}

    closeDialog () {
        const {changePopupStatus} = this.props;
        this.dispatch(changePopupStatus('none'));
    }

    onChange () {
        //this.setState({
            //sqlalchemyUri:this.refs.sqlalchemyUri.value
        //});
    }

    setSubmitParam () {
        const me = this;
        const {
            datasetType,
            databaseId,
            configFile,
            keytabFile
        } = this.state;

        const databaseName = this.refs.databaseName.value;
        const sqlalchemyUri = this.refs.sqlalchemyUri.value;
        const setPopupParam = this.props.setPopupParam;

        const connectionName = this.refs.connectionName.value;
        const principal = this.refs.principal.value;

        if (datasetType==='inceptor') {
            this.dispatch(setPopupParam({datasetType, databaseName, sqlalchemyUri}));
        } else if (datasetType==='HDFS') {
            this.dispatch(setPopupParam({
                                            datasetType,
                                            connectionName,
                                            databaseId,
                                            configFile,
                                            principal,
                                            keytabFile
                                        }));

        }
    }

    testConnection () {
        const testConnection = this.props.testConnection;
        testConnection();
        //TODO: the button status change
    }

    submit () {
        const me = this;
        const {setPopupParam} = this.props;
        //unnecessary to set state

        me.setSubmitParam();

        function callback(success, msg) {
            if(success) {
                me.closeDialog();
            }else {
                //to make sure the error tips
            }
        }
        me.props.submit(callback);
    }

    switchDatasetType (type) {
        const me = this;
        this.setState({
            datasetType: type
        });
        const fetchConnectionNames = this.props.fetchConnectionNames;

        const callback = (connectionNames) => {
            me.setState({connectionNames:connectionNames});
        }

        this.dispatch(fetchConnectionNames(callback));
    }

    switchVerfifyType (type) {
        this.setState({
            verfifyType: type
        });
    }

    HDFSOnChange (argus) {

        const me = this;
        const input = this.refs.configFile;
        const file = input.files[0];
        const reader = new FileReader();

        // We read the file and call the upload function with the result
        reader.onload = function (e) {
            const result = e.currentTarget.result;
            me.setState({
                configFile: result
            });
        };
        let text = reader.readAsText(file);
    }

    keyTabOnChange (argus) {
        const me = this;
        const input = me.refs.keytabFile;
        const file = input.files[0];
        const reader = new FileReader();

        // We read the file and call the upload function with the result
        reader.onload = function (e) {
            const result = e.currentTarget.result;
            me.setState({
                keytabFile: result
            });
        };
        let text = reader.readAsText(file);
    }

    render () {
        const me = this;

        const {
            title, deleteTips, confirm, closeDialog, showDialog,
            setPopupParam,
            status,

            //from popupParams,
            ////

            testConnection
        } = this.props;


        const {
            datasetType,     //uploadFile HDFS inceptor
            databaseName,
            sqlalchemyUri,

            verfifyType,
            connectionNames
        } = this.state;

        const setPopupState = (obj) => {
            me.setState(obj);
        }

        let iconClass = 'icon-connect';
        let tipMsg = <span>this is the tip message text.</span>;

        return (
            <div className="popup" ref="popupContainer" style={{display: status}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className={'icon '+ iconClass}></i>
                                <span>{title}</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">

                            <div className="add-connection">
                                <div className="data-detail-border">

                                    <label className="data-detail-item">
                                        <span>数据集类型：</span>
                                        <dl onClick={()=>this.switchDatasetType('inceptor')}>
                                            <dd className={(datasetType==='inceptor'?'radio-glugin-active':'')+' radio-glugin'} ></dd>
                                            <dd className={datasetType==='inceptor'?'active':''}>inceptor</dd>
                                        </dl>
                                        <dl onClick={()=>this.switchDatasetType('HDFS')}>
                                            <dd className={(datasetType==='HDFS'?'radio-glugin-active':'')+' radio-glugin'}></dd>
                                            <dd className={datasetType==='HDFS'?'active':''}>HDFS</dd>
                                        </dl>
                                    </label>
                                    <div style={{ display: datasetType==='inceptor'?'block':'none' }} >
                                        <label className="data-detail-item">
                                            <span>连接名称：</span>
                                            <input
                                                type="text"
                                                defaultValue=""
                                                required="required"
                                                ref="databaseName"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>连接串：</span>
                                            <input
                                                ref="sqlalchemyUri"
                                                type="text"
                                                placeholder="SQLAlchemy连接串"
                                                defaultValue={this.state.sqlalchemyUri}
                                                onChange={this.onChange}
                                                required="required"
                                            />
                                            <Tooltip placement="topRight" title={tipMsg}>
                                                <i className="icon icon-infor icon-infor-ps"></i>
                                            </Tooltip>
                                        </label>

                                        <label className="data-detail-item">
                                            <span>&nbsp;</span>
                                            <button className="uploading-btn">测试连接</button>
                                        </label>
                                    </div>
                                    <div style={{ display: datasetType==='HDFS'?'block':'none' }} >
                                        <label className="data-detail-item">
                                            <span>连接名称：</span>
                                            <input
                                                type="text"
                                                defaultValue=""
                                                required="required"
                                                ref="connectionName"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>关联inceptor连接：</span>
                                            <Select
                                                ref="databaseId"
                                                connectionNames={connectionNames}
                                                setPopupState={(argus)=>setPopupState(argus)}
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>HDFS配置文件：</span>
                                            <input
                                                ref="configFile"
                                                type="file"
                                                defaultValue="file"
                                                required="required"
                                                onChange={this.HDFSOnChange}
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>用户名：</span>
                                            <input
                                                ref="principal"
                                                type="text"
                                                defaultValue="Heatmap"
                                                required="required"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>认证类型：</span>
                                            <dl onClick={()=>this.switchVerfifyType('password')}>
                                                <dd className={(verfifyType==='password'?'radio-glugin-active':'')+' radio-glugin'} ></dd>
                                                <dd className={verfifyType==='password'?'active':''}>密码认证</dd>
                                            </dl>
                                            <dl onClick={()=>this.switchVerfifyType('keyTab')}>
                                                <dd className={(verfifyType==='keyTab'?'radio-glugin-active':'')+' radio-glugin'}></dd>
                                                <dd className={verfifyType==='keyTab'?'active':''}>keyTab</dd>
                                            </dl>
                                        </label>
                                        <label
                                            style={{display: verfifyType==='password'?'':'none' }}
                                            className="data-detail-item "
                                        >
                                            <span>密码：</span>
                                            <input
                                                ref="password"
                                                type="text"
                                                required="required"
                                                defaultValue="Heatmap" />
                                        </label>
                                        <label
                                            style={{display: verfifyType==='keyTab'?'':'none' }}
                                            className="data-detail-item"
                                        >
                                            <span>keyTab：</span>
                                            <input
                                                onChange={this.keyTabOnChange}
                                                ref="keytabFile"
                                                required="required"
                                                type="file"
                                                defaultValue="Heatmap" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.submit}>
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {
    dialogType: 'database'
};

Popup.propTypes = propTypes;
Popup.defaultProps = defaultProps;
Popup.contextTypes = {
    dispatch: PropTypes.func.isRequired
};
export default Popup;

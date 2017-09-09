import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';

import {Select} from './';
import PropTypes from 'prop-types';

import { getDatabaseDefaultParams } from '../../../utils/utils';

const defaultParams = getDatabaseDefaultParams();

class Popup extends React.Component {
    constructor (props, context) {
        super(props);
        this.state = {
            databaseName: '',
            sqlalchemyUri: '',

            connectionNames: [],
            connectionName:'',
            databaseId:'',

            submitState:'',
            submitMsg:'',

            connected: false
        };
        this.dispatch = context.dispatch;

        this.submit = this.submit.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.setSelectConnection = this.setSelectConnection.bind(this);
    }

    componentDidMount () {
        this.fetchConnectionNames();
    }

    closeDialog () {
        const {changePopupStatus, clearPopupParams} = this.props;
        this.clearDomParams();
        this.dispatch(clearPopupParams());
        this.dispatch(changePopupStatus('none'));
    }

    clearDomParams() {
        const { datasetType } = this.props;
        if(datasetType === "INCEPTOR") {
            this.refs.databaseName.value = '';
            this.refs.descriptionInceptor.value = '';
            this.refs.httpfs.value = '';
            this.refs.sqlalchemyUri.value = '';
        }else if(datasetType === "HDFS") {
            this.refs.connectionName.value = '';
            this.refs.descriptionHDFS.value = '';
            this.refs.httpfs.value = '';
            this.refs.databaseId.value = '';
        }
    }

    setSubmitParam () {
        const {datasetType} = this.props;
        const {databaseId} = this.state;
        const setPopupParam = this.props.setPopupParam;

        const databaseName = this.refs.databaseName.value;
        const sqlalchemyUri = this.refs.sqlalchemyUri.value;
        const databaseArgs = this.refs.databaseArgs.value;
        const descriptionInceptor = this.refs.descriptionInceptor.value;

        const connectionName = this.refs.connectionName.value;
        const descriptionHDFS = this.refs.descriptionHDFS.value;
        const httpfs = this.refs.httpfs.value;

        if (datasetType==='INCEPTOR') {
            this.dispatch(
                setPopupParam({
                    datasetType,
                    databaseName,
                    sqlalchemyUri,
                    descriptionInceptor,
                    databaseArgs
                }
            ));
        } else if (datasetType==='HDFS') {
            this.dispatch(
                setPopupParam({
                    datasetType,
                    connectionName,
                    databaseId,
                    httpfs,
                    descriptionHDFS
                }
            ));
        }
    }

    testConnection() {
        const me = this;
        const testConnection = this.props.testConnection;
        this.setSubmitParam();

        this.dispatch(testConnection(callback));

        function callback(success) {
            let exception = {};
            if(success) {
                exception.type = "success";
                exception.message = "该连接是一个合法连接";
            }else {
                exception.type = "error";
                exception.message = "该连接是一个不合法连接";
            }
            const tipBox = me.refs['testConnectTip'];
            me.setState({
                connected: success
            });
            render(
                <Alert
                    message={exception.message}
                    type={exception.type}
                    onClose={
                        () => unmountComponentAtNode(tipBox)
                    }
                    closable={true}
                    showIcon
                />,
                tipBox
            );
        }

    }

    setSelectConnection(databaseId) {
        this.setState({
            databaseId: databaseId
        });
    }

    submit () {
        const me = this;

        me.setSubmitParam();

        function callback(success, data) {
            if(success) {
                me.setState({
                    submitState:'',
                    submitMsg:''
                });
                me.closeDialog();
            }else {
                me.setState({
                    submitState:'error',
                    submitMsg:data
                });
            }
        }
        me.props.submit(callback);
    }



    fetchConnectionNames () {
        const me = this;
        const fetchConnectionNames = this.props.fetchConnectionNames;

        const callback = (connectionNames) => {
            me.setState({connectionNames:connectionNames});
        }
        this.dispatch(fetchConnectionNames(callback));
    }

    render () {
        const me = this;
        const { title, datasetType, status } = this.props;
        const {connectionNames} = this.state;

        let iconClass = 'icon-connect';
        let tipMsg = <span>Please modify this required field.</span>;

        let {submitState} = this.state;
        let showAlert = !(submitState==='error' || submitState==='succeed') && submitState ;

        return (
            <div className="popup" ref="popupContainer" style={{display: status}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className={'icon '+ iconClass}/>
                                <span>{title}</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}/>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div style={{ display: datasetType==='INCEPTOR'?'block':'none' }} >
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            type="text"
                                            defaultValue=""
                                            required="required"
                                            name="database_name"
                                            ref="databaseName"
                                            className="tp-input dialog-input"
                                        />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>描述：</span>
                                    </div>
                                    <div className="item-right">
                                        <textarea
                                            type="text"
                                            defaultValue=""
                                            ref="descriptionInceptor"
                                            name="description"
                                            className="tp-textarea dialog-area"
                                        />
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接串：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            ref="sqlalchemyUri"
                                            name="sqlalchemy_uri"
                                            type="text"
                                            defaultValue="inceptor://username:password@172.0.0.1:10000/default"
                                            required="required"
                                            className="tp-input dialog-input"
                                        />
                                        <Tooltip placement="topRight" title={tipMsg}>
                                            <i
                                                className="icon icon-infor"
                                                style={{position: 'absolute', top: '10px', right: '-20px'}}/>
                                        </Tooltip>
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接参数：</span>
                                    </div>
                                    <div className="item-right">
                                        <textarea
                                            id="connectParams"
                                            rows="5"
                                            style={{width:'420px', height:'120px'}}
                                            required="required"
                                            ref="databaseArgs"
                                            defaultValue={JSON.stringify(defaultParams, undefined, 4)}
                                            className="tp-textarea dialog-area"
                                        >
                                        </textarea>
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>&nbsp;</span>
                                    </div>
                                    <div className="item-right">
                                        <button
                                            className="test-connect"
                                            onClick={ag=> me.testConnection(ag)}>
                                            <i className="icon icon-connect-test"/>
                                            <span>测试连接</span>
                                        </button>
                                        <div ref="testConnectTip" style={{position: 'absolute', right: 0, top: 2}}></div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: datasetType==='HDFS'?'block':'none' }} >
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            type="text"
                                            defaultValue=''
                                            required="required"
                                            ref="connectionName"
                                            className="tp-input dialog-input"
                                        />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>描述：</span>
                                    </div>
                                    <div className="item-right">
                                        <textarea
                                            rows="5"
                                            defaultValue=''
                                            style={{width:'420px'}}
                                            required="required"
                                            ref="descriptionHDFS"
                                            className="tp-textarea dialog-area"
                                        />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>httpfs地址：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            ref="httpfs"
                                            type="text"
                                            defaultValue=''
                                            placeholder="httpfs地址"
                                            required="required"
                                            className="tp-input dialog-input"
                                        />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>默认inceptor连接：</span>
                                    </div>
                                    <div className="item-right">
                                        <Select
                                            ref="databaseId"
                                            options={connectionNames}
                                            width={420}
                                            handleSelect={(argus)=>this.setSelectConnection(argus)}
                                        />
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>&nbsp;</span>
                                    </div>
                                    <div className="item-right">
                                        <button
                                            className="test-connect"
                                            onClick={ag=> me.testConnection(ag)}>
                                            <i className="icon icon-connect-test"/>
                                            <span>测试连接</span>
                                        </button>
                                        <div ref="testConnectTip" style={{position: 'absolute', right: 0, top: 2}}></div>
                                    </div>
                                </div>                            </div>
                        </div>
                        <div className="error">
                            <Alert
                                message={this.state.submitMsg}
                                type={this.state.submitState}
                                style={{display:(showAlert?'':'none')}}
                            />
                        </div>
                        <div className="popup-footer">
                            <button
                                disabled={datasetType==="INCEPTOR"&&!this.state.connected}
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

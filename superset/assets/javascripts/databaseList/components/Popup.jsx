import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';

import {Select} from './';
import PropTypes from 'prop-types';

const defaultParams = {
    "connect_args": {
        "framed": 0,
        "hive": "Hive Server 2",
        "mech": "LDAP"
    }
};

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
            submitMsg:''
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
        const { datasetType } = this.props;
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

        function callback(json) {
            let exception = {};
            if(json) {
                exception.type = "success";
                exception.message = "该连接是一个合法连接";
            }else {
                exception.type = "error";
                exception.message = "该连接是一个不合法连接";
            }
            const tipBox = me.refs['testConnectTip'];
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

        function callback(success, json) {
            if(success) {
                me.setState({
                    submitState:'success',
                    submitMsg:json.message
                });
                setTimeout(argu =>{
                    me.setState({
                        submitState:'',
                        submitMsg:''
                    });
                    me.closeDialog();
                }, 3000);
            }else {
                me.setState({
                    submitState:'error',
                    submitMsg:json.message
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
        let tipMsg = <span>this is the tip message text.</span>;

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

                            <div className="add-connection">
                                <div className="data-detail-border">

                                    <div style={{ display: datasetType==='INCEPTOR'?'block':'none' }} >
                                        <label className="data-detail-item">
                                            <span>连接名称：</span>
                                            <input
                                                type="text"
                                                defaultValue=""
                                                required="required"
                                                name="database_name"
                                                ref="databaseName"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>描述：</span>
                                            <input
                                                type="text"
                                                defaultValue=""
                                                ref="descriptionInceptor"
                                                name="description"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>连接串：</span>
                                            <input
                                                ref="sqlalchemyUri"
                                                name="sqlalchemy_uri"
                                                type="text"
                                                placeholder="SQLAlchemy连接串"
                                                defaultValue={this.state.sqlalchemyUri}
                                                required="required"
                                            />
                                            <Tooltip placement="topRight" title={tipMsg}>
                                                <i className="icon icon-infor icon-infor-ps"/>
                                            </Tooltip>
                                        </label>

                                        <label className="data-detail-item">
                                            <span>&nbsp;</span>
                                            <button
                                                className="test-connect"
                                                onClick={ag=> me.testConnection(ag)}>
                                                <i className="icon icon-connect-test"/>
                                                <span>测试连接</span>
                                            </button>
                                            <div ref="testConnectTip"></div>
                                        </label>
                                        <label className="data-detail-item">
                                            <span>连接参数：</span>
                                            <textarea
                                                id="connectParams"
                                                rows="5"
                                                style={{width:'420px'}}
                                                required="required"
                                                ref="databaseArgs"
                                                defaultValue={JSON.stringify(defaultParams, undefined, 4)}
                                            >
                                            </textarea>
                                        </label>
                                    </div>
                                    <div style={{ display: datasetType==='HDFS'?'block':'none' }} >
                                        <label className="data-detail-item">
                                            <span>连接名称：</span>
                                            <input
                                                type="text"
                                                defaultValue=''
                                                required="required"
                                                ref="connectionName"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>描述：</span>
                                            <textarea
                                                rows="5"
                                                defaultValue=''
                                                style={{width:'420px'}}
                                                required="required"
                                                ref="descriptionHDFS"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>httpfs地址：</span>
                                            <input
                                                ref="httpfs"
                                                type="text"
                                                defaultValue=''
                                                placeholder="httpfs地址"
                                                required="required"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>默认inceptor连接：</span>
                                            <Select
                                                ref="databaseId"
                                                options={connectionNames}
                                                width={420}
                                                handleSelect={(argus)=>this.setSelectConnection(argus)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Alert
                            message={this.state.submitMsg}
                            type={this.state.submitState}
                            style={{display:(showAlert?'':'none')}}
                        />
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

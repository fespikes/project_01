import React from 'react';
import ReactDOM, { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';

import {Select} from '../components';
import PropTypes from 'prop-types';
import { fetchInceptorConnectAdd, fetchHDFSConnectAdd, testConnection, testHDFSConnection, fetchConnectionNames, connectionTypes } from '../actions';
import { getDatabaseDefaultParams } from '../../../utils/utils';
import { isIncMysOraMssConnection } from '../utils';

const defaultParams = JSON.stringify(getDatabaseDefaultParams(), undefined, 4);

class ConnectionAdd extends React.Component {
    constructor (props, context) {
        super(props);
        this.state = {
            exception: {},
            database: {
                database_name: '',
                database_type: '',
                description: '',
                sqlalchemy_uri: '',
                args: defaultParams,

                connection_name: '',
                httpfs: '',
                database_id:''
            },
            connectionNames: [],
            connected: false,
            disabled: true

        };

        this.submit = this.submit.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.setSelectConnection = this.setSelectConnection.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount () {
        const { connectionType } = this.props;
        if(connectionType === connectionTypes.hdfs) {
            this.fetchConnectionNames();
        }
    }

    closeDialog () {
        ReactDOM.unmountComponentAtNode(document.getElementById('popup_root'));
    }

    testConnection() {
        const self = this;
        const { dispatch, connectionType } = this.props;
        if(isIncMysOraMssConnection(connectionType, connectionTypes)) {
            dispatch(testConnection({
                database_name: this.state.database.database_name,
                sqlalchemy_uri: this.state.database.sqlalchemy_uri,
                args: this.state.database.args
            }, callback));
        }else if(connectionType === connectionTypes.hdfs) {
            dispatch(testHDFSConnection(this.state.database.httpfs, callback));
        }
        function callback(success) {
            let exception = {};
            if(success) {
                exception.type = "success";
                exception.message = "该连接是一个合法连接";
            }else {
                exception.type = "error";
                exception.message = "该连接是一个不合法连接";
            }
            self.setState({
                connected: true
            });
            self.formValidate(self.state.database);
            render(
                <Alert
                    message={exception.message}
                    type={exception.type}
                    onClose={self.closeAlert('test-add-connect-tip')}
                    closable={true}
                    showIcon
                />,
                document.getElementById('test-add-connect-tip')
            );
        }
    }

    closeAlert(id) {
        ReactDOM.unmountComponentAtNode(document.getElementById(id));
    }

    setSelectConnection(databaseId) {
        const database = {
            ...this.state.database,
            database_id: databaseId
        };
        this.setState({
            database: database
        });
        this.formValidate(database);
    }

    handleChange(e) {
        const target = e.currentTarget;
        const name = target.name;
        const val = target.value;
        const database = {...this.state.database, [name]: val};
        this.setState({
            database: database
        });
        this.formValidate(database);
    }

    formValidate(database) {
        let disabled;
        const { connectionType } = this.props;
        if(isIncMysOraMssConnection(connectionType, connectionTypes)) {
            if((database.database_name && database.database_name.length > 0) &&
                (database.sqlalchemy_uri && database.sqlalchemy_uri.length > 0) &&
                (database.args && database.args.length > 0) && this.state.connected) {
                disabled = false;
            }else {
                disabled = true;
            }
        }else if(this.props.connectionType === connectionTypes.hdfs) {
            if((database.connection_name && database.connection_name.length > 0) &&
                (database.httpfs && database.httpfs.length > 0)) {
                disabled = false;
            }else {
                disabled = true;
            }
        }
        this.setState({
            disabled: disabled
        });
    }

    submit () {
        const self = this;
        const { connectionType, dispatch } = this.props;

        function callback(success, message) {
            if(success) {
                self.closeDialog();
            }else {
                render(
                    <Alert
                        message="Error"
                        type="error"
                        description={message}
                        onClose={self.closeAlert('add-connect-tip')}
                        closable={true}
                        showIcon
                    />,
                    document.getElementById('add-connect-tip')
                );
            }
        }
        if(isIncMysOraMssConnection(connectionType, connectionTypes)) {
            dispatch(fetchInceptorConnectAdd({
                database_name: this.state.database.database_name,
                database_type: connectionType,
                description: this.state.database.description,
                sqlalchemy_uri: this.state.database.sqlalchemy_uri,
                args: this.state.database.args
            }, callback) );
        }else if(connectionType === connectionTypes.hdfs) {
            dispatch(fetchHDFSConnectAdd({
                connection_name: this.state.database.connection_name,
                description: this.state.database.description,
                httpfs: this.state.database.httpfs,
                database_id: this.state.database.database_id
            }, callback))
        }
    }

    fetchConnectionNames () {
        const self = this;
        const { dispatch } = this.props;
        const callback = (connectionNames) => {
            self.setState({connectionNames:connectionNames});
        };
        dispatch(fetchConnectionNames(callback));
    }

    render () {
        const self = this;
        const { connectionType } = this.props;

        let iconClass = 'icon-connect';
        let tipMsgStr = "如果认证方式是LDAP，需要加上用户名和密码：Inceptor://username:password@172.0.0.1:10000/database";
        let tipMsgParam = "ODBC连接串的参数。（1）keytab文件通过Guardian获取；（2）支持LDAP认证，连接串需要添加用户名和密码";

        return (
            <div className="popup" ref="popupContainer">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className={'icon '+ iconClass}/>
                                <span>添加{connectionType}连接</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}/>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div style={{ display: isIncMysOraMssConnection(connectionType, connectionTypes)?'block':'none' }} >
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            required="required"
                                            name="database_name"
                                            className="tp-input dialog-input"
                                            onChange={this.handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>描述：</span>
                                    </div>
                                    <div className="item-right">
                                        <textarea
                                            name="description"
                                            className="tp-textarea dialog-area"
                                            onChange={this.handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>连接串：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            defaultValue="inceptor://username:password@172.0.0.1:10000/default"
                                            required="required"
                                            name="sqlalchemy_uri"
                                            className="tp-input dialog-input"
                                            onChange={this.handleChange}
                                        />
                                        <Tooltip placement="topRight" title={tipMsgStr}>
                                            <i className="icon icon-infor after-icon"/>
                                        </Tooltip>
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>连接参数：</span>
                                    </div>
                                    <div className="item-right">
                                        <textarea
                                            rows="5"
                                            style={{width:'420px', height:'120px'}}
                                            required="required"
                                            name="args"
                                            defaultValue={defaultParams}
                                            className="tp-textarea dialog-area"
                                            onChange={this.handleChange}
                                        >
                                        </textarea>
                                        <Tooltip placement="topRight" title={tipMsgParam}>
                                            <i
                                                className="icon icon-infor after-textarea-icon"
                                                style={{top: 50}}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: connectionType === connectionTypes.hdfs?'block':'none' }} >
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            defaultValue=''
                                            required="required"
                                            name="connection_name"
                                            className="tp-input dialog-input"
                                            onChange={this.handleChange}
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
                                            name="description"
                                            className="tp-textarea dialog-area"
                                            onChange={this.handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>httpfs地址：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            defaultValue=''
                                            placeholder="httpfs地址"
                                            required="required"
                                            name="httpfs"
                                            className="tp-input dialog-input"
                                            onChange={this.handleChange}
                                        />
                                        <Tooltip placement="topRight" title="HDFS httpf服务IP地址">
                                            <i className="icon icon-infor after-icon"/>
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>默认inceptor连接：</span>
                                    </div>
                                    <div className="item-right">
                                        <Select
                                            options={this.state.connectionNames}
                                            width={420}
                                            handleSelect={(argus)=>this.setSelectConnection(argus)}
                                        />
                                        <Tooltip placement="topRight" title="如果HDFS数据集没有选择Inceptor连接，则将使用该Inceptor连接。">
                                            <i className="icon icon-infor after-icon"/>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>&nbsp;</span>
                                </div>
                                <div className="item-right">
                                    <button
                                        className="test-connect"
                                        onClick={ag=> self.testConnection(ag)}>
                                        <i className="icon icon-connect-test"/>
                                        <span>测试连接</span>
                                    </button>
                                    <div
                                        id="test-add-connect-tip"
                                        style={{position: 'absolute', right: 0, top: 2}}>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="error" id="add-connect-tip"></div>
                        <div className="popup-footer">
                            <button
                                disabled={this.state.disabled}
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
const defaultProps = {};

ConnectionAdd.propTypes = propTypes;
ConnectionAdd.defaultProps = defaultProps;

export default ConnectionAdd;

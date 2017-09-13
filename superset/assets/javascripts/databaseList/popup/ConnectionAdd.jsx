import React from 'react';
import ReactDOM, { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';

import {Select} from '../components';
import PropTypes from 'prop-types';
import { fetchInceptorConnectAdd, fetchHDFSConnectAdd, testConnection, testHDFSConnection, fetchConnectionNames, connectionTypes } from '../actions';
import { isCorrectConnection, connectDefaultInfo} from '../utils';

class ConnectionAdd extends React.Component {
    constructor (props, context) {
        super(props);
        this.state = {
            exception: {},
            database: {
                database_name: '',
                database_type: '',
                description: '',
                sqlalchemy_uri: connectDefaultInfo[props.connectionType].str.defaultValue,
                args: JSON.stringify(
                    connectDefaultInfo[props.connectionType].args.defaultValue,
                    undefined,
                    4
                ),
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
        if(isCorrectConnection(connectionType, connectionTypes)) {
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
        if(isCorrectConnection(connectionType, connectionTypes)) {
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
        if(isCorrectConnection(connectionType, connectionTypes)) {
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

        return (
            <div className="popup" ref="popupContainer">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className='icon icon-connect'/>
                                <span>添加{connectionType}连接</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}/>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div style={{ display: isCorrectConnection(connectionType, connectionTypes)?'block':'none' }} >
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
                                            defaultValue={this.state.database.sqlalchemy_uri}
                                            required="required"
                                            name="sqlalchemy_uri"
                                            className="tp-input dialog-input"
                                            onChange={this.handleChange}
                                        />
                                        <Tooltip
                                            placement="topRight"
                                            title={connectDefaultInfo[connectionType].str.tip}
                                        >
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
                                            defaultValue={this.state.database.args}
                                            className="tp-textarea dialog-area"
                                            onChange={this.handleChange}
                                            disabled={connectionType===connectionTypes.inceptor?false:true}
                                        >
                                        </textarea>
                                        <Tooltip
                                            placement="topRight"
                                            title={connectDefaultInfo[connectionType].args.tip}
                                        >
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
                                        <Tooltip
                                            placement="topRight"
                                            title={connectDefaultInfo[connectionTypes.hdfs].httpfs.tip}
                                        >
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
                                        <Tooltip
                                            placement="topRight"
                                            title={connectDefaultInfo[connectionTypes.hdfs].defaultIncConnect.tip}
                                        >
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

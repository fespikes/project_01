import React from 'react';
import ReactDOM from 'react-dom';
import { render } from 'react-dom';
import { connectionTypes, fetchUpdateConnection, testConnection, fetchConnectionNames } from '../actions';
import { Alert, Tooltip } from 'antd';
import {Select} from '../components';
import PropTypes from 'prop-types';

class ConnectionEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            disabled: false,
            database: this.props.database,
            connected: false,
            connectionNames: [],
            id: props.connectionId
        };

        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.testConnection = this.testConnection.bind(this);
        this.closeAlert = this.closeAlert.bind(this);
        this.setPopupState = this.setPopupState.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    };

    componentDidMount () {
        this.fetchConnectionNames();
        let database = {};
        if(this.props.connectionType === connectionTypes.inceptor) {
            let connectParams = JSON.stringify(JSON.parse(this.state.database.args), undefined, 4);
            document.getElementById('connectParams').value = connectParams;
            database = {
                ...this.state.database,
                databaseArgs: connectParams,
                connectionType: this.props.connectionType
            };

        }else if(this.props.connectionType === connectionTypes.HDFS) {
            database = {
                ...this.state.database,
                connectionType: this.props.connectionType
            }
        }
        this.setState({
            database: database
        });
    }

    fetchConnectionNames () {
        const me = this;
        const callback = (connectionNames) => {
            me.setState({connectionNames:connectionNames});
        }
        this.props.dispatch(fetchConnectionNames(callback));
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    testConnection(testCallBack) {
        const me = this;
        const { dispatch } = me.props;
        dispatch(testConnection(
            {
                database_name: me.state.database.database_name,
                sqlalchemy_uri: me.state.database.sqlalchemy_uri,
                args: me.state.database.databaseArgs
            }, callback)
        );

        function callback(success) {
            let exception = {};
            let connected;
            if(success) {
                exception.type = "success";
                exception.message = "该连接是一个合法连接";
                connected = true;
            } else {
                exception.type = "error";
                exception.message = "该连接是一个不合法连接";
                connected = false;
            }
            me.setState({
                exception: exception,
                connected: connected
            });
            render(
                <Alert
                    message={me.state.exception.message}
                    type={me.state.exception.type}
                    onClose={me.closeAlert('test-connect-tip')}
                    closable={true}
                    showIcon
                />,
                document.getElementById('test-connect-tip')
            );
            if(typeof testCallBack === 'function') {
                testCallBack(me.state.connected);
            }
        }
    }

    closeAlert(id) {

        ReactDOM.unmountComponentAtNode(document.getElementById(id));
    }

    handleInputChange (e) {
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
        if(this.props.connectionType === connectionTypes.inceptor) {
            if((database.database_name && database.database_name.length > 0) &&
                (database.sqlalchemy_uri && database.sqlalchemy_uri.length > 0) &&
                (database.databaseArgs && database.databaseArgs.length > 0)) {
                disabled = false;
            }else {
                disabled = true;
            }
        }else if(this.props.connectionType === connectionTypes.HDFS) {
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

    setPopupState(databaseId) {
        const database = {
            ...this.state.database,
            database_id: databaseId
        };
        this.setState({
            database: database
        });
    }

    doUpdateConnection() {
        const {dispatch} = this.props;
        const me = this;
        dispatch(fetchUpdateConnection(me.state.database, callback));
        function callback(success, message) {
            if(success) {
                ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
            }else {
                render(
                    <Alert
                        message="Error"
                        type="error"
                        description={message}
                        onClose={me.closeAlert('edit-connect-tip')}
                        closable={true}
                        showIcon
                    />,
                    document.getElementById('edit-connect-tip')
                );
            }
        }
    }

    confirm() {
        const me = this;
        if(this.props.connectionType === connectionTypes.inceptor) {
            if(this.state.connected) {
                this.doUpdateConnection();
            }else {
                this.testConnection(testCallBack);
                function testCallBack(success) {
                    if(success) {
                        me.doUpdateConnection();
                    }
                }
            }
        }else if(this.props.connectionType === connectionTypes.HDFS) {
            this.doUpdateConnection();
        }
    }

    render() {
        const connectionType = this.props.connectionType;
        const database = this.state.database;
        const {connectionNames}= this.state;

        return (
            <div className="popup" ref="popupConnectionEdit" style={{display:'flex'}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-connect" />
                                <span>编辑{connectionType}连接</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog} />
                            </div>
                        </div>
                        <div className="popup-body">
                            {/*S: inceptor connection body*/}
                            <div className={connectionType===connectionTypes.inceptor?'':'none'} >
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接类型：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{connectionType}</span>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            name="database_name"
                                            className="tp-input dialog-input"
                                            value={database.database_name}
                                            onChange={this.handleInputChange}/>
                                    </div>
                                </div>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>描述：</span>
                                    </div>
                                    <div className="item-right">
                                    <textarea
                                        name = "description"
                                        className="tp-textarea dialog-area"
                                        value={database.description||''}
                                        onChange={this.handleInputChange}
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
                                            name = "sqlalchemy_uri"
                                            className="tp-input dialog-input"
                                            value={database.sqlalchemy_uri}
                                            onChange={this.handleInputChange}
                                        />
                                        <Tooltip title="如果认证方式是LDAP，需要加上用户名和密码：Inceptor://username:password@172.0.0.1:10000/database" placement="topRight">
                                            <i className="icon icon-info after-icon" />
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
                                            id="connectParams"
                                            name="databaseArgs"
                                            style={{height:'120px'}}
                                            className="tp-textarea dialog-area"
                                            onChange={this.handleInputChange}
                                        />
                                        <Tooltip title="ODBC连接串的参数。（1）keytab文件通过Guardian获取；（2）支持LDAP认证，连接串需要添加用户名和密码" placement="topRight">
                                            <i
                                                className="icon icon-info after-textarea-icon"
                                                style={{top: 50}}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>

                                <div className="dialog-item" style={{ position: 'relative' }}>
                                    <div className="item-left"></div>
                                    <div className="item-right item-connect-test">
                                        <button className="test-connect" onClick={this.testConnection}>
                                            <i className="icon icon-connect-test" />
                                            <span>测试连接</span>
                                        </button>
                                        <div id="test-connect-tip"></div>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="sub-item">
                                        <div className="item-left">
                                            <span>创建者：</span>
                                        </div>
                                        <div className="item-right">
                                            <span>{database.created_by_user}</span>
                                        </div>
                                    </div>
                                    <div className="sub-item">
                                        <div className="item-left">
                                            <span>修改者：</span>
                                        </div>
                                        <div className="item-right">
                                            <span>{database.changed_by_user}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="sub-item">
                                        <div className="item-left">
                                            <span>创建日期：</span>
                                        </div>
                                        <div className="item-right">
                                            <span>{database.created_on}</span>
                                        </div>
                                    </div>
                                    <div className="sub-item">
                                        <div className="item-left">
                                            <span>修改时间：</span>
                                        </div>
                                        <div className="item-right">
                                            <span>{database.changed_on}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/*E: inceptor connection body*/}

                            {/*S: HDFS connection body*/}
                            <div className={connectionType===connectionTypes.HDFS?'':'none'} >
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接类型：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{connectionType}</span>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            className="tp-input dialog-input"
                                            name="connection_name"
                                            value={database.connection_name}
                                            onChange={this.handleInputChange}/>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>描述：</span>
                                    </div>
                                    <div className="item-right">
                                    <textarea
                                        className="tp-textarea dialog-area"
                                        name="description"
                                        value={database.description||' '}
                                        onChange={this.handleInputChange}
                                    />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <i>*</i>
                                        <span>httpfs：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            className="tp-input dialog-input"
                                            name="httpfs"
                                            value={database.httpfs}
                                            onChange={this.handleInputChange}
                                        />
                                        <Tooltip title="HDFS httpf服务IP地址" placement="topRight">
                                            <i className="icon icon-info after-icon" />
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>inceptor连接：</span>{/*默认inceptor连接*/}
                                    </div>
                                    <div className="item-right">
                                        <Select
                                            options={connectionNames}
                                            value={database.database}
                                            width={420}
                                            handleSelect={(argus)=>this.setPopupState(argus)}
                                        />
                                        <Tooltip title="如果HDFS数据集没有选择Inceptor连接，则将使用该Inceptor连接。" placement="topRight">
                                            <i className="icon icon-info after-icon" />
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="sub-item">
                                        <div className="item-left">
                                            <span>创建者：</span>
                                        </div>
                                        <div className="item-right">
                                            <span>{database.created_by_user}</span>
                                        </div>
                                    </div>
                                    <div className="sub-item">
                                        <div className="item-left">
                                            <span>修改者：</span>
                                        </div>
                                        <div className="item-right">
                                            <span>{database.changed_by_user}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/*E: HDFS connection*/}
                        </div>
                        <div className="error" id="edit-connect-tip"></div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                                disabled={this.state.disabled}
                            >确定</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

ConnectionEdit.propTypes = propTypes;
ConnectionEdit.defaultProps = defaultProps;

export default ConnectionEdit;

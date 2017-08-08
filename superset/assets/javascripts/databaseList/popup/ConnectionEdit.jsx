import React from 'react';
import ReactDOM from 'react-dom';
import { render } from 'react-dom';
import { connectionTypes, popupActions, fetchUpdateConnection, testConnectionInEditConnectPopup } from '../actions';
import { Alert, Tooltip } from 'antd';
import {Select} from '../components';
import PropTypes from 'prop-types';

class ConnectionEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
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

        const database = {
            ...this.state.database,
            connectionType: this.props.connectionType
        };
        this.setState({
            database: database
        });

        if(this.props.connectionType === "INCEPTOR") {
            let connectParams = JSON.stringify(JSON.parse(this.state.database.args), undefined, 4);
            document.getElementById('connectParams').value = connectParams;
        }
    }

    fetchConnectionNames () {
        const me = this;
        const callback = (connectionNames) => {
            me.setState({connectionNames:connectionNames});
        }

        this.props.dispatch(popupActions.fetchConnectionNames(callback));
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    testConnection(testCallBack) {
        const me = this;
        const { dispatch } = me.props;
        dispatch(testConnectionInEditConnectPopup(
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
                        description={message.message}
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
        if(this.props.connectionType === "INCEPTOR") {
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
        }else if(this.props.connectionType === "HDFS") {
            this.doUpdateConnection();
        }
    }

    render() {
        const connectionType = this.props.connectionType;
        const types = connectionTypes;
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
                            <div className={connectionType===types.inceptor?'':'none'} >
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
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            name="database_name"
                                            className="form-control dialog-input"
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
                                        className="dialog-area"
                                        value={database.description||' '}
                                        onChange={this.handleInputChange}
                                    />
                                    </div>
                                </div>

                                <label className="dialog-item">
                                    <div className="item-left">
                                        <span>连接参数：</span>
                                    </div>
                                    <div className="item-right">
                                    <textarea
                                        id="connectParams"
                                        name="databaseArgs"
                                        className="dialog-area"
                                        onChange={this.handleInputChange}
                                    >
                                    </textarea>
                                    </div>
                                </label>

                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>连接串：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            name = "sqlalchemy_uri"
                                            className="form-control dialog-input"
                                            value={database.sqlalchemy_uri}
                                            onChange={this.handleInputChange}/>
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
                                    <Tooltip title="structure your URL" placement="bottom">
                                        <i className="icon icon-info" style={{ position: 'absolute', top: '-32px', right: '-23px' }} />
                                    </Tooltip>
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
                            <div className={connectionType===types.HDFS?'':'none'} >
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
                                        <span>连接名称：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            className="form-control dialog-input"
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
                                        className="dialog-area"
                                        name="description"
                                        value={database.description||' '}
                                        onChange={this.handleInputChange}
                                    />
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>httpfs：</span>
                                    </div>
                                    <div className="item-right">
                                        <input
                                            className="form-control dialog-input"
                                            name="httpfs"
                                            value={database.httpfs}
                                            onChange={this.handleInputChange}/>
                                    </div>
                                </div>
                                <div className="dialog-item">
                                    <div className="item-left">
                                        <span>inceptor连接：</span>{/*默认inceptor连接*/}
                                    </div>
                                    <Select
                                        options={connectionNames}
                                        value={database.database}
                                        width={420}
                                        handleSelect={(argus)=>this.setPopupState(argus)}
                                    />
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

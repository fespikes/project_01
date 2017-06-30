import React from 'react';
import ReactDOM from 'react-dom';
import { render } from 'react-dom';
import { fetchUpdateConnection, testConnectionInEditConnectPopup } from '../actions';
import { Select, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';

class ConnectionEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            database: props.database,
            connected: false
        };
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleURIChange = this.handleURIChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.testConnection = this.testConnection.bind(this);
        this.closeAlert = this.closeAlert.bind(this);
    };

    showDialog() {
        this.refs.popupConnectionEdit.style.display = "flex";
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    testConnection() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(testConnectionInEditConnectPopup(self.state.database, callback));

        function callback(success) {
            let exception = {};
            let connected;
            if(success) {
                exception.type = "success";
                exception.message = "该连接是一个合法连接";
                connected = true;
            }else {
                exception.type = "error";
                exception.message = "该连接是一个不合法连接";
                connected = false;
            }
            self.setState({
                exception: exception,
                connected: connected
            });
            render(
                <Alert
                    message={self.state.exception.message}
                    type={self.state.exception.type}
                    onClose={self.closeAlert('test-connect-tip')}
                    closable={true}
                    showIcon
                />,
                document.getElementById('test-connect-tip')
            );
        }
    }

    closeAlert(id) {

        ReactDOM.unmountComponentAtNode(document.getElementById(id));
    }

    handleNameChange(e) {
        this.props.database.database_name = e.currentTarget.value;
        this.setState({
            database: this.props.database
        });
    }

    handleURIChange(e) {
        this.props.database.sqlalchemy_uri = e.currentTarget.value;
        this.setState({
            database: this.props.database
        });
    }

    handleDescriptionChange(e) {
        this.props.database.description = e.currentTarget.value;
        this.setState({
            database: this.props.database
        });
    }

    confirm() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(fetchUpdateConnection(self.state.database, callback));
        function callback(success, message) {
            if(success) {
                ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
            }else {
                render(
                    <Alert
                        message="Error"
                        type="error"
                        description={message.message}
                        onClose={self.closeAlert('edit-connect-tip')}
                        closable={true}
                        showIcon
                    />,
                    document.getElementById('edit-connect-tip')
                );
            }
        }
    }

    render() {

        return (
            <div className="popup" ref="popupConnectionEdit" style={{display:'none'}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-connect" />
                                <span>编辑连接</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog} />
                            </div>
                        </div>
                        <div className="popup-body-common">
                            <div className="error" id="edit-connect-tip"></div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>连接类型：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="form-control dialog-input"
                                        value={this.props.database.backend}
                                        onChange={argu=>argu}
                                    />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>连接名称：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="form-control dialog-input"
                                        value={this.props.database.database_name}
                                        onChange={this.handleNameChange}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea
                                        className="dialog-area"
                                        value={this.props.database.description}
                                        onChange={this.handleDescriptionChange}
                                    />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>连接串：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input" value={this.props.database.sqlalchemy_uri}
                                           onChange={this.handleURIChange}/>
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
                                        <span>{this.props.database.created_by_user}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改者：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.database.changed_by_user}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>创建日期：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.database.created_on}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改时间：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.database.changed_on}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                                disabled={!this.state.connected}
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

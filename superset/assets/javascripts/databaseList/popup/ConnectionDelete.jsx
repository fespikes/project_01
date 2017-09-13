import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Alert } from 'antd';
import { selectRows, applyDelete } from '../actions';

class ConnectionDelete extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {}
        };
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    confirm() {
        const self = this;
        const {dispatch, deleteType} = this.props;
        const callback = (success, message) => {
            if(success) {
                ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
            }else {
                self.refs.alertRef.style.display = "block";
                let exception = {};
                exception.type = "error";
                exception.message = "Error";
                exception.description = message;
                self.setState({
                    exception: exception
                });
            }
        };

        if(deleteType === "none") {
            ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
        } else {
            dispatch(applyDelete(callback));
        }
    }

    render() {
        return (
            <div
                className="popup"
                ref="popupDatabaseDelete"
                style={{display:'flex'}}
            >
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-trash" />
                                <span>删除连接</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog} />
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="warning">
                                <Alert
                                    message="Warning"
                                    description={this.props.deleteTips}
                                    type="warning"
                                    showIcon
                                />
                            </div>
                            <div className="error" ref="alertRef" style={{display: 'none'}}>
                                <Alert
                                    message={this.state.exception.message}
                                    description={this.state.exception.description}
                                    type={this.state.exception.type}
                                    closeText="close"
                                    showIcon
                                />
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}>
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

ConnectionDelete.propTypes = {};
ConnectionDelete.defaultProps = {};

export default ConnectionDelete;

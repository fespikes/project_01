import React from 'react';
import ReactDOM from 'react-dom';
import { Alert } from 'antd';
import PropTypes from 'prop-types';

import { WarningAlert } from './WarningAlert';

class ConfirmModal extends React.Component {
    constructor(props) {
        super(props);
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
    };

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    confirm() {
        if(this.props.needCallback) {
            this.props.confirmCallback();
        }
        this.closeDialog();
    }

    render() {
        const {confirmMessage} = this.props;
        return (
            <div className="popup">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dashboard-popup" />
                                <span>确认</span>
                            </div>
                            <div className="header-right">
                                <i
                                    className="icon icon-close"
                                    onClick={this.closeDialog}
                                />
                            </div>
                        </div>
                        <div className="popup-body">
                            <WarningAlert
                                message={confirmMessage}
                            />
                        </div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                            >
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default ConfirmModal;
/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchAddDashboard, setDashAddConfirmState } from '../actions';
import { Select, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import { renderAlertErrorInfo } from '../../../utils/utils';

class ImportDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedSlices: [],
            enableConfirm: false,
            exception: {}
        };
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeAlert = this.closeAlert.bind(this);

        this.handleTitleChange = this.handleTitleChange.bind(this);
    };

    closeAlert(id) {
        ReactDOM.unmountComponentAtNode(document.getElementById(id));
    }

    handleTitleChange(e) {
        this.props.dashboard.dashboard_title = e.currentTarget.value;
        let enableConfirm;
        if(!e.currentTarget.value || e.currentTarget.value.length === 0) {
            enableConfirm = false;
        }else {
            enableConfirm = true;
        }
        this.setState({
            dashboard: this.props.dashboard,
            enableConfirm: enableConfirm
        });
        this.closeAlert('add-dashboard-error-tip');
    }

    confirm() {
        const self = this;
        const { dispatch, availableSlices } = self.props;
        dispatch(fetchAddDashboard(self.state, availableSlices, callback));
        function callback(success, message) {
            if(success) {
                self.closeAlert("popup_root");
            }else {
                renderAlertErrorInfo(message, 'add-dashboard-error-tip', '100%', self);
            }
        }
    }

    render() {
        const self = this;
        const Option = Select.Option;

        return (
            <div className="popup">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-import" />
                                <span>{intl.get('DASHBOARD.IMPORT')}</span>
                            </div>
                            <div className="header-right">
                                <i
                                    className="icon icon-close"
                                    onClick={argus => this.closeAlert('popup_root')}
                                />
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>{intl.get('DASHBOARD.SELECT_FILE')}：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="tp-input dialog-input"
                                        onChange={this.handleTitleChange}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                            </div>
                        </div>
                        <div className="error" id="add-dashboard-error-tip"></div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                                disabled={!this.state.enableConfirm}
                            >{intl.get('DASHBOARD.IMPORT')}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

ImportDashboard.propTypes = propTypes;
ImportDashboard.defaultProps = defaultProps;

export default ImportDashboard;
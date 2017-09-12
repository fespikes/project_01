/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchAddDashboard, setDashAddConfirmState } from '../actions';
import { Select, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';

class DashboardAdd extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedSlices: [],
            enableConfirm: false,
            exception: {}
        };
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);

        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    };

    showDialog() {
        this.refs.popupDashboardAdd.style.display = "flex";
    }

    closeDialog() {
        this.setState({
            dashboard: {},
            selectedSlices: [],
            enableConfirm: false
        });
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    handleTitleChange(e) {
        this.props.dashboard.dashboard_title = e.currentTarget.value;
        this.setState({
            dashboard: this.props.dashboard
        });
        if(!e.currentTarget.value || e.currentTarget.value.length === 0) {
            this.setState({
                enableConfirm: false
            });
        }else {
            this.setState({
                enableConfirm: true
            });
        }
    }

    handleDescriptionChange(e) {
        this.props.dashboard.description = e.target.value;
        this.setState({
            dashboard: this.props.dashboard
        });
    }

    confirm() {
        const self = this;
        const { dispatch, availableSlices } = self.props;
        dispatch(fetchAddDashboard(self.state, availableSlices, callback));
        function callback(success, message) {
            if(success) {
                self.setState({
                    dashboard: {},
                    selectedSlices: [],
                    enableConfirm: false
                });
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
        }
    }

    render() {
        const self = this;
        const Option = Select.Option;
        const options = self.props.availableSlices.map(d => {
            return <Option key={d.slice_name}>{d.slice_name}</Option>
        });

        function onChange(value) {
            self.setState({
                selectedSlices: value
            });
        }

        return (
            <div className="popup" ref="popupDashboardAdd">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dashboard-popup" />
                                <span>添加仪表盘</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog} />
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="dialog-item">
                                <div className="item-left">
                                    <i>*</i>
                                    <span>标题：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="tp-input dialog-input"
                                        value={this.props.dashboard.dashboard_title}
                                        onChange={this.handleTitleChange}
                                    />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea
                                        className="tp-textarea dialog-area"
                                        value={this.props.dashboard.description}
                                        onChange={this.handleDescriptionChange}
                                    />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>工作表：</span>
                                </div>
                                <div className="item-right">
                                    <div id="edit_pop_select">
                                        <Select mode={'multiple'}
                                            value={self.state.selectedSlices}
                                            style={{ width: '100%' }}
                                            placeholder="select the slices..."
                                            onChange={onChange}>
                                            {options}
                                        </Select>
                                    </div>
                                    <Tooltip title="添加或移除该仪表盘包含的工作表" placement="topRight">
                                        <i className="icon icon-info after-icon" />
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>数据集：</span>
                                </div>
                                <div className="item-right">
                                    <input className="tp-input dialog-input" disabled />
                                </div>
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
                            <button className="tp-btn tp-btn-middle tp-btn-primary" onClick={this.confirm}
                                    disabled={!this.state.enableConfirm}>
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

DashboardAdd.propTypes = propTypes;
DashboardAdd.defaultProps = defaultProps;

export default DashboardAdd;
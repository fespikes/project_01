/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchAvailableSlices, fetchUpdateDashboard } from '../../../dashboard2/actions';
import { Select, Alert } from 'antd';
import PropTypes from 'prop-types';

class DashboardEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            selectedSlices: initDefaultOptions()
        };

        function initDefaultOptions() {
            let defaultOptions = [];
            props.dashboardDetail.slices.map(slice => {
                defaultOptions.push(slice.id.toString());
            });
            return defaultOptions;
        }
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);

        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    };

    showDialog() {
        this.refs.popupDashboardEdit.style.display = "flex";
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));//for resolve ant-design select component cache issue
    }

    handleTitleChange(e) {
        this.props.dashboardDetail.dashboard_title = e.currentTarget.value;
        this.setState({
            dashboardDetail: this.props.dashboardDetail
        });
    }

    handleDescriptionChange(e) {
        this.props.dashboardDetail.description = e.currentTarget.value;
        this.setState({
            dashboardDetail: this.props.dashboardDetail
        });
    }

    confirm() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(fetchUpdateDashboard(self.state, self.props.dashboardDetail, callback));
        function callback(success, message) {
            if(success) {
                self.setState({
                    selectedSlices: []
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
        const options = self.props.dashboardDetail.available_slices.map(slice => {
            return <Option key={slice.id}>{slice.slice_name}</Option>
        });
        const defaultOptions = this.state.selectedSlices;

        function onChange(value) {
            self.setState({
                selectedSlices: value
            });
        }

        return (
            <div className="popup" ref="popupDashboardEdit">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dashboard-popup"></i>
                                <span>编辑仪表盘</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="error" ref="alertRef" style={{display: 'none'}}>
                                <Alert
                                    message={this.state.exception.message}
                                    description={this.state.exception.description}
                                    type={this.state.exception.type}
                                    closeText="close"
                                    showIcon
                                />
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>标题：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input" value={this.props.dashboardDetail.dashboard_title}
                                      onChange={this.handleTitleChange} disabled={!self.props.editable}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" value={this.props.dashboardDetail.description}
                                        onChange={this.handleDescriptionChange} disabled={!self.props.editable}></textarea>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>工作表：</span>
                                </div>
                                <div className="item-right">
                                    <div id="edit_pop_select">
                                        <Select mode={'multiple'}
                                            style={{ width: '100%' }}
                                            defaultValue={defaultOptions}
                                            placeholder="select the slices..."
                                            onChange={onChange}
                                            disabled={!self.props.editable}
                                        >
                                            {options}
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>数据集：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input" value={this.props.dashboardDetail.table_names} disabled />
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button className="tp-btn tp-btn-middle tp-btn-primary" onClick={this.confirm}>
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

DashboardEdit.propTypes = propTypes;
DashboardEdit.defaultProps = defaultProps;

export default DashboardEdit;
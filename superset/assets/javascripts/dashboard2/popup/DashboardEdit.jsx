/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchAvailableSlices, fetchUpdateDashboard } from '../actions';
import { Select, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import { renderAlertErrorInfo } from '../../../utils/utils';

class DashboardEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            enableConfirm: true,
            dashboardDetail: {
                description: ''
            },
            selectedSlices: initDefaultOptions()
        };

        function initDefaultOptions() {
            let defaultOptions = [];
            props.dashboardDetail.slices.map(slice => {
                defaultOptions.push(slice.slice_name);
            });
            return defaultOptions;
        }
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeAlert = this.closeAlert.bind(this);

        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
        this.onSelectChange = this.onSelectChange.bind(this);
    };

    closeAlert(id) {
        ReactDOM.unmountComponentAtNode(document.getElementById(id));
    }

    handleTitleChange(e) {
        this.props.dashboardDetail.dashboard_title = e.currentTarget.value;
        let enableConfirm = false;
        if(e.currentTarget.value && e.currentTarget.value.length > 0) {
            enableConfirm = true;
        }
        this.setState({
            dashboardDetail: this.props.dashboardDetail,
            enableConfirm: enableConfirm
        });
        this.closeAlert('edit-dashboard-error-tip');
    }

    handleDescriptionChange(e) {
        this.props.dashboardDetail.description = e.currentTarget.value;
        this.setState({
            dashboardDetail: this.props.dashboardDetail
        });
        this.closeAlert('edit-dashboard-error-tip');
    }

    onSelectChange(value) {
        this.setState({
            selectedSlices: value
        });
        this.closeAlert('edit-dashboard-error-tip');
    }

    confirm() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(fetchUpdateDashboard(self.state, self.props.dashboardDetail, callback));
        function callback(success, message) {
            if(success) {
                self.closeAlert('popup_root');
            }else {
                renderAlertErrorInfo(message, 'edit-dashboard-error-tip', '100%', self);
            }
        }
    }

    render() {
        const self = this;
        const Option = Select.Option;
        const options = self.props.dashboardDetail.available_slices.map(slice => {
            return <Option key={slice.slice_name}>{slice.slice_name}</Option>
        });
        const defaultOptions = this.state.selectedSlices;

        return (
            <div className="popup">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dashboard-popup" />
                                <span>编辑仪表板</span>
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
                                    <i>*</i>
                                    <span>标题：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="tp-input dialog-input"
                                        value={this.props.dashboardDetail.dashboard_title}
                                        onChange={this.handleTitleChange}
                                        autoFocus
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
                                        value={this.props.dashboardDetail.description}
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
                                            style={{ width: '100%' }}
                                            defaultValue={defaultOptions}
                                            placeholder="选择工作表"
                                            onChange={this.onSelectChange}
                                        >
                                            {options}
                                        </Select>
                                    </div>
                                    <Tooltip
                                        title="添加或移除该仪表盘包含的工作表"
                                        placement="topRight"
                                    >
                                        <i className="icon icon-info after-icon" />
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>数据集：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="tp-input dialog-input"
                                        value={this.props.dashboardDetail.table_names}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="error" id="edit-dashboard-error-tip"></div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                                disabled={!this.state.enableConfirm}
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

const propTypes = {};
const defaultProps = {};

DashboardEdit.propTypes = propTypes;
DashboardEdit.defaultProps = defaultProps;

export default DashboardEdit;
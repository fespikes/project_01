/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchUpdateSlice, fetchDashboardList } from '../actions';
import { Select, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import { renderAlertErrorInfo, renderGlobalErrorMsg } from '../../../utils/utils';

class SliceEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            enableConfirm: true,
            sliceDetail: {},
            availableDashboards: [],
            selectedDashboards: initDefaultOptions()
        };

        function initDefaultOptions() {
            let defaultOptions = [];
            props.sliceDetail.dashboards.map(dashboard => {
                defaultOptions.push(dashboard.dashboard_title);
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
        this.props.sliceDetail.slice_name = e.currentTarget.value;
        let enableConfirm = false;
        if(e.currentTarget.value && e.currentTarget.value.length > 0) {
            enableConfirm = true;
        }
        this.setState({
            sliceDetail: this.props.sliceDetail,
            enableConfirm: enableConfirm
        });
        this.closeAlert('edit-slice-error-tip');
    }

    handleDescriptionChange(e) {
        this.props.sliceDetail.description = e.currentTarget.value;
        this.setState({
            sliceDetail: this.props.sliceDetail
        });
        this.closeAlert('edit-slice-error-tip');
    }

    onSelectChange(value) {
        this.setState({
            selectedDashboards: value
        });
        this.closeAlert('edit-slice-error-tip');
    }

    confirm() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(fetchUpdateSlice(self.state, self.props.sliceDetail, callback));
        function callback(success, message) {
            if(success) {
                self.closeAlert('popup_root');
            }else {
                renderAlertErrorInfo(message, 'edit-slice-error-tip', '100%', self);
            }
        }
    }

    componentDidMount() {
        const self = this;
        fetchDashboardList(callback);
        function callback(success, data) {
            if(success) {
                const availableOptions = data.data.map(dashboard => {
                    return <Option key={dashboard.dashboard_title}>
                        {dashboard.dashboard_title}</Option>
                });
                self.setState({
                    availableDashboards: availableOptions
                });
            }else {
                renderGlobalErrorMsg(data);
            }
        }
    }

    render() {
        const sliceDetail = this.props.sliceDetail;
        const {availableDashboards, selectedDashboards, enableConfirm} = this.state;

        return (
            <div className="popup">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-slice-popup" />
                                <span>编辑工作表</span>
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
                                    <span>名称：</span>
                                </div>
                                <div className="item-right">
                                    <input
                                        className="tp-input dialog-input"
                                        value={sliceDetail.slice_name}
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
                                        value={sliceDetail.description || ''}
                                        onChange={this.handleDescriptionChange}
                                    />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>仪表板：</span>
                                </div>
                                <div className="item-right">
                                    <div id="edit_pop_select">
                                        <Select mode={'multiple'}
                                            style={{ width: '100%' }}
                                            defaultValue={selectedDashboards}
                                            placeholder="选择仪表板"
                                            onChange={this.onSelectChange}
                                        >
                                            {availableDashboards}
                                        </Select>
                                    </div>
                                    <Tooltip
                                        title="添加该工作表到仪表板或从仪表板移除该工作表"
                                        placement="topRight"
                                    >
                                        <i className="icon icon-info after-icon"/>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>创建者：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{sliceDetail.created_by_user}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改者：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{sliceDetail.changed_by_user}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>创建日期：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{sliceDetail.created_on}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改时间：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{sliceDetail.changed_on}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="error" id="edit-slice-error-tip"></div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                                disabled={!enableConfirm}
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

SliceEdit.propTypes = propTypes;
SliceEdit.defaultProps = defaultProps;

export default SliceEdit;
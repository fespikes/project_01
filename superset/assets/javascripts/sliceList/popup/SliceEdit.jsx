/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchUpdateSlice } from '../actions';
import { Select, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';

class SliceEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            enableConfirm: true,
            sliceDetail: {
                description: ''
            },
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
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    };

    showDialog() {
        this.refs.popupSliceEdit.style.display = "flex";
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
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
    }

    handleDescriptionChange(e) {
        this.props.sliceDetail.description = e.currentTarget.value;
        this.setState({
            sliceDetail: this.props.sliceDetail
        });
    }

    confirm() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(fetchUpdateSlice(self.state, self.props.sliceDetail, callback));
        function callback(success, message) {
            if(success) {
                self.setState({
                    selectedDashboards: []
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
        const defaultOptions = self.state.selectedDashboards;
        const options = self.props.sliceDetail.available_dashboards.map(dashboard => {
            return <Option key={dashboard.dashboard_title}>{dashboard.dashboard_title}</Option>
        });

        function onChange(value) {
            self.setState({
                selectedDashboards: value
            });
        }

        return (
            <div className="popup" ref="popupSliceEdit" style={{display:'none'}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-slice-popup" />
                                <span>编辑工作表</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog} />
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
                                        value={this.props.sliceDetail.slice_name}
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
                                        value={this.props.sliceDetail.description}
                                        onChange={this.handleDescriptionChange}
                                    />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>仪表盘：</span>
                                </div>
                                <div className="item-right">
                                    <div id="edit_pop_select">
                                        <Select mode={'multiple'}
                                            style={{ width: '100%' }}
                                            defaultValue={defaultOptions}
                                            placeholder="select the dashboards..."
                                            onChange={onChange}
                                        >
                                            {options}
                                        </Select>
                                    </div>
                                    <Tooltip title="添加该工作表到仪表板或从仪表板移除该工作表" placement="topRight">
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
                                        <span>{this.props.sliceDetail.created_by_user}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改者：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.sliceDetail.changed_by_user}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>创建日期：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.sliceDetail.created_on}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改时间：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.sliceDetail.changed_on}</span>
                                    </div>
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

SliceEdit.propTypes = propTypes;
SliceEdit.defaultProps = defaultProps;

export default SliceEdit;
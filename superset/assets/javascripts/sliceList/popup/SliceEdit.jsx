/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchUpdateSlice } from '../actions';
import { Select, Alert } from 'antd';
import PropTypes from 'prop-types';

class SliceEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            sliceDetail: {
                description: ''
            },
            selectedDashboards: initDefaultOptions()
        };

        function initDefaultOptions() {
            let defaultOptions = [];
            props.sliceDetail.dashboards.map(dashboard => {
                defaultOptions.push(dashboard.id.toString());
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
        this.setState({
            sliceDetail: this.props.sliceDetail
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
            return <Option key={dashboard.id}>{dashboard.dashboard_title}</Option>
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
                                    <span>名称：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input" value={this.props.sliceDetail.slice_name}
                                       onChange={this.handleTitleChange}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" value={this.props.sliceDetail.description}
                                          onChange={this.handleDescriptionChange} />
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

SliceEdit.propTypes = propTypes;
SliceEdit.defaultProps = defaultProps;

export default SliceEdit;
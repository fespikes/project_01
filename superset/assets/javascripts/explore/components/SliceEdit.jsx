import $ from 'jquery';
import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { Select, Alert } from 'antd';
import { getNewSlice } from '../../../utils/common2';

const propTypes = {};

class SliceEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            exception: {},
            slice: props.slice,
            selectedDashboards: initDefaultOptions()
        };

        function initDefaultOptions() {
            let defaultOptions = [];
            props.slice.dashboards.map(dashboard => {
                defaultOptions.push(dashboard.id.toString());
            });
            return defaultOptions;
        }

        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
        this.onChange = this.onChange.bind(this);
        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    }

    handleTitleChange(e) {
        this.state.slice.slice_name = e.currentTarget.value;
        this.setState({
            slice: this.state.slice
        });
    }

    handleDescriptionChange(e) {
        this.state.slice.description = e.currentTarget.value;
        this.setState({
            slice: this.state.slice
        });
    }


    confirm() {
        const self = this;
        const newSlice = getNewSlice(self.state.slice, self.state.selectedDashboards);
        $.ajax({
            type: "POST",
            url: "/slice/edit/" + self.state.slice.id,
            contentType: 'application/json',
            data: JSON.stringify(newSlice),
            success(response) {
                response = JSON.parse(response);
                if(response.status === 200) {
                    window.location.reload();
                    ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
                }else if(response.status === 202) {
                    self.refs.alertRef.style.display = "block";
                    let exception = {};
                    exception.type = "error";
                    exception.message = "Error";
                    exception.description = response.message;
                    self.setState({
                        exception: exception
                    });
                }
            },
            error(error) {

            }
        });

    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    showDialog() {
        this.refs.popupSliceEdit.style.display = "flex";
    }

    onChange(value) {
        this.setState({
            selectedDashboards: value
        });
    }

    render() {
        const self = this;
        const Option = Select.Option;
        const defaultOptions = self.state.selectedDashboards;
        const options = self.props.slice.available_dashboards.map(dashboard => {
            return <Option key={dashboard.id}>{dashboard.dashboard_title}</Option>
        });
        return (
            <div className="popup" ref="popupSliceEdit" style={{display:'none'}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon"></i>
                                <span>工作表基本信息</span>
                            </div>
                            <div className="header-right">
                                <i className="icon" onClick={this.closeDialog}></i>
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
                                    <input className="form-control dialog-input" value={this.props.slice.slice_name}
                                           onChange={this.handleTitleChange}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" value={this.props.slice.description}
                                        onChange={this.handleDescriptionChange}></textarea>
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
                                            onChange={this.onChange}
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
                                        <span>{this.props.slice.created_by_user}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改者：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.slice.changed_by_user}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>创建日期：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.slice.created_on}</span>
                                    </div>
                                </div>
                                <div className="sub-item">
                                    <div className="item-left">
                                        <span>修改时间：</span>
                                    </div>
                                    <div className="item-right">
                                        <span>{this.props.slice.changed_on}</span>
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
        )
    }
}

SliceEdit.propTypes = propTypes;

export default SliceEdit;

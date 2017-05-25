/**
 * Created by haitao on 17-5-11.
 */
import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { fetchAvailableSlices, fetchUpdateSlice } from '../../dashboard2/actions';
import { Select } from 'antd';

const propTypes = {};
const defaultProps = {};

function getSlicesUrl(type, pageSize) {
    let url = window.location.origin + "/dashboard/listdata?page=0&page_size=" + pageSize;
    if(type === "show_favorite") {
        url += "&only_favorite=1";
    }
    return url;
}

function getBasicInfo(slice, selectedSlices, availableSlices) {
    let obj = {};
    obj.dashboard_title = slice ? slice.dashboard_title : "";
    obj.description = slice ? slice.description : "";
    obj.slices = getSelectedSlices(selectedSlices, availableSlices);
    return obj;
}

function getSelectedSlices(selectedSlices, availableSlices) {
    let array = [];
    selectedSlices.forEach(function(selected) {
        availableSlices.forEach(function(slice) {
            if(selected === slice.id.toString()) {
                array.push(slice);
            }
        });
    });
    return array;
}

class DashboardAdd extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected_slices: [],
        };
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);

        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    };

    showDialog() {
        document.getElementById("popup_dashboard_add").style.display = "flex";
    }

    closeDialog() {
        document.getElementById("popup_dashboard_add").style.display = "none";
    }

    handleTitleChange(e) {
        this.props.slice.dashboard_title = e.target.value;
        this.setState({
            slice: this.props.slice
        });
    }

    handleDescriptionChange(e) {
        this.props.slice.description = e.target.value;
        this.setState({
            slice: this.props.slice
        });
    }

    confirm() {
        const self = this;
        const { dispatch, pageSize, typeName, availableSlices } = self.props;
        let basicInfo = getBasicInfo(self.state.slice, self.state.selected_slices, availableSlices);
        let url_add = window.location.origin + "/dashboard/add";
        let url_refresh = getSlicesUrl(typeName, pageSize);
        dispatch(fetchUpdateSlice(url_add, url_refresh, basicInfo, callback));
        function callback(success) {
            if(success) {
                self.setState({
                    slice: {},
                    selected_slices: [],
                });

                document.getElementById("popup_dashboard_add").style.display = "none";
            }else {

            }
        }
    }

    componentDidMount() {

        const { dispatch } = this.props;
        const self = this;
        let url = window.location.origin + "/dashboard/addablechoices";
        dispatch(fetchAvailableSlices(url, callback));

        function callback(success, data) {
            if(success) {
                self.setState({
                    available_slices: data.data.available_slices
                });
            }else {

            }
        }
    }

    render() {
        const self = this;
        const Option = Select.Option;
        const options = self.props.availableSlices.map(s => {
            return <Option key={s.id}>{s.slice_name}</Option>
        });

        function onChange(value) {
            self.setState({
                selected_slices: value
            });
        }

        return (
            <div id="popup_dashboard_add" className="popup">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className=""></i>
                                <span>仪表盘基本信息</span>
                            </div>
                            <div className="header-right">
                                <i className="" onClick={this.closeDialog}>关闭</i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>标题：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input" value={this.props.slice.dashboard_title}
                                           onChange={this.handleTitleChange} />
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
                                    <span>工作表：</span>
                                </div>
                                <div className="item-right">
                                    <div id="edit_pop_select">
                                        <Select mode={'multiple'}
                                                value={self.state.selected_slices}
                                                style={{ width: '100%' }}
                                                placeholder="select the slices..."
                                                onChange={onChange}>
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
                                    <input className="form-control dialog-input" disabled />
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

DashboardAdd.propTypes = propTypes;
DashboardAdd.defaultProps = defaultProps;

export default DashboardAdd;
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

function getBasicInfo(slice, state) {
    let obj = {};
    obj.dashboard_title = slice.dashboard_title;
    obj.description = slice.description;
    obj.slices = getSelectedSlices(state.selected_slices, slice.available_slices);
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

class DashboardEdit extends React.Component {
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
        document.getElementById("popup_dashboard_edit").style.display = "flex";
    }

    closeDialog() {
        document.getElementById("popup_dashboard_edit").style.display = "none";
    }

    handleTitleChange(e) {
        this.props.dashboardDetail.dashboard_title = e.target.value;
        this.setState({
            dashboardDetail: this.props.dashboardDetail
        });
    }

    handleDescriptionChange(e) {
        this.props.dashboardDetail.description = e.target.value;
        this.setState({
            dashboardDetail: this.props.dashboardDetail
        });
    }

    confirm() {
        const self = this;
        const { dispatch, pageSize, typeName, dashboardDetail } = self.props;
        let basicInfo = getBasicInfo(self.props.dashboardDetail, self.state);
        let url_update = window.location.origin + "/dashboard/edit/" + dashboardDetail.id;
        let url_refresh = getSlicesUrl(typeName, pageSize);
        dispatch(fetchUpdateSlice(url_update, url_refresh, basicInfo, callback));
        function callback(success) {
            if(success) {
                self.setState({
                    selected_slices: [],
                });

                document.getElementById("popup_dashboard_edit").style.display = "none";
            }else {

            }
        }
    }

    componentDidMount() {

    }

    render() {
        const self = this;
        const Option = Select.Option;
        const options = self.props.dashboardDetail.slices.map(s => {
            return <Option key={s.id}>{s.slice_name}</Option>
        });
        var defaultOptions = [];
        self.props.dashboardDetail.slices.forEach(function(slice) {
            defaultOptions.push(slice.slice_name);
        });

        function onChange(value) {
            self.setState({
                selected_slices: value
            });
        }

        return (
            <div id="popup_dashboard_edit" className="popup">
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
                                    <input className="form-control dialog-input" value={this.props.dashboardDetail.dashboard_title}
                                      onChange={this.handleTitleChange} />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" value={this.props.dashboardDetail.description}
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
                                                style={{ width: '100%' }}
                                                defaultValue={defaultOptions}
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

DashboardEdit.propTypes = propTypes;
DashboardEdit.defaultProps = defaultProps;

export default DashboardEdit;
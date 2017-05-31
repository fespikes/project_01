/**
 * Created by haitao on 17-5-11.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { fetchAddDashboard, setDashAddConfirmState } from '../../dashboard2/actions';
import { Select } from 'antd';
import PropTypes from 'prop-types';

class DashboardAdd extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedSlices: [],
            enableConfirm: false
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
        this.setState({
            dashboard: {},
            selectedSlices: [],
            enableConfirm: false
        });
    }

    handleTitleChange(e) {
        this.props.dashboard.dashboard_title = e.target.value;
        this.setState({
            dashboard: this.props.dashboard
        });
        if(!e.target.value || e.target.value.length === 0) {
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
        function callback(success) {
            if(success) {
                self.setState({
                    dashboard: {},
                    selectedSlices: [],
                    enableConfirm: false
                });
                document.getElementById("popup_dashboard_add").style.display = "none";
            }else {

            }
        }
    }

    componentDidMount() {

    }

    render() {
        const self = this;
        const Option = Select.Option;
        const options = self.props.availableSlices.map(d => {
            return <Option key={d.id}>{d.slice_name}</Option>
        });

        function onChange(value) {
            self.setState({
                selectedSlices: value
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
                                    <input className="form-control dialog-input" value={this.props.dashboard.dashboard_title}
                                           onChange={this.handleTitleChange} />
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span>描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" value={this.props.dashboard.description}
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
                                                value={self.state.selectedSlices}
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
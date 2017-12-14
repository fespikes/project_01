import $ from 'jquery';
import React, { PropTypes } from 'react';
import ModalTrigger from '../../components/ModalTrigger';
require('react-bootstrap-table/css/react-bootstrap-table.css');
import { Select } from 'antd';

const propTypes = {
    dashboard: PropTypes.object.isRequired,
    triggerNode: PropTypes.node.isRequired,
};

class DashboardEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dashboard: {
                description: ''
            },
            enableConfirm: true,
            selectedSlices: [],
            availableSlices: [],
            slicesLoaded: false
        };

        this.editDashboard = this.editDashboard.bind(this);
        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    }

    componentDidMount() {
        const { dashboard } = this.props;
        const url = '/dashboard/show/' + dashboard.id;
        this.slicesRequest = $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                this.setState({
                    dashboard: response.data,
                    selectedSlices: initDefaultOptions(response.data.slices),
                    availableSlices: response.data.available_slices,
                    slicesLoaded: true,
                });
            },
            error: error => {
                this.errored = true;
                this.setState({
                    errorMsg: this.props.dashboard.getAjaxErrorMsg(error.message),
                });
            },
        });

        function initDefaultOptions(slices) {
            let defaultOptions = [];
            slices.map(slice => {
                defaultOptions.push(slice.slice_name);
            });
            return defaultOptions;
        }
    }

    componentWillUnmount() {
        this.slicesRequest.abort();
    }

    handleTitleChange(e) {
        this.state.dashboard.dashboard_title = e.currentTarget.value;
        let enableConfirm = false;
        if(e.currentTarget.value && e.currentTarget.value.length > 0) {
            enableConfirm = true;
        }
        this.setState({
            dashboard: this.state.dashboard,
            enableConfirm: enableConfirm
        });
    }

    handleDescriptionChange(e) {
        this.state.dashboard.description = e.currentTarget.value;
        this.setState({
            dashboard: this.state.dashboard
        });
    }

    editDashboard() {
        this.props.dashboard.editDashboard(this.state.dashboard, this.state.selectedSlices);
    }

    render() {
        const self = this;
        const hideLoad = self.state.slicesLoaded || self.errored;
        const Option = Select.Option;
        const options = self.state.availableSlices.map(slice => {
            return <Option key={slice.slice_name}>{slice.slice_name}</Option>
        });

        function onChange(value) {
            self.setState({
                selectedSlices: value
            });
        }
        const modalTitle = "编辑仪表板";
        const modalIcon = "icon icon-dashboard-popup";
        const modalContent = (
            <div>
                <img
                    src="/static/assets/images/loading.gif"
                    className={'loading ' + (hideLoad ? 'hidden' : '')}
                    alt={hideLoad ? '' : 'loading'}
                />
                <div className={this.errored ? '' : 'hidden'}>
                    {this.state.errorMsg}
                </div>
                <div className="dialog-item">
                    <div className="item-left">
                        <span>标题：</span>
                    </div>
                    <div className="item-right">
                        <input
                            className="tp-input dialog-input"
                            value={this.state.dashboard.dashboard_title}
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
                            value={this.state.dashboard.description}
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
                            <Select
                                mode={'multiple'}
                                style={{ width: '100%' }}
                                defaultValue={this.state.selectedSlices}
                                placeholder="select the slices..."
                                onChange={onChange}
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
                        <input
                            className="tp-input dialog-input"
                            value={this.state.dashboard.table_names} disabled
                        />
                    </div>
                </div>
            </div>
        );
        const modalFooter = (
            <div>
                <button
                    type="button"
                    className="tp-btn tp-btn-middle tp-btn-primary"
                    data-dismiss="modal"
                    onClick={this.editDashboard}
                    disabled={!this.state.enableConfirm}
                >
                    确定
                </button>
            </div>
        );

        return (
            <ModalTrigger
                triggerNode={this.props.triggerNode}
                className='popup-modal-edit-dashboard'
                isButton
                modalTitle={modalTitle}
                modalIcon={modalIcon}
                modalBody={modalContent}
                modalFooter={modalFooter}
            />
        );
    }
}

DashboardEdit.propTypes = propTypes;

export default DashboardEdit;

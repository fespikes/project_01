const $ = window.$ = require('jquery');

import React from 'react';
import ReactDOM from 'react-dom';
import { render } from 'react-dom';
import { Button, FormControl, FormGroup, Radio } from 'react-bootstrap';
import { getAjaxErrorMsg } from '../../modules/utils';
import { PILOT_PREFIX } from '../../../utils/utils';
import ModalTrigger from '../../components/ModalTrigger';
import Confirm from './Confirm';

const propTypes = {
    css: React.PropTypes.string,
    dashboard: React.PropTypes.object.isRequired,
    triggerNode: React.PropTypes.node.isRequired,
};

class SaveModal extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            dashboard: props.dashboard,
            css: props.css,
            saveType: 'overwrite',
            newDashName: '',
        };
        this.modal = null;
        this.handleSaveTypeChange = this.handleSaveTypeChange.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.saveDashboard = this.saveDashboard.bind(this);
    }
    handleSaveTypeChange(event) {
        this.setState({
            saveType: event.target.value,
        });
    }
    handleNameChange(event) {
        this.setState({
            newDashName: event.target.value,
            saveType: 'newDashboard',
        });
    }
    saveDashboardRequest(data, url, saveType) {
        const dashboard = this.props.dashboard;
        const saveModal = this.modal;
        $.ajax({
            type: 'POST',
            url,
            data: {
                data: JSON.stringify(data),
            },
            success(resp) {
                saveModal.close();
                dashboard.onSave();
                if (saveType === 'newDashboard') {
                    window.location = PILOT_PREFIX + 'dashboard/' + resp.id + '/';
                } else {
                    window.location.reload();
                }
            },
            error(error) {
                saveModal.close();
                const errorMsg = getAjaxErrorMsg(error);
                const confirmMessage = '仪表板保存失败' +'  '+ errorMsg;
                render(
                    <Confirm
                        confirmType='error'
                        confirmMessage={confirmMessage}
                    />,
                    document.getElementById('popup_root')
                );
            },
        });
    }
    saveDashboard(saveType, newDashboardTitle) {
        const dashboard = this.props.dashboard;
        const expandedSlices = {};
        $.each($('.slice_info'), function () {
            const widget = $(this).parents('.widget');
            const sliceDescription = widget.find('.slice_description');
            if (sliceDescription.is(':visible')) {
                expandedSlices[$(widget).attr('data-slice-id')] = true;
            }
        });
        const positions = dashboard.reactGridLayout.serialize();
        const data = {
            positions,
            css: this.state.css,
            expanded_slices: expandedSlices,
        };
        let url = null;
        if (saveType === 'overwrite') {
            url = PILOT_PREFIX + 'save_dash/' + dashboard.id + '/';
            this.saveDashboardRequest(data, url, saveType);
        } else if (saveType === 'newDashboard') {
            if (!newDashboardTitle) {
                this.modal.close();
                render(
                    <Confirm
                        confirmType='warning'
                        confirmMessage='必须为新的仪表板选择一个名字'
                    />,
                    document.getElementById('popup_root')
                );
            } else {
                data.dashboard_title = newDashboardTitle;
                url = PILOT_PREFIX + 'copy_dash/' + dashboard.id + '/';
                this.saveDashboardRequest(data, url, saveType);
            }
        }
    }
    render() {
        return (
            <ModalTrigger
                ref={(modal) => { this.modal = modal; }}
                triggerNode={this.props.triggerNode}
                isButton
                modalTitle="保存仪表板"
                modalIcon="icon icon-save"
                className="popup-modal-save-dashboard"
                modalBody={
                    <FormGroup>
                        <Radio
                            value="overwrite"
                            onChange={this.handleSaveTypeChange}
                            checked={this.state.saveType === 'overwrite'}>
                            覆盖仪表板 [{this.props.dashboard.dashboard_title}]
                        </Radio>
                        <Radio
                            value="newDashboard"
                            onChange={this.handleSaveTypeChange}
                            checked={this.state.saveType === 'newDashboard'}>
                            另存为:
                        </Radio>
                        <FormControl
                            type="text"
                            placeholder="仪表板名字"
                            onFocus={this.handleNameChange}
                            onChange={this.handleNameChange}
                        />
                    </FormGroup>
                }
                modalFooter={
                    <div>
                        <Button
                            type="button"
                            className="tp-btn tp-btn-middle tp-btn-primary"
                            data-dismiss="modal"
                            onClick={() => { this.saveDashboard(this.state.saveType, this.state.newDashName); }}
                            >
                            保存
                        </Button>
                    </div>
                }
            />
        );
    }
}
SaveModal.propTypes = propTypes;

export default SaveModal;

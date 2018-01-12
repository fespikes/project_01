import React from 'react';
import ReactDOM, {render} from 'react-dom';
import PropTypes from 'prop-types';
import {Table, Select} from 'antd';

import * as perm from '../../../perm/actions';
import {renderGlobalErrorMsg, renderAlertErrorInfo, renderAlertTip} from '../../../../utils/utils';
import {makeSelectOptions, makePermCheckboxes, makeTableColumns, makeTableDataSource} from './model';

const rootMountId = 'popup_root';
const alertMountId = 'grant-perm-error-tip';
const checkboxMountId = 'grant-perm-checkbox-container';

class PermPopup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectOptions: [],
            tableColumns: [],
            tableDataSource: [],
            permCheckboxes: [],
            selectedUser: '',
            grantedActions: []
        };
        this.grantPerm = this.grantPerm.bind(this);
        this.closeAlert = this.closeAlert.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.onSelectChange = this.onSelectChange.bind(this);
        this.revokePerm = this.revokePerm.bind(this);
    };

    closeAlert(id) {
        ReactDOM.unmountComponentAtNode(document.getElementById(id));
    }

    grantPerm() {
        const {objectType, objectName} = this.props;
        const {selectedUser, grantedActions} = this.state;
        const self = this;
        perm.grantPermission({
            username: selectedUser,
            object_type: objectType,
            object_name: objectName,
            actions: grantedActions
        }, callback);
        function callback(success, data) {
            if(success) {
                self.getPermTypes();
                self.searchPermissions();
                const response = {
                    type: 'success',
                    message: '配置权限成功！'
                };
                renderAlertTip(response, alertMountId, '100%');
            }else {
                renderAlertErrorInfo(data, alertMountId, '100%', self);
            }
        }
    }

    handleChange(e) {
        const grantedPerms = this.state.grantedActions.slice(0);
        const checkbox = e.target;
        const name = checkbox.name;
        const checked = checkbox.checked;
        const index = grantedPerms.indexOf(name);
        if(checked && index === -1) {
            grantedPerms.push(name);
        }else if(!checked && index > -1) {
            grantedPerms.splice(index, 1);
        }
        this.setState({
            grantedActions: grantedPerms
        });
    }

    onSelectChange(value) {
        this.getPermTypes();
        this.setState({
            selectedUser: value
        });
    }

    revokePerm(record) {
        const self = this;
        const {objectType, objectName} = this.props;
        perm.revokePermission({
            username: record.name,
            object_type: objectType,
            object_name: objectName,
            actions: [record.perm]
        }, callback);
        function callback(success, data) {
            if(success) {
                self.searchPermissions();
            }else {
                renderAlertErrorInfo(data, alertMountId, '100%', self);
            }
        }
    }

    getGuardianUsers() {
        const self = this;
        perm.getGuardianUsers(callback);
        function callback(success, data) {
            if(success) {
                self.setState({
                    selectOptions: makeSelectOptions(data.usernames)
                });
            }else {
                renderGlobalErrorMsg(data);
            }
        }
    }

    getPermTypes() {
        const self = this;
        perm.getPermTypes(callback);
        function callback(success, data) {
            if(success) {
                self.clearCheckboxState(data.permissions);
                self.setState({
                    grantedActions: [],
                    permCheckboxes: makePermCheckboxes(data.permissions, self)
                });
            }else {
                renderGlobalErrorMsg(data);
            }
        }
    }

    clearCheckboxState(checkboxNames) {
        const els = document.getElementsByTagName('input');
        for(let i=0; i < els.length; i++) {
            if(els[i].type === "checkbox" && checkboxNames.indexOf(els[i].name) > -1) {
                els[i].checked = false;
            }
        }
    }

    searchPermissions() {
        const self = this;
        const {objectType, objectName} = this.props;
        perm.searchPermissions({
            object_type: objectType,
            object_name: objectName
        }, callback);
        function callback(success, data) {
            if(success) {
                const tbDataSource = makeTableDataSource(data);
                const tbColumns = makeTableColumns(self);
                self.setState({
                    tableDataSource: tbDataSource,
                    tableColumns: tbColumns
                });
            }else {
                renderGlobalErrorMsg(data);
            }
        }
    }

    componentDidMount() {
        this.getGuardianUsers();
        this.getPermTypes();
        this.searchPermissions();
    }

    render() {
        const {
            selectOptions,
            tableColumns,
            tableDataSource,
            permCheckboxes,
            selectedUser,
            grantedActions
        } = this.state;
        return (
            <div className="popup">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dashboard-popup" />
                                <span>权限设置</span>
                            </div>
                            <div className="header-right">
                                <i
                                    className="icon icon-close"
                                    onClick={args => this.closeAlert(rootMountId)}
                                />
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="dialog-item">
                                <div className="item-left" style={{width: 60}}>
                                    <span>用户名</span>
                                </div>
                                <div className="item-right" style={{width: 515}}>
                                    <Select
                                        style={{width: '100%'}}
                                        placeholder="请选择"
                                        onChange={this.onSelectChange}
                                    >
                                        {selectOptions}
                                    </Select>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left" style={{width: 60}}>
                                    <span>设置权限</span>
                                </div>
                                <div
                                    id={checkboxMountId}
                                    style={{display: 'flex', justifyContent: 'space-between', width: 400}}>
                                    {permCheckboxes}
                                </div>
                            </div>
                            <div
                                className="dialog-item"
                                style={{display: 'flex',justifyContent: 'center', margin: '20 auto 10 auto'}}>
                                <button
                                    className="tp-btn tp-btn-middle tp-btn-primary"
                                    onClick={this.grantPerm}
                                    disabled={!selectedUser || grantedActions.length === 0}
                                >配置权限</button>
                            </div>
                            <div className="table-grant-perm" style={{margin: '10 20'}}>
                                <Table
                                    dataSource={tableDataSource}
                                    columns={tableColumns}
                                    pagination={false}
                                    size="small"
                                />
                            </div>
                        </div>
                        <div className="error" id={alertMountId}></div>
                    </div>
                </div>
            </div>
        );
    }
}

export default PermPopup;
import React from 'react';
import {render, ReactDOM} from 'react-dom';
import {Provider, connect} from 'react-redux';
import PropTypes from 'prop-types';
import * as actions from '../actions';
import * as utils from '../../../utils/utils';
import {DashboardEdit, DashboardDelete} from '../popup';
import {ConfirmModal, PermPopup} from '../../common/components';
import {Table, Tooltip} from 'antd';
import intl from "react-intl-universal";

class Tables extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.editDashboard = this.editDashboard.bind(this);
        this.deleteDashboard = this.deleteDashboard.bind(this);
        this.favoriteSlice = this.favoriteSlice.bind(this);
    };

    onSelectChange = (selectedRowKeys, selectedRows) => {
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.dashboard_title);
        });
        dispatch(actions.setSelectedRow(selectedRowKeys, selectedRowNames));
    };

    editDashboard(record) {
        const { dispatch } = this.props;
        dispatch(actions.fetchDashboardDetail(record.id, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <DashboardEdit
                        dispatch={dispatch}
                        dashboardDetail={data}
                    />,
                    document.getElementById('popup_root')
                );
            }else {
                utils.renderGlobalErrorMsg(data);
            }
        }
    }

    deleteDashboard(record) {

        const { dispatch } = this.props;
        dispatch(actions.fetchDashbaordDelInfo(record.id, callback));
        function callback(success, data) {
            if(success) {
                let deleteTips = data + intl.get('DASHBOARD.CONFIRM') + intl.get('DASHBOARD.DELETE')
                    + record.dashboard_title + "?";
                render(
                    <DashboardDelete
                        dispatch={dispatch}
                        deleteType={'single'}
                        deleteTips={deleteTips}
                        dashboard={record}
                    />,
                    document.getElementById('popup_root')
                );
            }else {
                utils.renderGlobalErrorMsg(data);
            }
        }
    }

    favoriteSlice(record) {
        const { dispatch } = this.props;
        dispatch(actions.fetchStateChange(record, undefined, "favorite"));
    }

    viewDashDetail(url) {
        utils.viewObjectDetail(url, callback);
        function callback(success, response) {
            if(success) {
                window.location.href = url;
            }else {
                utils.renderGlobalErrorMsg(response);
            }
        }
    }

    givePerm(record) {
        render(
            <PermPopup
                objectType={utils.OBJECT_TYPE.DASHBOARD}
                objectName={record.dashboard_title}
            />,
            document.getElementById('popup_root')
        );
    }

    render() {

        const { dashboardList, selectedRowKeys } = this.props;

        const columns = [{
            title: '',
            dataIndex: 'favorite',
            key: 'favorite',
            width: '2%',
            render: (text, record) => {
                return (
                    <i className={record.favorite ? 'icon icon-star-fav' : 'icon icon-star'}
                       onClick={() => this.favoriteSlice(record)}/>
                )
            }
        }, {
            title: intl.get('DASHBOARD.NAME'),
            dataIndex: 'dashboard_title',
            key: 'dashboard_title',
            width: '38%',
            render: (text, record) => {
                return (
                    <div className="entity-name">
                        <div
                            className="entity-title highlight text-overflow-style"
                            style={{maxWidth: 430}}
                        >
                            <a
                                href="javascript:void(0)"
                                onClick={() => this.viewDashDetail(record.url)}
                            >
                                {record.dashboard_title}
                            </a>
                        </div>
                        <div
                            className="entity-description text-overflow-style"
                            style={{maxWidth: 430}}
                        >
                            {record.description}
                        </div>
                    </div>
                )
            },
            sorter(a, b) {
                return utils.sortByInitials(a.description, b.description);
            }
        }, {
            title: intl.get('DASHBOARD.PUBLISH_STATE'),
            dataIndex: 'online',
            key: 'online',
            width: '15%',
            render: (text, record) => {
                return (
                    <span className="entity-publish">
                        {record.online ? intl.get('DASHBOARD.PUBLISHED') : intl.get('DASHBOARD.UNPUBLISHED')}
                    </span>
                )
            },
            sorter(a, b) {
                return a.online - b.online;
            }
        }, {
            title: intl.get('DASHBOARD.OWNER'),
            dataIndex: 'created_by_user',
            key: 'created_by_user',
            width: '15%',
            render: (text, record) => {
                return (
                    <div
                        className="highlight text-overflow-style"
                        style={{maxWidth: 160}}
                    >
                        {record.created_by_user}
                    </div>
                )
            },
            sorter(a, b) {
                return utils.sortByInitials(a.created_by_user, b.created_by_user);
            }
        }, {
            title: intl.get('DASHBOARD.LAST_MODIFIED_TIME'),
            dataIndex: 'changed_on',
            key: 'changed_on',
            width: '20%',
            sorter(a, b) {
                return a.changed_on - b.changed_on ? 1 : -1;
            }
        }, {
            title: intl.get('DASHBOARD.OPERATION'),
            key: 'action',
            width: '10%',
            render: (record) => {
                return (
                    <div className="icon-group">
                        <Tooltip placement="top" title={intl.get('DASHBOARD.EDIT')} arrowPointAtCenter>
                            <i
                                className="icon icon-edit"
                                style={{position: 'relative', top: 1}}
                                onClick={() => this.editDashboard(record)}
                            />
                        </Tooltip>
                        <Tooltip placement="top" title={intl.get('DASHBOARD.DELETE')} arrowPointAtCenter>
                            <i
                                className="icon icon-delete"
                                style={{margin: '0 20'}}
                                onClick={() => this.deleteDashboard(record)}
                            />
                        </Tooltip>
                        <Tooltip placement="top" title={intl.get('DASHBOARD.GRANT_PERM')} arrowPointAtCenter>
                            <i
                                className="icon icon-perm"
                                onClick={() => this.givePerm(record)}
                            />
                        </Tooltip>
                    </div>
                )
            }
        }];

        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange
        };

        return (
            <Table
                rowSelection={rowSelection}
                dataSource={dashboardList}
                columns={columns}
                pagination={false}
            />
        );
    }
}

const propTypes = {};
const defaultProps = {};

Tables.propTypes = propTypes;
Tables.defaultProps = defaultProps;

export default Tables;

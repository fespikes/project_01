import React from 'react';
import { render, ReactDOM } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchDashboardDetail, fetchAvailableSlices, fetchPosts, fetchStateChange, setSelectedRow, fetchOnOfflineInfo,
    fetchDashbaordDelInfo } from '../actions';
import { DashboardEdit, DashboardDelete } from '../popup';
import { ConfirmModal } from '../../common/components';
import { Table, message } from 'antd';
import 'antd/lib/table/style';

class Tables extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.editDashboard = this.editDashboard.bind(this);
        this.deleteDashboard = this.deleteDashboard.bind(this);
        this.publishDashboard = this.publishDashboard.bind(this);
        this.favoriteSlice = this.favoriteSlice.bind(this);
    };

    onSelectChange = (selectedRowKeys, selectedRows) => {
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.dashboard_title);
        });
        dispatch(setSelectedRow(selectedRowKeys, selectedRowNames));
    };

    editDashboard(record) {
        const { dispatch } = this.props;
        dispatch(fetchDashboardDetail(record.id, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <DashboardEdit
                        dispatch={dispatch}
                        dashboardDetail={data}
                        editable={true}
                    />,
                    document.getElementById('popup_root')
                );
            }else {
                message.error(data, 5);
            }
        }
    }

    deleteDashboard(record) {

        const { dispatch } = this.props;
        dispatch(fetchDashbaordDelInfo(record.id, callback));
        function callback(success, data) {
            if(success) {
                let deleteTips = data + "确定删除" + record.dashboard_title + "?";
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
                message.error(data, 5);
            }
        }
    }

    publishDashboard(record) {
        const { dispatch } = this.props;
        const self = this;
        dispatch(fetchOnOfflineInfo(record.id, record.online, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <ConfirmModal
                        dispatch={dispatch}
                        record={record}
                        needCallback={true}
                        confirmCallback={self.onOfflineDashboard}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }else {
                message.error(data, 5);
            }
        }
    }

    onOfflineDashboard() {
        const {dispatch, record} = this;
        dispatch(fetchStateChange(record, callback,"publish"));
        function callback(success, data) {
            if(!success) {
                render(
                    <ConfirmModal
                        needCallback={false}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }else {
                message.error(data, 5);
            }
        }
    }

    favoriteSlice(record) {
        const { dispatch } = this.props;
        dispatch(fetchStateChange(record, "favorite"));
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
            title: '名称',
            dataIndex: 'dashboard_title',
            key: 'dashboard_title',
            width: '38%',
            render: (text, record) => {
                return (
                    <div className="entity-name">
                        <div className="entity-title highlight">
                            <a href={record.url}>{record.dashboard_title}</a>
                        </div>
                        <div
                            className="entity-description"
                            style={{textOverflow:'ellipsis', whiteSpace:'nowrap', overflow:'hidden', maxWidth:'270px'}}
                        >{record.description}</div>
                    </div>
                )
            },
            sorter(a, b) {
                return a.dashboard_title.substring(0, 1).charCodeAt() - b.dashboard_title.substring(0, 1).charCodeAt();
            }
        }, {
            title: '发布状态',
            dataIndex: 'online',
            key: 'online',
            width: '15%',
            render: (text, record) => {
                return (
                    <span className="entity-publish">{record.online ? "已发布" : "未发布"}</span>
                )
            },
            sorter(a, b) {
                return a.online - b.online;
            }
        }, {
            title: '所有者',
            dataIndex: 'created_by_user',
            key: 'created_by_user',
            width: '15%',
            render: (text, record) => {
                return (
                    <span className="highlight">{record.created_by_user}</span>
                )
            },
            sorter(a, b) {
                return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
            }
        }, {
            title: '最后修改时间',
            dataIndex: 'changed_on',
            key: 'changed_on',
            width: '20%',
            sorter(a, b) {
                return a.changed_on - b.changed_on ? 1 : -1;
            }
        }, {
            title: '操作',
            key: 'action',
            width: '10%',
            render: (record) => {
                return (
                    <div className="icon-group">
                        <i className="icon icon-edit" onClick={() => this.editDashboard(record)}/>
                        <i className={record.online ? 'icon icon-online icon-line' : 'icon icon-offline icon-line'}
                           onClick={() => this.publishDashboard(record)}/>
                        <i className="icon icon-delete" onClick={() => this.deleteDashboard(record)}/>
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

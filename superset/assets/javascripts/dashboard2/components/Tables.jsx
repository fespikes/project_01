import React from 'react';
import { render, ReactDOM } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchDashboardDetail, fetchAvailableSlices, fetchPosts, fetchStateChange, setSelectedRow, fetchOfflineInfo } from '../actions';
import { DashboardEdit, DashboardDelete } from '../popup';
import { ConfirmOffline } from '../popup';
import { Table } from 'antd';
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
                let editDashboardPopup = render(
                    <DashboardEdit
                        dispatch={dispatch}
                        dashboardDetail={data}
                        editable={true}/>,
                    document.getElementById('popup_root'));
                if(editDashboardPopup) {
                    editDashboardPopup.showDialog();
                }
            }
        }
    }

    deleteDashboard(record) {
        const { dispatch } = this.props;
        const deleteTips = "确定删除" + record.dashboard_title + "?";
        let deleteDashboardPopup = render(
            <DashboardDelete
                dispatch={dispatch}
                deleteType={'single'}
                deleteTips={deleteTips}
                dashboard={record}/>,
            document.getElementById('popup_root'));
        if(deleteDashboardPopup) {
            deleteDashboardPopup.showDialog();
        }
    }

    publishDashboard(record) {
        const { dispatch } = this.props;
        const self = this;
        if(record.online) {
            dispatch(fetchOfflineInfo(record.id, callback));
            function callback(success, data) {
                if(success) {
                    render(
                        <ConfirmOffline
                            dispatch={dispatch}
                            record={record}
                            fetchOffline={self.offlineDashboard}
                            confirmMessage={data} />,
                        document.getElementById('popup_root')
                    );
                }
            }
        }else {
            dispatch(fetchStateChange(record, "publish"));
        }
    }

    offlineDashboard() {
        const {dispatch, record} = this;
        dispatch(fetchStateChange(record, "publish"));
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
            width: '5%',
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
            width: '35%',
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
                        <i className={record.online ? 'icon icon-online' : 'icon icon-offline'}
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

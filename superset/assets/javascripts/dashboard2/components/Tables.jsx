import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchDashboardDetail, fetchAvailableSlices, fetchPosts, fetchStateChange, setSelectedRow } from '../actions';
import { DashboardEdit, DashboardDelete } from '../../components/popup';
import { Table } from 'antd';
import 'antd/lib/table/style';

class Tables extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    componentDidMount() {

    }

    render() {

        const { dispatch, dashboardList } = this.props;

        function showDashboard(record) {
            dispatch(fetchDashboardDetail(record.id, callback));
            function callback(success, data) {
                if(success) {
                    var editSlicePopup = render(
                        <DashboardEdit
                            dispatch={dispatch}
                            dashboardDetail={data}
                            editable={false}/>,
                        document.getElementById('popup_root'));
                    if(editSlicePopup) {
                        editSlicePopup.showDialog();
                    }
                }
            }
        }

        function editDashboard(record) {

            dispatch(fetchDashboardDetail(record.id, callback));
            function callback(success, data) {
                if(success) {
                    var editSlicePopup = render(
                        <DashboardEdit
                            dispatch={dispatch}
                            dashboardDetail={data}
                            editable={true}/>,
                        document.getElementById('popup_root'));
                    if(editSlicePopup) {
                        editSlicePopup.showDialog();
                    }
                }
            }
        }

        function deleteDashboard(record) {

            const deleteType = "single";
            var deleteSlicePopup = render(
                <DashboardDelete
                    dispatch={dispatch}
                    deleteType={deleteType}
                    deleteTips={record.dashboard_title}
                    dashboard={record}/>,
                document.getElementById('popup_root'));
            if(deleteSlicePopup) {
                deleteSlicePopup.showDialog();
            }
        }

        function publishDashboard(record) {

            dispatch(fetchStateChange(record, "publish"));
        }

        function favoriteSlice(record) {

            dispatch(fetchStateChange(record, "favorite"));
        }

        const columns = [{
            title: '',
            dataIndex: 'favorite',
            key: 'favorite',
            width: '5%',
            render: (text, record) => {
                return (
                    <i className={record.favorite ? 'star-selected icon' : 'star icon'}
                       onClick={() => favoriteSlice(record)}></i>
                )
            }
        }, {
            title: '名称',
            dataIndex: 'dashboard_title',
            key: 'dashboard_title',
            width: '30%',
            render: (text, record) => {
                return (
                    <div className="entity-name">
                        <div className="entity-title highlight">
                            <span onClick={() => showDashboard(record)}>{record.dashboard_title}</span>
                        </div>
                        <div className="entity-description">{record.description}</div>
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
                    <span>{record.online ? "已发布" : "未发布"}</span>
                )
            },
            sorter(a, b) {
                console.log(a.online);
                console.log(b.online);
                return a.online ? 1 : 0 - b.online ? 1 : 0 > 0;
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
            width: '15%',
            sorter(a, b) {
                return a.changed_on - b.changed_on ? 1 : -1;
            }
        }, {
            title: '操作',
            key: 'action',
            width: '20%',
            render: (record) => {
                return (
                    <div className="icon-group">
                        <i className="icon" onClick={() => editDashboard(record)}></i>&nbsp;
                        <i className={record.online ? 'icon online' : 'icon offline'}
                           onClick={() => publishDashboard(record)}></i>&nbsp;
                        <i className="icon" onClick={() => deleteDashboard(record)}></i>
                    </div>
                )
            }
        }];

        const rowSelection = {
            onChange: (selectedRowKeys, selectedRows) => {
                let selectedRowNames = [];
                selectedRows.forEach(function(row) {
                    selectedRowNames.push(row.dashboard_title);
                });
                dispatch(setSelectedRow(selectedRowKeys, selectedRowNames));
            }
        };

        return (
            <div className="dashboard-table">
                <Table
                    rowSelection={rowSelection}
                    dataSource={dashboardList}
                    columns={columns}
                    pagination={false} />
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

Tables.propTypes = propTypes;
Tables.defaultProps = defaultProps;

export default Tables;

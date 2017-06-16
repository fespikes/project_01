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

        function editDashboard(record) {

            dispatch(fetchDashboardDetail(record.id, callback));
            function callback(success, data) {
                if(success) {
                    var editDashboardPopup = render(
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

        function deleteDashboard(record) {

            const deleteTips = "确定删除" + record.dashboard_title + "?";
            var deleteDashboardPopup = render(
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
                    <i className={record.favorite ? 'icon icon-star-fav' : 'icon icon-star'}
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
                            <a href={record.url}>{record.dashboard_title}</a>
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
                    <span className="entity-publish">{record.online ? "已发布" : "未发布"}</span>
                )
            },
            sorter(a, b) {
                console.log(a.online);
                console.log(b.online);
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
                        <i className="icon icon-edit" onClick={() => editDashboard(record)}></i>&nbsp;
                        <i className={record.online ? 'icon icon-online' : 'icon icon-offline'}
                           onClick={() => publishDashboard(record)}></i>&nbsp;
                        <i className="icon icon-delete" onClick={() => deleteDashboard(record)}></i>
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

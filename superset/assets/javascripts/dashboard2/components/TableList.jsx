import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchDashboardDetail, fetchAvailableSlices, fetchPosts, fetchStateChange, setSelectedRow } from '../actions';
import { DashboardEdit, DashboardDelete } from '../../components/popup';
import { Table } from 'antd';
import 'antd/lib/table/style';

class TableList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    componentDidMount() {

    }

    render() {

        const { dispatch, dataSource } = this.props;

        function editDashboard(record) {

            dispatch(fetchDashboardDetail(record.id, callback));
            function callback(success, data) {
                if(success) {
                    console.log("dashboard-data=", data);
                    var editSlicePopup = render(
                        <DashboardEdit
                            dispatch={dispatch}
                            dashboardDetail={data} />,
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
            sorter: true,
            width: '30%'
        }, {
            title: '发布状态',
            dataIndex: 'online',
            key: 'online',
            sorter: true,
            width: '15%',
            render: (text, record) => {
                return (
                    <span>{record.online ? "发布" : "未发布"}</span>
                )
            }
        }, {
            title: '所有者',
            dataIndex: 'created_by_user',
            key: 'created_by_user',
            sorter: true,
            width: '15%'
        }, {
            title: '最后修改时间',
            dataIndex: 'changed_on',
            key: 'changed_on',
            width: '15%',
            sorter(a, b) {
                return a.changed_on - b.changed_on
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
                console.log("onChange=", selectedRowKeys);
                console.log("onChange=", selectedRows);
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
                    dataSource={dataSource}
                    columns={columns}
                    pagination={false} />
            </div>
        );
    }
}

const propTypes = {
    dispatch: PropTypes.func.isRequired,
    dataSource: PropTypes.array.isRequired,
};
const defaultProps = {};

TableList.propTypes = propTypes;
TableList.defaultProps = defaultProps;

function addTableKey(tables) {
    if(tables) {
        tables.forEach(function(table) {
            table.key = table.id;
        });
    }
    return tables;
}

function mapStateToProps(state) {

    return {
        dataSource: addTableKey(state.posts.params.data) || [],
        dashboardDetail: state.details.dashboardDetail || {}
    }
}

export default connect(mapStateToProps)(TableList);
import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import { fetchDashboardDetail, fetchAvailableSlices, fetchPosts, fetchDeletes, fetchStateChange } from '../actions';
import { DashboardEdit, DashboardAdd, Confirm } from '../../components/popup';

import { Table } from 'antd';
import 'antd/dist/antd.css';

const propTypes = {
    dispatch: PropTypes.func.isRequired,
    dataSource: PropTypes.array.isRequired,
};
const defaultProps = {};

function getSlicesUrl(type, pageSize) {
    let url = window.location.origin + "/dashboard/listdata?page=0&page_size=" + pageSize;
    if(type === "show_favorite") {
        url += "&only_favorite=1";
    }
    return url;
}

class TableList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    componentDidMount() {

    }

    render() {

        const { dispatch, dataSource, typeName, pageSize } = this.props;

        function editSlice(record) {

            let url = window.location.origin + "/dashboard/show/" + record.id;
            dispatch(fetchDashboardDetail(url, callback));
            function callback(success, data) {
                if(success) {
                    var editSlicePopup = render(
                        <DashboardEdit
                            dispatch={dispatch}
                            dashboardDetail={data}
                            pageSize={pageSize}
                            typeName={typeName}/>,
                        document.getElementById('popup_root'));
                    if(editSlicePopup) {
                        editSlicePopup.showDialog();
                    }
                }
            }
        }

        function publishSlice(record) {
            let url_publish = window.location.origin + "/dashboard/release/";
            if(record.online) {
                url_publish += "offline/" + record.id;
            }else {
                url_publish += "online/" + record.id;
            }
            let url_refresh = getSlicesUrl(typeName, pageSize);
            dispatch(fetchStateChange(url_publish, url_refresh));
        }


        function deleteSlice(record) {

            var deleteSlicePopup = render(
                <Confirm
                    dispatch={dispatch}
                    slice={record}
                    pageSize={pageSize}
                    typeName={typeName}/>,
                document.getElementById('popup_root'));
            if(deleteSlicePopup) {
                deleteSlicePopup.showDialog();
            }
        }

        function favoriteSlice(record) {
            let url_favorite = window.location.origin + "/superset/favstar/Dashboard/" + record.id;
            if(record.favorite) {
                url_favorite += "/unselect";
            }else {
                url_favorite += "/select";
            }
            let url_refresh = getSlicesUrl(typeName, pageSize);
            dispatch(fetchStateChange(url_favorite, url_refresh));
        }

        const columns = [{
            title: '',
            dataIndex: 'favorite',
            key: 'favorite',
            width: '5%',
            render: (text, record) => {
                return (
                    <i className={record.favorite ? 'star-selected icon' : 'star icon'} onClick={() => favoriteSlice(record)}></i>
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
            width: '15%'
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
                        <i className="icon" onClick={() => editSlice(record)}></i>&nbsp;
                        <i className={record.online ? 'icon online' : 'icon offline'} onClick={() => publishSlice(record)}></i>&nbsp;
                        <i className="icon" onClick={() => deleteSlice(record)}></i>
                    </div>
                )
            }
        }];

        const rowSelection = {
            onChange: (selectedRowKeys, selectedRows) => {

            },
            getCheckboxProps: record => ({

            })
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
        dashboardDetail: state.detail ? state.detail.dashboardDetail : {}
    }
}

export default connect(mapStateToProps)(TableList);
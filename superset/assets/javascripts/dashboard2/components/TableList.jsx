import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import { fetchAvailableSlices, fetchPosts, fetchPuts, fetchDeletes } from '../actions';
import { DashboardEdit, SliceEdit, Confirm } from '../../components/popup';

import { Table } from 'antd';
import 'antd/dist/antd.css';

const propTypes = {
    dispatch: PropTypes.func.isRequired,
    dataSource: PropTypes.array.isRequired,
};
const defaultProps = {};

class TableList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    componentDidMount() {

    }

    render() {

        console.log("tablelist-props=", this.props);

        const { dispatch, dataSource } = this.props;

        function editSlice(record) {

            var editSlicePopup = render(<DashboardEdit dispatch={dispatch} slice={record} />,
                document.getElementById('popup_root'));
            if(editSlicePopup) {
                editSlicePopup.showDialog();
            }
        }

        function publishSlice(record) {

            let url = window.location.origin + "/dashboard/release/online/" + record.id;
            dispatch(fetchPuts(url));
        }


        function deleteSlice(record) {

            var deleteSlicePopup = render(<Confirm dispatch={dispatch}  slice={record}/>,
                document.getElementById('popup_root'));
            if(deleteSlicePopup) {
                deleteSlicePopup.showDialog();
            }
        }

        function favoriteSlice(record) {
            console.log("favorite-record=", record);
            let url = window.location.origin + "/";
        }

        const columns = [{
            title: '',
            dataIndex: 'favorite',
            key: 'favorite',
            width: '5%',
            render: (text, record) => {
                return (
                    <div>
                        <button className="btn btn-default" onClick={() => favoriteSlice(record)}>
                            收藏
                        </button>
                    </div>
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
            sorter: true,
            width: '15%'
        }, {
            title: '操作',
            key: 'action',
            width: '20%',
            render: (record) => {
                return (
                    <div>
                        <button className="btn btn-default" onClick={() => editSlice(record)}>编辑</button>&nbsp;
                        <button className="btn btn-default" onClick={() => publishSlice(record)}>发布</button>&nbsp;
                        <button className="btn btn-default" onClick={() => deleteSlice(record)}>删除</button>
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

function mapStateToProps(state) {

    return {
        dataSource: state.posts.params.data || []
    }
}

export default connect(mapStateToProps)(TableList);
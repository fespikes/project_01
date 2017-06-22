import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { selectRows } from '../actions';
import { ConnectionDelete, ConnectionEdit } from '../../components/popup';
import style from '../style/database.scss'

class SliceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        //bindings
        this.deleteConnection = this.deleteConnection.bind(this);
        this.editConnection = this.editConnection.bind(this);
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {

        //TODO: to make sure when select all of them ,this function been triggered the same
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.database_name);
        });
        dispatch(selectRows(selectedRowKeys, selectedRowNames));

    };

    editConnection(record) {//TODO:
        const { dispatch } = this.props;
        dispatch(fetchSliceDetail(record.id, callback));
        function callback(success, data) {
            if(success) {
                var editSlicePopup = render(
                    <ConnectionEdit
                        dispatch={dispatch}
                        sliceDetail={data} />,
                    document.getElementById('popup_root'));
                if(editSlicePopup) {
                    editSlicePopup.showDialog();
                }
            }
        }
    }

    //delete one of them
    deleteConnection(record) {
        const { dispatch } = this.props;
        let deleteTips = "确定删除" + record.database_name + "?";      //i18n
        let deleteConnectionPopup = render(
            <ConnectionDelete
                dispatch={dispatch}
                deleteType={'single'}
                deleteTips={deleteTips}
                connection={record}/>,
            document.getElementById('popup_root'));
        if(deleteConnectionPopup) {
            deleteConnectionPopup.showDialog();
        }
    }

    render() {
        const { data } = this.props;
        const rowSelection = {
            onChange: this.onSelectChange
        };

        const columns = [
            {
                title: '名称',  //TODO: title need to i18n
                key: 'databaseName',
                dataIndex: 'database_name',
                width: '25%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div className="entity-title">{record.database_name}</div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return a.database_name.substring(0, 1).charCodeAt() - b.database_name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '连接类型',
                dataIndex: 'backend',
                key: 'backend',
                width: '15%',
                sorter(a, b) {
                    return a.backend.substring(0, 1).charCodeAt() - b.backend.substring(0, 1).charCodeAt();
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '20%',
                sorter(a, b) {
                 return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
                }
            }, {
                title: '更新时间',
                dataIndex: 'changed_on',
                key: 'changed_on',
                width: '20%',
                sorter(a, b) {
                    return a.changed_on - b.changed_on ? 1 : -1;
                }
            }, {
                title: '操作',
                key: 'action',
                width: '15%',
                render: (record) => {
                    return (
                        <div className="icon-group">
                            <i
                                className="icon icon-edit"
                                onClick={() => this.editConnection(record)}
                            />
                            <i
                                className="icon icon-delete"
                                onClick={() => this.deleteConnection(record)}
                            />
                        </div>
                    )
                }
            }
        ];

        return (
            <Table
                rowSelection={rowSelection}
                dataSource={data}
                columns={columns}
                pagination={false}
                rowKey={record => record.id}
            />
        );
    }
}

export default SliceTable;
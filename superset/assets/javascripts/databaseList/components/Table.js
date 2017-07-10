import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { fetchDBDetail, selectRows } from '../actions';
import { ConnectionDelete, ConnectionEdit } from '../popup';
import style from '../style/database.scss'

class SliceTable extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {};
        //bindings
        this.deleteConnection = this.deleteConnection.bind(this);
        this.editConnection = this.editConnection.bind(this);

        this.dispatch = context.dispatch;
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        let selectedRowNames = [];
        let connToBeDeleted = {};
        selectedRows.map(function(row) {
            if (connToBeDeleted[row.connection_type]) {
                connToBeDeleted[row.connection_type].push(row.id);
            } else {
                connToBeDeleted[row.connection_type] = [row.id];
            }
            selectedRowNames.push(row.name);
        });
        this.dispatch(selectRows(selectedRowKeys, connToBeDeleted, selectedRowNames));

    };

    editConnection(record) {
        const dispatch = this.dispatch;
        dispatch(fetchDBDetail(record, callback));
        function callback(success, data) {
            if(success) {
                let editConnectionPopup = render(
                    <ConnectionEdit
                        dispatch={dispatch}
                        database={data} />,
                    document.getElementById('popup_root'));
                if(editConnectionPopup) {
                    editConnectionPopup.showDialog();
                }
            }
        }
    }

    //delete one of them
    deleteConnection(record) {
        const dispatch = this.dispatch;
        let deleteTips = "确定删除: " + record.name + "?";      //i18n
        let deleteConnectionPopup = render(
            <ConnectionDelete
                dispatch={dispatch}
                deleteTips={deleteTips}
                connection={record}/>,
            document.getElementById('popup_root'));
    }

    render() {
        const { data, selectedRowKeys } = this.props;
        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange
        };

        const columns = [
            {
                title: '名称',  //TODO: title need to i18n
                key: 'name',
                dataIndex: 'name',
                width: '25%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div className="entity-title">{record.name}</div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return a.name.substring(0, 1).charCodeAt() - b.name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '连接类型',
                dataIndex: 'connection_type',
                key: 'connection_type',
                width: '15%',
                sorter(a, b) {
                    return a.connection_type.substring(0, 1).charCodeAt() - b.connection_type.substring(0, 1).charCodeAt();
                }
            }, {
                title: '所有者',
                dataIndex: 'owner',
                key: 'owner',
                width: '20%',
                sorter(a, b) {
                    return a.owner.substring(0, 1).charCodeAt() - b.owner.substring(0, 1).charCodeAt();
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
                rowKey={record => record.elementId}
            />
        );
    }
}

SliceTable.contextTypes = {
    dispatch: PropTypes.func.isRequired
};

export default SliceTable;
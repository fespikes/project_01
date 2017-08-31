import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { fetchDBDetail, selectRows, fetchUpdateConnection, fetchPublishConnection, fetchOnOfflineInfo,
    fetchConnectDelInfo } from '../actions';
import { ConnectionDelete, ConnectionEdit } from '../popup';
import style from '../style/database.scss'
import { ConfirmModal } from '../../common/components';

class SliceTable extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {};
        //bindings
        this.deleteConnection = this.deleteConnection.bind(this);
        this.editConnection = this.editConnection.bind(this);
        this.publishConnection = this.publishConnection.bind(this);

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
                render(
                    <ConnectionEdit
                        dispatch={dispatch}
                        connectionType={record.connection_type}
                        connectionId={record.id}
                        database={data} />,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    publishConnection(record) {
        const dispatch = this.dispatch;
        const self = this;
        dispatch(fetchOnOfflineInfo(record.id, record.online, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <ConfirmModal
                        dispatch={dispatch}
                        record={record}
                        needCallback={true}
                        confirmCallback={self.onOfflineConnection}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    onOfflineConnection() {
        const {dispatch, record} = this;
        dispatch(fetchPublishConnection(record, callback));
        function callback(success, data) {
            if(!success) {
                render(
                    <ConfirmModal
                        needCallback={false}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    //delete one of them
    deleteConnection(record) {
        const dispatch = this.dispatch;
        dispatch(fetchConnectDelInfo(record.id, callback));
        function callback(success, data) {
            if(success) {
                let deleteTips = data;
                let connToBeDeleted = {};
                connToBeDeleted[record.connection_type] = [record.id];
                dispatch(selectRows([record.elementId], connToBeDeleted, [record.name]));

                render(
                    <ConnectionDelete
                        dispatch={dispatch}
                        deleteTips={deleteTips}
                        connection={record}/>,
                    document.getElementById('popup_root')
                );
            }else {
                message.error(data, 5);
            }
        }
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
                            <Tooltip placement="top" title="编辑" arrowPointAtCenter>
                                <i
                                    className="icon icon-edit"
                                    onClick={() => this.editConnection(record)}
                                />
                            </Tooltip>
                            <Tooltip placement="top" title="发布/下线" arrowPointAtCenter>
                                <i
                                    style={{marginLeft: 20}}
                                    className={record.online ? 'icon icon-online icon-line' : 'icon icon-offline icon-line'}
                                    onClick={() => this.publishConnection(record)}
                                />
                            </Tooltip>
                            <Tooltip placement="top" title="删除" arrowPointAtCenter>
                                <i
                                    className="icon icon-delete"
                                    onClick={() => this.deleteConnection(record)}
                                />
                            </Tooltip>
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
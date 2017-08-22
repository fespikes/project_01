import React from 'react';
import { render } from 'react-dom';
import { Link }  from 'react-router-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { selectRows, switchDatasetType, saveDatasetId, fetchPublishTable, fetchOnOfflineInfo, fetchTableDelInfo } from '../actions';
import { TableDelete } from '../popup';
import style from '../style/table.scss'
import { ConfirmModal } from '../../common/components';

class SliceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRowKeys = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.dataset_name);
            selectedRowKeys.push(row.id);
        });
        dispatch(selectRows(selectedRowKeys, selectedRowNames));
    };

    render() {

        const { dispatch, data, selectedRowKeys } = this.props;

        function editTable(record) {
            dispatch(switchDatasetType(record.dataset_type));
            dispatch(saveDatasetId(record.id));
        }

        function publishTable(record) {
            dispatch(fetchOnOfflineInfo(record.id, record.online, callback));
            function callback(success, data) {
                if(success) {
                    render(
                        <ConfirmModal
                            dispatch={dispatch}
                            record={record}
                            needCallback={true}
                            confirmCallback={onOfflineTable}
                            confirmMessage={data} />,
                        document.getElementById('popup_root')
                    );
                }
            }
        }

        function onOfflineTable() {
            const {dispatch, record} = this;
            dispatch(fetchPublishTable(record, callback));
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

        function deleteTable(record) {
            dispatch(fetchTableDelInfo(record.id, callback));
            function callback(success, data) {
                if(success) {
                    let deleteTips = data;
                    render(
                        <TableDelete
                            dispatch={dispatch}
                            deleteType={'single'}
                            deleteTips={deleteTips}
                            table={record} />,
                        document.getElementById('popup_root')
                    );
                }else {
                    message.error(data, 5);
                }
            }
        }

        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange
        };

        const columns = [
            {
                width: '5%',
                render: (text, record) => {
                    const datasetType = record.dataset_type;
                    return (
                        <i className={'icon ' + record.iconClass} />
                    )
                }
            },
            {
                title: '名称',  //TODO: title need to i18n
                key: 'datasetName',
                dataIndex: 'dataset_name',
                width: '30%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div className="entity-title highlight">
                                <a href={record.explore_url} target="_blank">{record.dataset_name}</a>
                            </div>
                            <div className="entity-description">{record.dataset_type} | {record.connection}</div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return a.dataset_name.substring(0, 1).charCodeAt() - b.dataset_name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '25%',
                sorter(a, b) {
                    return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
                }
            }, {
                title: '更新时间',
                dataIndex: 'changed_on',
                key: 'changed_on',
                width: '25%',
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
                            <Link onClick={() => editTable(record)} to={`/edit/detail/${record.dataset_type}/${record.id}`}>
                                <i className="icon icon-edit"/>
                            </Link>
                            <i
                                style={{marginLeft: 20}}
                                className={record.online ? 'icon icon-online icon-line' : 'icon icon-offline icon-line'}
                                onClick={() => publishTable(record)}
                            />
                            <i
                                className="icon icon-delete"
                                onClick={() => deleteTable(record)}
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
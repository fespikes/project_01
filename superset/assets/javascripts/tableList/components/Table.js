import React from 'react';
import {render} from 'react-dom';
import {Link}  from 'react-router-dom';
import {Table, Tooltip} from 'antd';
import PropTypes from 'prop-types';
import {
    selectRows,
    switchDatasetType,
    saveDatasetId,
    fetchTableDelInfo,
    datasetTypes,
    clearDatasetData
} from '../actions';
import {TableDelete} from '../popup';
import style from '../style/table.scss'
import {ConfirmModal, PermPopup} from '../../common/components';
import {
    sortByInitials,
    renderGlobalErrorMsg,
    viewObjectDetail,
    OBJECT_TYPE}
from '../../../utils/utils.jsx';

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

    givePerm(record) {
        render(
            <PermPopup
                objectType={OBJECT_TYPE.DATASET}
                objectName={record.dataset_name}
            />,
            document.getElementById('popup_root')
        );
    }

    viewTableDetail(url) {
        viewObjectDetail(url, callback);
        function callback(success, response) {
            if(success) {
                window.location.href = url;
            }else {
                renderGlobalErrorMsg(response);
            }
        }
    }

    render() {

        const { dispatch, data, selectedRowKeys } = this.props;

        function editTable(record) {
            dispatch(switchDatasetType(record.dataset_type));
            dispatch(saveDatasetId(record.id));
            dispatch(clearDatasetData());
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
                    renderGlobalErrorMsg(data);
                }
            }
        }

        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange
        };

        const columns = [
            {
                width: '2%',
                render: (text, record) => {
                    return (
                        <i className={'icon ' + record.iconClass} />
                    )
                }
            },
            {
                title: '名称',  //TODO: title need to i18n
                key: 'datasetName',
                dataIndex: 'dataset_name',
                width: '33%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div
                                className="entity-title highlight text-overflow-style"
                                style={{maxWidth: 370}}
                            >
                                <a
                                    href="javascript:void(0)"
                                    target="_blank"
                                    onClick={() => this.viewTableDetail(record.explore_url)}
                                >
                                    {record.dataset_name}
                                </a>
                            </div>
                            <div
                                className="entity-description text-overflow-style"
                                style={{maxWidth: 370}}
                            >
                                {record.dataset_type} | {record.connection}
                            </div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return sortByInitials(a.dataset_name, b.dataset_name);
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '25%',
                render: (text, record) => {
                    return (
                        <div
                            className="text-overflow-style"
                            style={{maxWidth: 270}}
                        >
                            {record.created_by_user}
                        </div>
                    )
                },
                sorter(a, b) {
                    return sortByInitials(a.created_by_user, b.created_by_user);
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
                            <Tooltip placement="top" title="编辑" arrowPointAtCenter>
                                <Link
                                    onClick={() => editTable(record)}
                                    to={`/edit/detail/${record.dataset_type===datasetTypes.hdfs?datasetTypes.hdfs:datasetTypes.database}/${record.id}`}
                                >
                                    <i className="icon icon-edit"/>
                                </Link>
                            </Tooltip>
                            <Tooltip placement="top" title="删除" arrowPointAtCenter>
                                <i
                                    className="icon icon-delete"
                                    style={{margin: '0 20'}}
                                    onClick={() => deleteTable(record)}
                                />
                            </Tooltip>
                            <Tooltip placement="top" title="赋权" arrowPointAtCenter>
                                <i
                                    className="icon icon-edit"
                                    onClick={() => this.givePerm(record)}
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
                rowKey={record => record.id}
            />
        );
    }
}

export default SliceTable;
import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { selectRows } from '../actions';
import { TableDelete } from '../../components/popup';
import style from '../style/table.scss'

class SliceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.dataset_name);
        });
        dispatch(selectRows(selectedRowKeys, selectedRowNames));
    };

    render() {

        const { dispatch, data } = this.props;

        function editTable(record) {
            // TODO
        }

        function deleteTable(record) {

            let deleteTips = "确定删除" + record.dataset_name+ "?";
            let deleteTablePopup = render(
                <TableDelete
                    dispatch={dispatch}
                    deleteType={'single'}
                    deleteTips={deleteTips}
                    table={record} />,
                document.getElementById('popup_root'));
            if(deleteTablePopup) {
                deleteTablePopup.showDialog();
            }
        }

        function favoriteSlice(record) {
            dispatch(fetchStateChange(record, "favorite"));
        }

        const rowSelection = {
            onChange: this.onSelectChange
        };

        const columns = [
            {
                width: '5%',
                render: (text, record) => {
                    const datasetType = record.dataset_type;
                    return (
                        <i className={'icon ' + record.iconClass}></i>
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
                            <i
                                className="icon icon-edit"
                                onClick={() => editTable(record)}
                            ></i>&nbsp;&nbsp;
                            <i
                                className="icon icon-delete"
                                onClick={() => deleteTable(record)}
                            ></i>
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
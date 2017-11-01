import React, { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';

import { Table, Input, Button, Icon, message } from 'antd';

import { TableColumnAdd, TableColumnDelete } from '../popup';
import * as actionCreators from '../actions';
const _ = require('lodash');
import {renderAlertTip, renderLoadingModal} from '../../../utils/utils';

class SubColumns extends Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.deleteTableColumn = this.deleteTableColumn.bind(this);
        this.addTableColumn = this.addTableColumn.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    componentDidMount() {
        const { datasetId, getTableColumn } = this.props;
        if (datasetId) {
            getTableColumn(datasetId);
        }
    }

    componentWillReceiveProps(nextProps) {
        const { datasetId, getTableColumn } = this.props;
        if (nextProps.datasetId !== datasetId && nextProps.datasetId) {
            getTableColumn(nextProps.datasetId);
        }
        if(nextProps.tableColumn) {
            this.setState({
                tableColumn: nextProps.tableColumn
            });
        }
    };

    onChange(id, e) {
        const target = e.currentTarget;
        const name = target.name;
        let value = target.value;
        if(target.type === 'checkbox') {
            value = target.checked;
        }

        const state = {...this.state};
        const columns = state.tableColumn;
        const tableColumn = this.updateTableColumn(
            columns,
            id, name, value
        );
        if(target.type === 'checkbox') {
            const column = this.getTableColumn(tableColumn, id);
            this.editTableColumn(column);
        }
        this.setState({
            tableColumn: tableColumn
        });
    }

    onBlur(column) {
        this.formValidate(column);
    }

    updateTableColumn(columns, id, name, value) {
        columns.map(column => {
            if(column.id === id) {
                column[name] = value;
            }
        });
        return columns;
    }

    getTableColumn(columns, id) {
        let selectedColumn = {};
        columns.map(column => {
            if(column.id === id) {
                selectedColumn = column;
            }
        });
        return selectedColumn;
    }

    formValidate(column) {
        if(!(column.column_name && column.column_name.length > 0)) {
            message.error('列名不能为空！', 5);
            return;
        }
        if(!(column.expression && column.expression.length > 0)) {
            message.error('表达式不能为空！', 5);
            return;
        }
        if(!(column.type && column.type.length > 0)) {
            message.error('类型不能为空！', 5);
            return;
        }
        if(!this.props.datasetId) {
            message.error('数据集ID不能为空！', 5);
            return;
        }
        this.editTableColumn(column);
    }

    editTableColumn(column) {
        column.dataset_id = this.props.datasetId;
        this.props.fetchTableColumnEdit(
            column,
            this.editCallback
        );
    }

    editCallback(success, message) {
        if(!success) {
            message.error(message, 5);
        }
    }

    addTableColumn () {
        const { fetchTableColumnAdd } = this.props;
        render(
            <TableColumnAdd
                title="添加列"
                datasetId={this.props.datasetId}
                fetchTableColumnAdd={fetchTableColumnAdd}
            />,
            document.getElementById('popup_root')
        );
    }

    deleteTableColumn(record) {
        const { fetchTableColumnDelete } = this.props;
        let deleteTips = "确定删除" + record.column_name + "?";
        render(
            <TableColumnDelete
                fetchTableColumnDelete={fetchTableColumnDelete}
                column={record}
                deleteTips={deleteTips}>
            </TableColumnDelete>,
            document.getElementById('popup_root')
        );
    }
 
    render() {
        const me = this;

        let data = [];

        _.forEach(me.state.tableColumn, function(item, index) {
            item.key = index;
            data.push(item);
        });

        const columns = [{
            title: '列',
            dataIndex: 'column_name',
            key: 'column_name',
            width: '15%',
            render: (text, record) => {
                return (
                    <input
                        name="column_name"
                        className="tp-input columns-input"
                        value={record.column_name}
                        onChange={(e) => this.onChange(record.id, e)}
                        onBlur={(args) => this.onBlur(record)}
                    />
                )
            }
        }, {
            title: '表达式',
            dataIndex: 'expression',
            key: 'expression',
            width: '15%',
            render: (text, record) => {
                return (
                    <input
                        name="expression"
                        className="tp-input columns-input"
                        value={record.expression}
                        onChange={(e) => this.onChange(record.id, e)}
                        onBlur={(args) => this.onBlur(record)}
                    />
                )
            }
        }, {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: '10%',
            render: (text, record) => {
                return (
                    <input
                        name="type"
                        className="tp-input columns-input"
                        value={record.type}
                        onChange={(e) => this.onChange(record.id, e)}
                        onBlur={(args) => this.onBlur(record)}
                    />
                )
            }
        }, {
            title: '可分组',
            dataIndex: 'groupAble',
            key: 'groupAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="groupby"
                        type="checkbox"
                        checked={record.groupby}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        }, {
            title: '可筛选',
            dataIndex: 'filterAble',
            key: 'filterAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="filterable"
                        type="checkbox"
                        checked={record.filterable}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        }, {
            title: '可计数',
            dataIndex: 'accountAble',
            key: 'accountAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="count_distinct"
                        type="checkbox"
                        checked={record.count_distinct}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        },{
            title: '可求和',
            dataIndex: 'sumAble',
            key: 'sumAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="sum"
                        type="checkbox"
                        checked={record.sum}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        },{
            title: '可求平均值',
            dataIndex: 'avgAble',
            key: 'avgAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="avg"
                        type="checkbox"
                        checked={record.avg}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        },{
            title: '可求最小值',
            dataIndex: 'minimumSeekAble',
            key: 'minimumSeekAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="min"
                        type="checkbox"
                        checked={record.min}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        },{
            title: '可求最大值',
            dataIndex: 'maximumSeekAble',
            key: 'maximumSeekAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="max"
                        type="checkbox"
                        checked={record.max}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        },{
            title: '可表示时间',
            dataIndex: 'timeExpressAble',
            key: 'timeExpressAble',
            width: '7%',
            className: 'checkb',
            render: (text, record) => {
                return (
                    <input
                        name="is_dttm"
                        type="checkbox"
                        checked={record.is_dttm}
                        onChange={(e) => this.onChange(record.id, e)}
                    />
                )
            }
        },{
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: '4%',
            render: (text, record, index) => {
                return (
                    <div className="icon-group" style={{display: 'flex'}}>
                        <i className="icon icon-delete"
                            onClick={() => this.deleteTableColumn(record)}
                        />
                    </div>
                )
            }
        }];

        return (
            <div className="list-table-column" style={{padding: '10px'}}>
                <div style={{width:'100%', height:'50px', textAlign:'right'}}>
                    <button
                        onClick={this.addTableColumn}
                        className='btn-blue tab-btn-ps'
                        disabled={this.props.datasetId === '' ? true : false}
                    >+&nbsp; 添加</button>
                </div>
                <Table
                    columns={columns}
                    dataSource={data}
                    size='small'
                    pagination={false}
                />
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { tabData, subDetail } = state;

    return {
        tableColumn: tabData.tableColumn.data,
        datasetId:  subDetail.datasetId
    };
}

function mapDispatchToProps(dispatch) {
    const {
        getTableColumn,
        fetchTableColumnAdd,
        fetchTableColumnDelete,
        fetchTableColumnEdit
    } = bindActionCreators(actionCreators, dispatch);

    return  {
        getTableColumn,
        fetchTableColumnAdd,
        fetchTableColumnDelete,
        fetchTableColumnEdit
    };
}


export default connect(mapStateToProps, mapDispatchToProps)(SubColumns);
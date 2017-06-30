import React, { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';

import { Table, Input, Button, Icon } from 'antd';

import { TableColumnAdd, TableColumnDelete } from '../popup';
import * as actionCreators from '../actions';
const _ = require('lodash');

class SubColumns extends Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.deleteTableColumn = this.deleteTableColumn.bind(this);
        this.editTableColumn = this.editTableColumn.bind(this);
        this.addTableColumn = this.addTableColumn.bind(this);
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
    }

    addTableColumn (argus) {
        console.log(this.props.datasetId);
        const { fetchTableColumnAdd } = this.props;
        let addTableColumnPopup = render(
            <TableColumnAdd datasetId={this.props.datasetId} fetchTableColumnAdd={fetchTableColumnAdd} />,
            document.getElementById('popup_root')
        );

        if (addTableColumnPopup) {
            addTableColumnPopup.showDialog();
        }
    }

    editTableColumn(record) {
        const { datasetId, fetchTableColumnEdit } = this.props;
        record.dataset_id = datasetId;
        let editTableColumnPopup = render(
            <TableColumnAdd
                editedColumn={record}
                datasetId={datasetId}
                fetchTableColumnEdit={fetchTableColumnEdit} />,
            document.getElementById('popup_root')
        );

        if (editTableColumnPopup) {
            editTableColumnPopup.showDialog();
        }
    }

    deleteTableColumn(record) {
        const { fetchTableColumnDelete } = this.props;
        let deleteTips = "确定删除" + record.column_name + "?";
        let deleteTableColumnPopup = render(
            <TableColumnDelete
                fetchTableColumnDelete={fetchTableColumnDelete}
                column={record}
                deleteTips={deleteTips}>
            </TableColumnDelete>,
            document.getElementById('popup_root')
        );

        if (deleteTableColumnPopup) {
            deleteTableColumnPopup.showDialog();
        }
    }
 
    render() {
        const me = this;

        let data = [];

        _.forEach(me.props.tableColumn, function(item, index) {
            item.key = index;
            data.push(item);
        });

        const columns = [{
            title: '列',
            dataIndex: 'column_name',
            key: 'column_name',
            width: '10%'
        }, {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: '10%'
        }, {
            title: '可分组',
            dataIndex: 'groupAble',
            key: 'groupAble',
            width: '8%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.groupby} readOnly />)
            }
        }, {
            title: '可筛选',
            dataIndex: 'filterAble',
            key: 'filterAble',
            width: '8%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.filterable} readOnly />)
            }
        }, {
            title: '可计数',
            dataIndex: 'accountAble',
            key: 'accountAble',
            width: '8%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.count_distinct} readOnly />)
            }
        },{
            title: '可求和',
            dataIndex: 'sumAble',
            key: 'sumAble',
            width: '8%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.sum} readOnly />)
            }
        },{
            title: '可求最小值',
            dataIndex: 'minimumSeekAble',
            key: 'minimumSeekAble',
            width: '12%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.min} readOnly />)
            }
        },{
            title: '可求最大值',
            dataIndex: 'maximumSeekAble',
            key: 'maximumSeekAble',
            width: '12%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.max} readOnly />)
            }
        },{
            title: '可表示时间',
            dataIndex: 'timeExpressAble',
            key: 'timeExpressAble',
            width: '12%',
            className: 'checkb',
            render: (text, record) => {
                return (<input type="checkbox" checked={record.is_dttm} readOnly />)
            }
        },{
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: '12%',
            render: (text, record, index) => {
                return (
                    <div className="icon-group">
                        <i className="icon edit" onClick={() => this.editTableColumn(record)}></i>&nbsp;
                        <i className="icon remove"
                            onClick={() => this.deleteTableColumn(record)}
                            style={{marginLeft:'30px'}}
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
                    >+&nbsp; 添加列表</button>
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
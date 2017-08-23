import React, { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';

import { Table, Input, Button, Icon } from 'antd';

import { SQLMetricAdd, SQLMetricDelete } from '../popup';
import * as actionCreators from '../actions';
const _ = require('lodash');
import {renderAlertTip, renderLoadingModal} from '../../../utils/utils';

class SubSqlMetric extends Component {
    
    constructor(props) {
        super(props);
        this.state = {};

        this.editMetric = this.editMetric.bind(this);
        this.addSQLMetric = this.addSQLMetric.bind(this);
        this.removeMetric = this.removeMetric.bind(this);
    }

    componentDidMount() {
        const { datasetId, getSQLMetric } = this.props;
        if (datasetId) {
            getSQLMetric(datasetId);
        }
    }

    componentWillReceiveProps(nextProps) {
        const { datasetId, getSQLMetric } = this.props;
        if (nextProps.datasetId !== datasetId && nextProps.datasetId) {
            getSQLMetric(nextProps.datasetId);
        }
    }

    addSQLMetric (argus) {
        const { datasetId, fetchSQLMetricAdd } =  this.props;
        let addSQLMetricPopup = render(
            <SQLMetricAdd datasetId={datasetId} fetchSQLMetricAdd={fetchSQLMetricAdd} />,
            document.getElementById('popup_root')
        );

        if (addSQLMetricPopup) {
            addSQLMetricPopup.showDialog();
        }
    }

    editMetric (metric) {
        const { datasetId, fetchSQLMetricEdit } =  this.props;
        metric.dataset_id = datasetId;
        let editSQLMetricPopup = render(
            <SQLMetricAdd
                datasetId={datasetId}
                editedMetric={metric}
                fetchSQLMetricEdit={fetchSQLMetricEdit} />,
            document.getElementById('popup_root')
        );

        if (editSQLMetricPopup) {
            editSQLMetricPopup.showDialog();
        }
    }

    removeMetric (metric) {
        const { fetchSQLMetricDelete } = this.props;
        let deleteTips = "确定删除" + metric.metric_name + "?";
        let deleteSQLMetricPopup = render(
            <SQLMetricDelete
                fetchSQLMetricDelete={fetchSQLMetricDelete}
                metric={metric}
                deleteTips={deleteTips}>
            </SQLMetricDelete>,
            document.getElementById('popup_root')
        );

        if (deleteSQLMetricPopup) {
            deleteSQLMetricPopup.showDialog();
        }
    }

    render() {
        const me = this;

        let data = [];
        _.forEach(me.props.sqlMetric, function(item, index) {
            item.key = index;
            data.push(item);
        });

        const columns = [{
            title: '度量',
            dataIndex: 'metric_name',
            key: 'metric_name',
            width: '25%'
        }, {
            title: '类型',
            dataIndex: 'metric_type',
            key: 'metric_type',
            width: '30%'
        }, {
            title: '表达式',
            dataIndex: 'expression',
            key: 'expression',
            width: '30%',
            className: 'checkb'
        }, {
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: '15%',
            render: (text, record, index) => {
                return (
                    <div className="icon-group" style={{display: 'flex'}}>
                        <i className="icon icon-edit" onClick={() => me.editMetric(record)}/>&nbsp;
                        <i className="icon icon-delete"
                            onClick={() => me.removeMetric(record)}
                            style={{marginLeft:'30px'}}
                        />
                    </div>
                )
            }
        }];

        return (
            <div className="sql-metric" style={{padding: '10px'}}>
                <div style={{width:'100%', height:'50px', textAlign:'right'}}>
                    <button
                        className='btn-blue tab-btn-ps'
                        onClick={me.addSQLMetric}
                        disabled={me.props.datasetId === '' ? true : false}
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
        sqlMetric: tabData.sqlMetric.data,
        datasetId: subDetail.datasetId
    };
}

function mapDispatchToProps(dispatch) {
    const {
        getSQLMetric,
        fetchSQLMetricAdd,
        fetchSQLMetricDelete,
        fetchSQLMetricEdit
    } = bindActionCreators(actionCreators, dispatch);

    return {
        getSQLMetric,
        fetchSQLMetricAdd,
        fetchSQLMetricDelete,
        fetchSQLMetricEdit
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SubSqlMetric);
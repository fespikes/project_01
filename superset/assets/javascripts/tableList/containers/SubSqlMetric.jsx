import React, { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';

import { Table, Input, Button, Icon, message, Select } from 'antd';

import { SQLMetricAdd, SQLMetricDelete } from '../popup';
import * as actionCreators from '../actions';
const _ = require('lodash');
import {renderAlertTip, renderLoadingModal} from '../../../utils/utils';
import {getMetricTypeOptions} from '../module';

class SubSqlMetric extends Component {
    
    constructor(props) {
        super(props);
        this.state = {};

        this.addSQLMetric = this.addSQLMetric.bind(this);
        this.removeMetric = this.removeMetric.bind(this);
        this.onInputChange = this.onInputChange.bind(this);
        this.onSelectChange = this.onSelectChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
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
        if(nextProps.sqlMetric) {
            this.setState({
                sqlMetric: nextProps.sqlMetric
            });
        }
    }

    addSQLMetric (argus) {
        const { datasetId, fetchSQLMetricAdd } =  this.props;
        render(
            <SQLMetricAdd
                title="添加SQL度量"
                datasetId={datasetId}
                fetchSQLMetricAdd={fetchSQLMetricAdd} />,
            document.getElementById('popup_root')
        );
    }

    removeMetric (metric) {
        const { fetchSQLMetricDelete } = this.props;
        let deleteTips = "确定删除" + metric.metric_name + "?";
        render(
            <SQLMetricDelete
                fetchSQLMetricDelete={fetchSQLMetricDelete}
                metric={metric}
                deleteTips={deleteTips}>
            </SQLMetricDelete>,
            document.getElementById('popup_root')
        );
    }

    onInputChange(id, e) {
        const target = e.currentTarget;
        const name = target.name;
        let value = target.value;

        const state = {...this.state};
        const metrics = state.sqlMetric;
        const sqlMetric = this.updateSqlMetric(
            metrics,
            id, name, value
        );
        this.setState({
            sqlMetric: sqlMetric
        });
    }

    onSelectChange(metric, value) {
        const name = 'metric_type';
        const state = {...this.state};
        const metrics = state.sqlMetric;
        const sqlMetric = this.updateSqlMetric(
            metrics,
            metric.id, name, value
        );
        this.setState({
            sqlMetric: sqlMetric
        });
        metric[name] = value;
        this.formValidate(metric);
    }

    onBlur(metric) {
        this.formValidate(metric);
    }

    updateSqlMetric(metrics, id, name, value) {
        metrics.map(metric => {
            if(metric.id === id) {
                metric[name] = value;
            }
        });
        return metrics;
    }

    formValidate(metric) {
        if(!(metric.metric_name && metric.metric_name.length > 0)) {
            message.error('度量名不能为空！', 5);
            return;
        }
        if(!(metric.metric_type && metric.metric_type.length > 0)) {
            message.error('类型不能为空！', 5);
            return;
        }
        if(!(metric.expression && metric.expression.length > 0)) {
            message.error('表达式不能为空！', 5);
            return;
        }
        if(!this.props.datasetId) {
            message.error('数据集ID不能为空！', 5);
            return;
        }else {
            metric.dataset_id = this.props.datasetId;
        }
        this.props.fetchSQLMetricEdit(metric, this.editCallback);
    }

    editCallback(success, message) {
        if(!success) {
            message.error(message, 5);
        }
    }

    render() {
        const me = this;

        let data = [];
        _.forEach(me.state.sqlMetric, function(item, index) {
            item.key = index;
            data.push(item);
        });

        const options = getMetricTypeOptions();

        const columns = [{
            title: '度量',
            dataIndex: 'metric_name',
            key: 'metric_name',
            width: '30%',
            className: 'text-column',
            render: (text, record) => {
                return (
                    <input
                        name="metric_name"
                        className="tp-input metrics-input"
                        value={record.metric_name}
                        onChange={(e) => this.onInputChange(record.id, e)}
                        onBlur={(args) => this.onBlur(record)}
                    />
                )
            }
        }, {
            title: '表达式',
            dataIndex: 'expression',
            key: 'expression',
            width: '40%',
            className: 'text-column',
            render: (text, record) => {
                return (
                    <input
                        name="expression"
                        className="tp-input metrics-input"
                        value={record.expression}
                        onChange={(e) => this.onInputChange(record.id, e)}
                        onBlur={(args) => this.onBlur(record)}
                    />
                )
            }
        }, {
            title: '类型',
            dataIndex: 'metric_type',
            key: 'metric_type',
            width: '20%',
            className: 'text-column',
            render: (text, record) => {
                return (
                    <Select
                        style={{ width: '100%' }}
                        value={record.metric_type}
                        onChange={(type) => this.onSelectChange(record, type)}
                    >
                        {options}
                    </Select>
                )
            }
        }, {
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: '10%',
            render: (text, record, index) => {
                return (
                    <div className="icon-group" style={{display: 'flex'}}>
                        <i className="icon icon-delete"
                            onClick={() => me.removeMetric(record)}
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
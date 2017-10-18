import React from 'react';
import { Alert, Button, Col, Modal } from 'react-bootstrap';

import Select from 'react-select';
import { Table } from 'reactable';
import shortid from 'shortid';
import $ from 'jquery';

import {PILOT_PREFIX} from '../../../utils/utils'

const CHART_TYPES = [
    { value: 'dist_bar', label: 'Distribution - Bar Chart', requiresTime: false },
    { value: 'pie', label: 'Pie Chart', requiresTime: false },
    { value: 'line', label: 'Time Series - Line Chart', requiresTime: true },
    { value: 'bar', label: 'Time Series - Bar Chart', requiresTime: true },
];

const propTypes = {
    onHide: React.PropTypes.func,
    query: React.PropTypes.object,
    show: React.PropTypes.bool,
};
const defaultProps = {
    show: false,
    query: {},
    onHide: () => {},
};

class VisualizeModal extends React.PureComponent {
    constructor(props) {
        super(props);
        const uniqueId = shortid.generate();
        this.state = {
            chartType: CHART_TYPES[0],
            datasourceName: uniqueId,
            columns: {},
            hints: [],
        };

        this.close = this.close.bind(this);
    }
    close() {
        this.setState({
            show: false
        });
    }
    componentDidMount() {
        this.validate();
    }
    componentWillReceiveProps(nextProps) {
        this.setStateFromProps(nextProps);
    }
    setStateFromProps(props) {
        if (
            !props.query ||
            !props.query.results ||
            !props.query.results.columns) {
            return;
        }
        const columns = {};
        props.query.results.columns.forEach((col) => {
            columns[col.name] = col;
        });
        this.setState({ columns });
    }
    validate() {

        const hints = [];
        const cols = this.mergedColumns();
        const re = /^\w+$/;
        Object.keys(cols).forEach((colName) => {
            if (!re.test(colName)) {
                hints.push(
                    <div>
                        "{colName}" is not right as a column name, please alias it
                        (as in SELECT count(*) <strong>AS my_alias</strong>) using only
                        alphanumeric characters and underscores
                    </div>);
            }
        });
        if (this.state.chartType === null) {
            hints.push('选择一个工作表类型');
        } else if (this.state.chartType.requiresTime) {
            let hasTime = false;
            for (const colName in cols) {
                const col = cols[colName];
                if (col.hasOwnProperty('is_date') && col.is_date) {
                    hasTime = true;
                }
            }
            if (!hasTime) {
                hints.push('使用工作表类型至少需要一个标记日期列');
            }
        }
        this.setState({ hints });
    }
    changeChartType(option) {
        this.setState({ chartType: option }, this.validate);
    }
    mergedColumns() {
        const columns = Object.assign({}, this.state.columns);
        if (this.props.query && this.props.query.results.columns) {
            this.props.query.results.columns.forEach((col) => {
                if (columns[col.name] === undefined) {
                    columns[col.name] = col;
                }
            });
        }
        return columns;
    }
    visualize() {
        const vizOptions = {
            chartType: this.state.chartType.value,
            datasourceName: this.state.datasourceName,
            columns: this.state.columns,
            sql: this.props.query.sql,
            dbId: this.props.query.dbId,
        };
        const self = this;
        $.ajax({
            type: 'POST',
            url: PILOT_PREFIX + 'sqllab_viz/',
            async: false,
            data: {
                data: JSON.stringify(vizOptions),
            },
            success: (url) => {
                self.props.onHide();
                window.open(url);
            },
        });
    }
    changeDatasourceName(event) {
        this.setState({ datasourceName: event.target.value });
        this.validate();
    }
    changeCheckbox(attr, columnName, event) {
        let columns = this.mergedColumns();
        const column = Object.assign({}, columns[columnName], { [attr]: event.target.checked });
        columns = Object.assign({}, columns, { [columnName]: column });
        this.setState({ columns }, this.validate);
    }
    changeAggFunction(columnName, option) {
        let columns = this.mergedColumns();
        const val = (option) ? option.value : null;
        const column = Object.assign({}, columns[columnName], { agg: val });
        columns = Object.assign({}, columns, { [columnName]: column });
        this.setState({ columns }, this.validate);
    }
    render() {
        if (!(this.props.query) || !(this.props.query.results) || !(this.props.query.results.columns)) {
            return (
                <div className="VisualizeModal">
                    <Modal show={this.props.show} onHide={this.props.onHide}>
                        <Modal.Body>
                            本次查询没有合适的结果
                        </Modal.Body>
                    </Modal>
                </div>
            );
        }
        const tableData = this.props.query.results.columns.map((col) => ({
            列: col.name,
            维度: (
                <input
                    type="checkbox"
                    onChange={this.changeCheckbox.bind(this, 'is_dim', col.name)}
                    checked={(this.state.columns[col.name]) ? this.state.columns[col.name].is_dim : false}
                    className="form-control"
                />
            ),
            日期: (
                <input
                    type="checkbox"
                    className="form-control"
                    onChange={this.changeCheckbox.bind(this, 'is_date', col.name)}
                    checked={(this.state.columns[col.name]) ? this.state.columns[col.name].is_date : false}
                />
            ),
            聚合函数: (
                <Select
                    options={[
                        { value: 'sum', label: 'SUM(x)' },
                        { value: 'min', label: 'MIN(x)' },
                        { value: 'max', label: 'MAX(x)' },
                        { value: 'avg', label: 'AVG(x)' },
                        { value: 'count_distinct', label: 'COUNT(DISTINCT x)' },
                    ]}
                    onChange={this.changeAggFunction.bind(this, col.name)}
                    value={(this.state.columns[col.name]) ? this.state.columns[col.name].agg : null}
                />
            ),
        }));
        const alerts = this.state.hints.map((hint, i) => (
            <Alert bsStyle="warning" key={i}>{hint}</Alert>
        ));
        const modal = (
            <div className="VisualizeModal">
                <Modal show={this.props.show} >
                    <Modal.Header>
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-plus"/>
                                <span>创建工作表</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.props.onHide}/>
                            </div>
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        {alerts}
                        <div className="row">
                            <Col md={6}>
                                工作表类型
                                <Select
                                    name="select-chart-type"
                                    placeholder="[Chart Type]"
                                    options={CHART_TYPES}
                                    value={(this.state.chartType) ? this.state.chartType.value : null}
                                    autosize={false}
                                    onChange={this.changeChartType.bind(this)}
                                />
                            </Col>
                            <Col md={6}>
                                数据集名字
                                <input
                                    type="text"
                                    className="form-control input-sm"
                                    placeholder="datasource name"
                                    onChange={this.changeDatasourceName.bind(this)}
                                    value={this.state.datasourceName}
                                />
                            </Col>
                        </div>
                        <hr />
                        <Table
                            className="table table-condensed"
                            columns={['列', '维度', '日期', '聚合函数']}
                            data={tableData}
                        />
                        <div style={{textAlign: 'center'}}>
                            <button
                                onClick={this.visualize.bind(this)}
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                disabled={(this.state.hints.length > 0)}
                            >
                                <span style={{color: '#fff'}}>创建</span>
                            </button>
                        </div>
                    </Modal.Body>
                </Modal>
            </div>
        );
        return modal;
    }
}
VisualizeModal.propTypes = propTypes;
VisualizeModal.defaultProps = defaultProps;

export default VisualizeModal;

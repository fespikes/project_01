import React from 'react';
import ReactDOM from 'react-dom';
import { Select, Checkbox, Tooltip } from 'antd';
import PropTypes from 'prop-types';
const _ = require('lodash');

class TableColumnAdd extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            enableConfirm: false,
            tableColumn: {
                column_name: '',
                filterable: false,
                count_distinct: false,
                expression: '',
                max: false,
                sum: false,
                groupby: false,
                dataset_id: '',
                is_dttm: false,
                min: false
            }
        };

        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);

        this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    };

    componentDidMount() {
        let data = {
            tableColumn: this.state.tableColumn
        };

        // 编辑
        if (this.props.editedColumn) {
            data.tableColumn = this.props.editedColumn;
        }
        else {
            data.tableColumn.dataset_id = this.props.datasetId;
        }

        this.setState(data);
    }

    showDialog() {
        this.refs.popupTableColumnAdd.style.display = "flex";
    }

    closeDialog() {
        this.setState({
            tableColumn: {},
            enableConfirm: false
        });
        this.refs.popupTableColumnAdd.style.display = "none";
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    handleCheckboxChange(e) {
        let data = {
            tableColumn: this.state.tableColumn
        };
        data.tableColumn[e.target.name] = e.target.checked;
        this.setState(data);
    }

    handleInputChange(e) {
        let data = {
            tableColumn: this.state.tableColumn
        };
        data.tableColumn[e.target.name] = e.target.value;
        this.setState(data);
        this.formValidate();
    }

    formValidate () {
        const tc = this.state.tableColumn;
        if (tc.column_name && tc.expression && tc.dataset_id) {
            this.setState({
                enableConfirm: true
            });
        }
        else {
            this.setState({
                enableConfirm: false
            });
        }
    }

    confirm() {
        const self = this;
        const { fetchTableColumnAdd, fetchTableColumnEdit } = self.props;
        if (fetchTableColumnAdd) {
            fetchTableColumnAdd(self.state.tableColumn, callback);
        }
        else {
            fetchTableColumnEdit(self.state.tableColumn, callback);
        }
        
        function callback(success) {
            if(success) {
                self.setState({
                    tableColumn: {},
                    enableConfirm: false
                });
                self.refs.popupTableColumnAdd.style.display = "none";
                ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
            }else {

            }
        }
    }

    render() {

        const CheckboxGroup = Checkbox.Group;
        const checkboxOptions = [
            {
                label: '可分组',
                value: 'groupby'
            },
            {
                label: '可筛选',
                value: 'filterable'
            },
            {
                label: '可计数',
                value: 'count_distinct'
            },
            {
                label: '可求和',
                value: 'sum'
            },
            {
                label: '可求最小值',
                value: 'min'
            },
            {
                label: '可求最大值',
                value: 'max'
            }
        ];
        const column = this.state.tableColumn;

        const {
            groupby,
            filterable,
            count_distinct,
            sum,
            min,
            max,
            is_dttm
        } = column;

        return (
            <div className="popup" ref="popupTableColumnAdd">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dataset"></i>
                                <span className="item-label">Add Table Column</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">列：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input dialog-input-sm" name="column_name" value={column.column_name} onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" name="description" value={column.description} onChange={this.handleInputChange}></textarea>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left"></div>
                                <div className="item-right">
                                    <Checkbox name="groupby" checked={groupby} onChange={this.handleCheckboxChange}>可分组</Checkbox>
                                    <Checkbox name="filterable" checked={filterable} onChange={this.handleCheckboxChange}>可筛选</Checkbox>
                                    <Checkbox name="count_distinct" checked={count_distinct} onChange={this.handleCheckboxChange}>可计数</Checkbox>
                                    <Checkbox name="sum" checked={sum} onChange={this.handleCheckboxChange}>可求和</Checkbox>
                                    <Checkbox name="min" checked={min} onChange={this.handleCheckboxChange}>可求最小值</Checkbox>
                                    <Checkbox name="max" checked={max} onChange={this.handleCheckboxChange}>可求最大值</Checkbox>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">表达式：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" name="expression" value={column.expression} onChange={this.handleInputChange}></textarea>
                                    <Tooltip placement="top" title="表达式">
                                        <i className="icon icon-info after-textarea-icon"></i>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">可表示时间：</span>
                                </div>
                                <div className="item-right space-between">
                                    <span style={{color: '#1d2531'}}>是否将此列作为（时间粒度）选项，列中的数据类型必须是DATETIME</span><Checkbox name="is_dttm" checked={is_dttm} onChange={this.handleCheckboxChange}></Checkbox>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button className="tp-btn tp-btn-middle tp-btn-primary" onClick={this.confirm}
                                    disabled={!this.state.enableConfirm}>
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

TableColumnAdd.propTypes = propTypes;
TableColumnAdd.defaultProps = defaultProps;

export default TableColumnAdd;
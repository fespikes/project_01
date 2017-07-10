import React from 'react';
import ReactDOM from 'react-dom';
import { Select, Checkbox, Tooltip } from 'antd';
import PropTypes from 'prop-types';

class SQLMetricAdd extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            enableConfirm: false,
            metric: {
                metric_name: "",
                expression: "",
                metric_type: "",
                dataset_id: "",
                description: ""
            }
        };
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    };

    componentDidMount() {
        let data = {
            metric: this.state.metric
        };
        
        if (this.props.editedMetric) {
            data.metric = this.props.editedMetric;
        }
        else {
            data.metric.dataset_id = this.props.datasetId;
        }

        this.setState(data);
    }

    showDialog() {
        this.refs.popupSQLMetricAdd.style.display = "flex";
    }

    closeDialog() {
        this.setState({
            metric: {},
            enableConfirm: false
        });
        this.refs.popupSQLMetricAdd.style.display = "none";
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }


    confirm() {
        const self = this;
        const { fetchSQLMetricAdd, fetchSQLMetricEdit } = self.props;
        if (fetchSQLMetricAdd) {
            fetchSQLMetricAdd(self.state.metric, callback);
        }
        else {
            fetchSQLMetricEdit(self.state.metric, callback);
        }

        function callback(success) {
            if(success) {
                self.setState({
                    metric: {},
                    enableConfirm: false
                });
                self.refs.popupSQLMetricAdd.style.display = "none";
                ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
            }else {

            }
        }
    }

    handleInputChange(e) {
        let data = {
            metric: this.state.metric
        };
        data.metric[e.target.name] = e.target.value;
        this.setState(data);
        this.formValidate();
    }

    formValidate() {
        const mt = this.state.metric;
        if (mt.metric_name && mt.expression && mt.dataset_id && mt.metric_type) {
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

    render() {

        const metric = this.state.metric;

        return (
            <div className="popup" ref="popupSQLMetricAdd">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-dataset"></i>
                                <span className="item-label">添加SQL度量</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">度量：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input dialog-input-sm" value={metric.metric_name} name="metric_name" onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">描述：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" name="description" value={metric.description} onChange={this.handleInputChange}></textarea>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">类型：</span>
                                </div>
                                <div className="item-right">
                                    <input className="form-control dialog-input" name="metric_type" value={metric.metric_type} onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <div className="dialog-item">
                                <div className="item-left">
                                    <span className="item-label">表达式：</span>
                                </div>
                                <div className="item-right">
                                    <textarea className="dialog-area" name="expression" value={metric.expression} onChange={this.handleInputChange}></textarea>
                                    <Tooltip placement="top" title="表达式">
                                        <i className="icon icon-info after-textarea-icon"></i>
                                    </Tooltip>
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

SQLMetricAdd.propTypes = propTypes;
SQLMetricAdd.defaultProps = defaultProps;

export default SQLMetricAdd;
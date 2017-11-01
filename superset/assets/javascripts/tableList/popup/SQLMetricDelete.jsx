import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Alert } from 'antd';

class SQLMetricDelete extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
    };

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    confirm() {
        const self = this;
        const { fetchSQLMetricDelete, metric } = self.props;
        fetchSQLMetricDelete(metric.id, callback);

        function callback(success) {
            if(success) {
                self.closeDialog();
            }else {

            }
        }
    }

    render() {
        return (
            <div className="popup" ref="popupSQLMetricDelete">
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-trash"/>
                                <span>Delete SQLMetric</span>
                            </div>
                            <div className="header-right">
                                <i
                                    className="icon icon-close"
                                    onClick={this.closeDialog}
                                />
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="warning">
                                <Alert
                                    message="Warning"
                                    description={this.props.deleteTips}
                                    type="warning"
                                    showIcon
                                />
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.confirm}
                            >
                                确定
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

SQLMetricDelete.propTypes = propTypes;
SQLMetricDelete.defaultProps = defaultProps;

export default SQLMetricDelete;

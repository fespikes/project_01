import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { fetchPosts, fetchDashboardDelete, fetchDashboardDeleteMul } from '../../../dashboard2/actions';

class DashboardDelete extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
    };

    showDialog() {

        this.refs.popupDashboardDelete.style.display = "flex";
    }

    closeDialog() {

        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    confirm() {
        const self = this;
        const { dispatch, dashboard, deleteType } = self.props;
        if(deleteType === "single") {
            dispatch(fetchDashboardDelete(dashboard.id, callback));
        }else if(deleteType === "multiple") {
            dispatch(fetchDashboardDeleteMul(callback));
        }else if(deleteType === "none") {
            ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
        }

        function callback(success) {
            if(success) {
                ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
            }else {

            }
        }
    }

    render() {
        return (
            <div className="popup" ref="popupDashboardDelete">
                <div className="popup-dialog popup-sm">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon"></i>
                                <span>删除仪表板</span>
                            </div>
                            <div className="header-right">
                                <i className="icon" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div>{this.props.deleteTips}</div>
                        </div>
                        <div className="popup-footer">
                            <button className="tp-btn tp-btn-middle tp-btn-primary" onClick={this.confirm}>
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

DashboardDelete.propTypes = propTypes;
DashboardDelete.defaultProps = defaultProps;

export default DashboardDelete;

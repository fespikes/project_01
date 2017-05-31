import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import PropTypes from 'prop-types';
import { fetchPosts, fetchDashboardDelete, fetchDashboardDeleteMul } from '../../dashboard2/actions';

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

        document.getElementById("popup_confirm").style.display = "flex";
    }

    closeDialog() {

        document.getElementById("popup_confirm").style.display = "none";
    }

    confirm() {

        const { dispatch, dashboard, deleteType } = this.props;
        if(deleteType === "single") {
            dispatch(fetchDashboardDelete(dashboard.id, callback));
        }else if(deleteType === "multiple") {
            dispatch(fetchDashboardDeleteMul(callback));
        }


        function callback(success) {
            if(success) {
                document.getElementById("popup_confirm").style.display = "none";
            }else {

            }
        }
    }

    componentDidMount() {

    }

    render() {
        return (
            <div id="popup_confirm" className="popup" style={{display:'none'}}>
                <div className="popup-dialog popup-sm">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className=""></i>
                                <span>删除仪表板</span>
                            </div>
                            <div className="header-right">
                                <i className="" onClick={this.closeDialog}>关闭</i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div>确定删除{this.props.deleteTips}?</div>
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

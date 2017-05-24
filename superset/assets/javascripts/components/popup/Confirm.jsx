import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import { fetchPosts, fetchPuts, fetchDeletes } from '../../dashboard2/actions';

const propTypes = {
    dispatch: PropTypes.func.isRequired,
};
const defaultProps = {};

class Confirm extends React.Component {
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

        const { dispatch } = this.props;
        let url = window.location.origin + "/dashboard/delete/" + this.props.slice.id;
        dispatch(fetchDeletes(url, callback));

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
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon"></i>
                                <span>工作表基本信息</span>
                            </div>
                            <div className="header-right">
                                <i className="glyphicon glyphicon-remove" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div>确定删除{this.props.slice.dashboard_title}?</div>
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

Confirm.propTypes = propTypes;
Confirm.defaultProps = defaultProps;

export default Confirm;

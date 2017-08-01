import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Alert } from 'antd';
import { fetchLists, fetchSliceDelete, fetchSliceDeleteMul } from '../actions';

class PopupDelete extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
    };

    showDialog() {

        this.refs.popupSliceDelete.style.display = "flex";
    }

    closeDialog() {
        ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
    }

    confirm() {
        const self = this;
        const { dispatch, slice, deleteType } = self.props;
        if(deleteType === "single") {
            dispatch(fetchSliceDelete(slice.id, callback));
        }else if(deleteType === "multiple") {
            dispatch(fetchSliceDeleteMul(callback));
        }else if(deleteType === "none") {
            ReactDOM.unmountComponentAtNode(document.getElementById("popup_root"));
        } else {
            dispatch(fetchSliceDeleteMul(callback));
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
            <div className="popup" ref="popupSliceDelete">
                <div className="popup-dialog popup-sm">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon icon-trash" />
                                <span>删除HDFS连接</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog} />
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

PopupDelete.propTypes = propTypes;
PopupDelete.defaultProps = defaultProps;

export default PopupDelete;

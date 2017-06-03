import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { fetchLists, fetchSliceDelete, fetchSliceDeleteMul } from '../../../sliceList/actions';

class SliceDelete extends React.Component {
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

        this.refs.popupSliceDelete.style.display = "none";
    }

    confirm() {
        const self = this;
        const { dispatch, slice, deleteType } = self.props;
        if(deleteType === "single") {
            dispatch(fetchSliceDelete(slice.id, callback));
        }else if(deleteType === "multiple") {
            dispatch(fetchSliceDeleteMul(callback));
        }else if(deleteType === "none") {
            self.refs.popupSliceDelete.style.display = "none";
        }

        function callback(success) {
            if(success) {
                self.refs.popupSliceDelete.style.display = "none";
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

SliceDelete.propTypes = propTypes;
SliceDelete.defaultProps = defaultProps;

export default SliceDelete;

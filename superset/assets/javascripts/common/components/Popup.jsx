import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';

class Popup extends React.Component {
    constructor (props, context) {

        console.log('context:', context);

        super(props);
        this.state = {};
        this.dispatch = context.dispatch;

        this.confirm = this.confirm.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.showDialog = this.showDialog.bind(this);
    };

    showDialog () {
        this.refs.popupContainer.style.display = "flex";
        //this.props.showDialog();
    }

    closeDialog () {
        this.refs.popupContainer.style.display = "none";
        //this.props.closeDialog();
    }

    confirm () {
        const me = this;
        function callback(success, msg) {
            if(success) {
                me.refs.popupContainer.style.display = "none";
            }else {
                me.props.setPopupParam({
                    deleteTips: msg
                })
                //to make sure the error tips
            }
        }
        me.props.confirm(callback);
    }

    render () {
        //dialogType:
        //title: 删除数据库连接
        /*
        const {title, deleteTips, confirm, closeDialog, showDialog,
            setPopupParam, setPopupTitle } = this.props;
        */

        const {
            title, deleteTips, confirm, closeDialog, showDialog,
            setPopupParam
        } = this.props;

        /*setPopupParam({
            popupContainer: 'popup'
        });
        */

        console.log('render popup');

        return (
            <div className="popup" ref="popupContainer" style={{display: 'none'}}>
                <div className="popup-dialog popup-sm">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className="icon"></i>
                                <span>{title}</span>
                            </div>
                            <div className="header-right">
                                <i className="icon" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div>{deleteTips}</div>
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
const defaultProps = {
    dialogType: 'database'
};

Popup.propTypes = propTypes;
Popup.defaultProps = defaultProps;
Popup.contextTypes = {
    dispatch: PropTypes.func.isRequired
};
export default Popup;

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Tooltip, Alert } from 'antd';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux';

import {Select} from './';
import {setPopupParam } from '../actions'

import PropTypes from 'prop-types';
import './popup.scss';

class Popup extends React.Component {
    constructor (props, context) {
        super(props);

        this.dispatch = context.dispatch;

        this.closeDialog = this.closeDialog.bind(this);
    }

    componentDidMount () {
    }

    closeDialog () {
        this.props.popupChangeStatus('none');
    }

    render () {
        const me = this;

        const {
            closeDialog,          //'inceptor', //uploadFile HDFS inceptor
            setPopupParam,
            status,
            response,

            submit
        } = this.props;

        const setPopupState = (obj) => {
            submit({connectionID: obj.key});
            me.closeDialog();
        }

        return (
            <div className="popup" ref="popupContainer" style={{display: status}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className={'icon '}></i>
                                <span>select connection</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">
                            <div className="add-connection">
                                <div className="data-detail-border">
                                    <label className="data-detail-item">
                                        <span>选择连接：</span>
                                        <Select
                                            ref="databaseId"
                                            options={response.data||[]}
                                            width={420}
                                            handleSelect={(argus)=>setPopupState(argus)}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer"> </div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = function (state, props) {
    return {
        popupParam: state.popupParam
    }
}

const mapDispatchToProps = function (dispatch, props) {
    return bindActionCreators({setPopupParam}, dispatch);
}

Popup.propTypes = {};
Popup.defaultProps = {};
Popup.contextTypes = {
    dispatch: PropTypes.func.isRequired
};
export default connect(mapStateToProps, mapDispatchToProps)(Popup);
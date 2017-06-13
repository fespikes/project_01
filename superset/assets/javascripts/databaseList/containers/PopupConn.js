import React from 'react';
import { connect } from 'react-redux';
import { render } from 'react-dom';
import { Select } from 'antd';

import PropTypes from 'prop-types';
import { setPopupParam } from '../actions';

import Popup from '../../common/components/Popup';

const mapStateToProps = (state) => {
    const { title, deleteTips, confirm, closeDialog, showDialog  } = state;
    return {
        title, deleteTips, confirm, closeDialog, showDialog
    };
}

const mapDispatchToProps = (dispatch) => {
    return {
    //TODO: is it necessary?
        setPopupParam: (param) => {
            dispatch(setPopupParam(param));
        },
        setPopupTitle: (title) => {
            dispatch(setPopupTitle(title));
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Popup);
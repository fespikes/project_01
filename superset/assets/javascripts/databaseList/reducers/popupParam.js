import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';

export default function popupParam(state = {
    popupContainer: '',

    //param:
    title: '删除数据库连接',
    deleteTips: '',
    deleteType: '',

    //callback
    confirm: function () {},
    closeDialog: function () {},
    showDialog: function () {}
    //TODO:
}, action) {
    switch (action.type) {
        case actionTypes.setPopupTitle:
            return {...state, title: action.title};
            break;
        case actionTypes.setPopupParam:
            return {...state, ...action.param};
            break;
        default:
            return state;
    }
}

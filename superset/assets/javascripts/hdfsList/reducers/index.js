import { combineReducers } from 'redux';
import { actionTypes, popupActions, popupNormalActions } from '../actions';

function condition(state = {
    page:0,
    pageSize:10,
    //order_column,：取值：'name','online','changed_on','connection_type', 'owner';默认：'changed_on'.
    //order_direction: 取值：'desc' or 'asc', 默认：'desc'
    filter: '',

    selectedRowKeys: [],
    selectedRowNames: [],

//    breadCrumbText: '',
    connectionID: '',

    manipulate: '',
    upload: ''
}, action) {
    switch (action.type) {
        case actionTypes.fetchConnections:
            return {...state, page: action.pageNumber};
            break;
        case actionTypes.receiveData:
            return {...state, connectionID: action.condition.connectionID};
            break;
        case actionTypes.search:
            return {...state, filter: action.filter};
            break;
        case actionTypes.setSelectedRows:
            return {
                ...state,
                selectedRowKeys: action.selectedRowKeys,
                selectedRowNames: action.selectedRowNames
            };
            break;
        default:
            return state;
    }
}

function popupParam (state={
    //popup callbacks
    submit: argu=>argu,
    closeDialog: argu=>argu,

    status: 'flex',//flex, none
    response: [],
    showAlert: false

}, action) {
    switch (action.type) {
        case popupActions.popupChangeStatus:
            return {...state, status:action.status};
        case popupActions.setPopupParam:
            return {...state, response:action.response, status: action.status};
            break;
        default:
            return state;
    }
}

//used only in operation bar
function popupNormalParam (state={
    //popup callbacks
    submit: argu=>argu,
    closeDialog: argu=>argu,

    status: 'none',//flex, none
    showAlert: false,
    popupType: 'mkdir',

    path: '',
    dirName: '',
    connectionID: ''

}, action) {
    switch (action.type) {
        case popupNormalActions.popupChangeStatus:
            return {...state, status:action.status};
        case popupNormalActions.setPopupParam:
            return {
                ...state,
                path: action.path,
                dirName: action.dirName,
                connectionID: action.connectionID,
                popupType: action.popupType,
                submit:action.submit,
                status: action.status
            };
            break;
        default:
            return state;
    }
}

function emitFetch(state = {
    isFetching: false,
    didInvalidate: false,
    response: [],
}, action) {
    switch (action.type) {
        case actionTypes.invalidateCondition:
            return {...state, didInvalidate: true};
        case actionTypes.receiveData:
            return {...state, response: action.response};
        default:
        return state;
    }
}

const rootReducer = combineReducers({
    condition,
    popupParam,
    popupNormalParam,
    emitFetch
});

export default rootReducer;

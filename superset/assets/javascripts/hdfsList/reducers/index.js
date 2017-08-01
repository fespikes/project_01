import { combineReducers } from 'redux';
import { actionTypes, popupActions, popupNormalActions } from '../actions';

function condition(state = {
        page_num: 0,
        page_size: 10,
        //order_column,：取值：'name','online','changed_on','connection_type', 'owner';默认：'changed_on'.
        //order_direction: 取值：'desc' or 'asc', 默认：'desc'
        filter: '',
        path: '/user',
        paths: [],

        selectedRows: [],
        selectedRowKeys: [],
        selectedRowNames: [],

        //    breadCrumbText: '',
        manipulate: '',
        upload: ''
    }, action) {
    switch (action.type) {
    case actionTypes.changePath:
        return {
            ...state,
            ...action.path
        };
        break;
    case actionTypes.search:
        return {
            ...state,
            filter: action.filter
        };
        break;
    case actionTypes.setSelectedRows:
        return {
            ...state,
            selectedRows: action.selectedRows,
            selectedRowKeys: action.selectedRowKeys,
            selectedRowNames: action.selectedRowNames
        };
        break;
    default:
        return state;
    }
}

//TODO: remove it
/*function popupParam(state = {
        //popup callbacks
        submit: argu => argu,
        closeDialog: argu => argu,

        status: 'flex', //flex, none
        response: [],
        showAlert: false

    }, action) {
    switch (action.type) {
    case popupActions.popupChangeStatus:
        return {
            ...state,
            status: action.status
        };
    case popupActions.setPopupParam:
        return {
            ...state,
            response: action.response,
            status: action.status
        };
        break;
    default:
        return state;
    }
}*/

//used only in operation bar
function popupNormalParam(state = {
        //popup callbacks
        submit: argu => argu,
        closeDialog: argu => argu,

        status: 'none', //flex, none
        disabled: 'disabled',
        showAlert: false,
        popupType: '',

        path: '',
        dirName: '',
        dest_path: '',

        treeData: [],
        treeData: [],

        alertStatus: 'none',
        alertMsg: '',
        alertType: '',

        permData: [],
        permMode: ''
    }, action) {
    switch (action.type) {
    case popupNormalActions.popupChangeStatus:
        return {
            ...state,
            status: action.status
        };
    case popupNormalActions.setPopupParams:
        return {
            ...state,
            path: action.path,
            dirName: action.dirName,
            popupType: action.popupType,
            submit: action.submit,
            status: action.status,
            dest_path: action.dest_path,
            dir_name: action.dir_name,

            alertStatus: action.alertStatus,
            alertMsg: action.alertMsg,
            alertType: action.alertType
        };
        break;
    case popupNormalActions.setPopupParam:
        const param = action.param;
        const key = Object.getOwnPropertyNames(param)[0];
        return {
            ...state,
            [key]: param[key]
        };
        break;
    case popupNormalActions.receiveLeafData:
        return {
            ...state,
            treeData: action.treeData
        };
        break;
    case popupNormalActions.setPermData:
        return {
            ...state,
            permData: action.permData
        };
        break;
    case popupNormalActions.setPermMode:
        return {
            ...state,
            permMode: action.permMode
        }
        break;
    case popupNormalActions.setHDFSPath:
        return {
            ...state,
            path: action.path
        }
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
        return {
            ...state,
            didInvalidate: true
        };
    case actionTypes.receiveData:
        return {
            ...state,
            response: action.response
        };
    default:
        return state;
    }
}

function fileReducer(state = {
        path: '',
        mtime: '', //last time modify
        size: '',
        user: '',
        group: '',
        mode: '',

        preview: ''
    }, action) {
    switch (action.type) {
    case actionTypes.giveDetail:
        return {
            ...state,
            ...action.detail
        // path: action.path,
        // mtime: action.mtime, //last time modify
        // size: action.size,
        // user: action.user,
        // group: action.group,
        // mode: action.mode
        };
        break;

    case actionTypes.setPreview:
        return {
            ...state,
            preview: action.preview
        };
        break;
    default:
        return state;
    }
}

const rootReducer = combineReducers({
    condition,
    // popupParam,
    popupNormalParam,
    emitFetch,
    fileReducer
});

export default rootReducer;

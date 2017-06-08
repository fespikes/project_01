/**
 * Created by haitao on 17-5-18.
 */
import { combineReducers } from 'redux';
import { CONFIG_PARAMS } from '../actions';

function configs(state = {
    type: "show_all",
    keyword: "",
    pageNumber: 1,
    pageSize: 12,
    selectedRowKeys: [],
    selectedRowNames: [],
    viewMode: 'table'
}, action) {
    switch (action.type) {
        case CONFIG_PARAMS.SHOW_TYPE:
            return Object.assign({}, state, {
                type: action.typeName
            });
            break;
        case CONFIG_PARAMS.PAGE_NUMBER:
            return Object.assign({}, state, {
                pageNumber: action.pageNumber
            });
            break;
        case CONFIG_PARAMS.PAGE_SIZE:
            return Object.assign({}, state, {
                pageSize: action.pageSize
            });
            break;
        case CONFIG_PARAMS.SET_KEYWORD:
            return Object.assign({}, state, {
                keyword: action.keyword
            });
            break;
        case CONFIG_PARAMS.SELECTED_ROWS:
            return Object.assign({}, state, {
                selectedRowKeys: action.selectedRowKeys,
                selectedRowNames: action.selectedRowNames
            });
        case CONFIG_PARAMS.CLEAR_ROWS:
            return Object.assign({}, state, {
                selectedRowKeys: action.selectedRowKeys,
                selectedRowNames: action.selectedRowNames
            });
        case CONFIG_PARAMS.VIEW_MODE:
            return Object.assign({}, state, {
                viewMode: action.viewMode
            });
        default:
            return state;
    }
}

function posts(state = {
    isFetching: true,
    params: {}
}, action) {
    switch (action.type) {
        case "REQUEST_POSTS":
            return Object.assign({}, state, {
                isFetching: true
            });
        case "RECEIVE_POSTS":
            return Object.assign({}, state, {
                isFetching: false,
                params: action.posts
            });
        default:
            return state;
    }
}

function details(state = {
    isFetching: true,
    dashboardDetail: {}
}, action) {
    switch (action.type) {
        case "REQUEST_DASHBOARD_DETAIL":
            return Object.assign({}, state, {
                isFetching: true
            });
            break;
        case "RECEIVE_DASHBOARD_DETAIL":
            return Object.assign({}, state, {
                isFetching: false,
                dashboardDetail: action.detail
            });
            break;
        default:
            return state;
    }
}

const rootReducer = combineReducers({
    configs,
    posts,
    details
});

export default rootReducer;
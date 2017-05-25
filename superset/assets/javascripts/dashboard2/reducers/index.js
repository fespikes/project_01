/**
 * Created by haitao on 17-5-18.
 */
import { combineReducers } from 'redux';

function operations(state = {}, action) {
    switch (action.type) {
        case "ADD_SLICE":
            break;
        case "EDIT_SLICE":
            break;
        case "PUBLIC_SLICE":
            break;
        case "DELETE_SLICE":
            break;
        default:
            return state;
    }
}

function types(state = {
    type: "show_all"
}, action) {
    switch (action.type) {
        case "SHOW_ALL":
            return Object.assign({}, state, {
               type: "show_all"
            });
            break;
        case "SHOW_FAVORITE":
            return Object.assign({}, state, {
                type: "show_favorite"
            });
            break;
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

function keywords(state = {
    keyword: ''
}, action) {
    switch (action.type) {
        case "SET_KEYWORD":
            return Object.assign({}, state, {
                keyword: action.keyword
            });
        default:
            return state;
    }
}

function details(state = {
    dashboardDetail: {}
}, action) {
    switch (action.type) {
        case "RECEIVE_DASH_DETAIL":
            return Object.assign({}, state, {
                dashboardDetail: action.detail
            });
        default:
            return state;
    }
}

const rootReducer = combineReducers({
    operations,
    posts,
    types,
    keywords,
    details,
});

export default rootReducer;
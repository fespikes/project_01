/**
 * Created by haitao on 17-5-18.
 */
import { combineReducers } from 'redux';
import { ADD_SLICE, EDIT_SLICE, PUBLISH_SLICE, DELETE_SLICE, REQUEST_POSTS, RECEIVE_POSTS } from '../actions';

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

function puts(state = {
    isFetching: true,
    states: {}
}, action) {
    switch (action.type) {
        case "REQUEST_PUTS":
            return Object.assign({}, state, {
                isFetching: true
            });
        case "RECEIVE_PUTS":
            return Object.assign({}, state, {
                isFetching: false,
                states: action.puts
            });
        default:
            return state;
    }
}

const rootReducer = combineReducers({
    operations,
    posts,
    puts,
    types,
});

export default rootReducer;
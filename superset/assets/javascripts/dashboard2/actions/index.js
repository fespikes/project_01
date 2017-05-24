/**
 * Created by haitao on 17-5-18.
 */
import fetch from 'isomorphic-fetch';

export const ADD_SLICE = 'ADD_SLICE';
export const EDIT_SLICE = 'EDIT_SLICE';
export const PUBLIC_SLICE = 'PUBLIC_SLICE';
export const DELETE_SLICE = 'DELETE_SLICE';

export const SHOW_ALL = 'SHOW_ALL';
export const SHOW_FAVORITE = 'SHOW_FAVORITE';

export const REQUEST_POSTS = 'REQUEST_POSTS';
export const RECEIVE_POSTS = 'RECEIVE_POSTS';

export const REQUEST_PUTS = "REQUEST_PUTS";
export const RECEIVE_PUTS = "RECEIVE_PUTS";

export const PAGE_SIZE_CHANGE = 'PAGE_SIZE_CHANGE';

export function addSliceAction() {
    return {
        type: ADD_SLICE,
    }
}

export function editSliceAction() {
    return {
        type: EDIT_SLICE,
    }
}

export function publishSliceAction() {
    return {
        type: PUBLIC_SLICE,
    }
}

export function deleteSliceAction() {
    return {
        type: DELETE_SLICE,
    }
}

export function requestPosts() {
    return {
        type: REQUEST_POSTS,
    }
}

export function receivePosts(json) {
    return {
        type: RECEIVE_POSTS,
        posts: json
    }
}

export function requestPuts() {
    return {
        type: REQUEST_PUTS
    }
}

export function receivePuts(json) {
    return {
        type: RECEIVE_PUTS,
        puts: json
    }
}

export function showAll() {
    return {
        type: SHOW_ALL,
    }
}

export function showFavorite() {
    return {
        type: SHOW_FAVORITE,
    }
}

export function pageSizeChange(pageSize) {
    return {
        type: PAGE_SIZE_CHANGE,
        pageSize,
    }
}

export function fetchDeletes(url, callback) {
    return dispatch => {
        dispatch(requestPosts());
        return fetch(url, {
            credentials: "same-origin"
        }).then(function(response) {
            if(response.ok) {
                fetchPosts(url);
                if(typeof callback === "function") {
                    callback(true);
                }
            }else {
                if(typeof callback === "function") {
                    callback(false);
                }
            }
        });
    }
}

export function fetchAvailableSlices(url, callback) {
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin"
        }).then(function(response) {
            console.log("response=", response);
            if(response.ok) {
                if(typeof callback === "function") {
                    response.json().then(function(response) {
                        callback(true, response);
                    });
                }
            }else {
                if(typeof callback == "function") {
                    callback(false);
                }
            }
        });
    }
}

export function fetchUpdateSlice(url, data, callback) {
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin",
            method: "POST",
            body: JSON.stringify(data)
        }).then(function(response) {
            if(response.ok) {
                fetchPosts(url);
                if(typeof callback === "function") {
                    callback(true);
                }
            }else {
                if(typeof callback == "function") {
                    callback(false);
                }
            }
        });
    }
}

export function fetchPosts(url) {
    return dispatch => {
        dispatch(requestPosts());
        return fetch(url, {
            credentials: "same-origin"
        }).then(response => response.json())
            .then(json => dispatch(receivePosts(json)))
    }
}

export function fetchPuts(url) {
    return dispatch => {
        dispatch(requestPuts());
        return fetch(url, {
            credentials: "same-origin"
        }).then(response => response.json())
            .then(json => dispatch(receivePuts(json)))
    }
}

import fetch from 'isomorphic-fetch';

/*
 * action 类型
 */

export const CHANGE_CATAGORY_IN_TENDENCY = 'CHANGE_CATAGORY_IN_TENDENCY';
export const SWITCH_TAB_IN_FAVOURITE = "SWITCH_TAB_IN_FAVOURITE";
export const SWITCH_TAB_IN_EDIT = "SWITCH_TAB_IN_EDIT";

export const REQUEST_POSTS = 'REQUEST_POSTS';
export const RECEIVE_POSTS = 'RECEIVE_POSTS';

export const SWITCH_PAGE_NUM = 'SWITCH_PAGE_NUM';

/*
 * 其它的常量
 */

export const VisibilityCatagory = {
    SHOW_DASHBOARD: "",
    SHOW_SLICE: "SHOW_SLICE",
    SHOW_TABLES: "SHOW_TABLES",
    SHOW_DATABASE: "SHOW_DATABASE"
};


/*
 * action 创建函数
 */

function reuqestPosts() {
    return {
        type: REQUEST_POSTS,
    }
}

function receivePosts(json) {
    return {
        type: RECEIVE_POSTS,
        posts: json.index,
        receivedAt: Date.now()
    }
}

function receiveData(json) {
    return {
        type: RECEIVE_POSTS,
        posts: json,
        receivedAt: Date.now()
    }
}

export function fetchPosts() {
    const URL = "/pilot/home/alldata";
    return dispatch => {
        dispatch(reuqestPosts());
        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
        .then(response => response.json())
        .then(json => dispatch(receivePosts(json)));
    };
}

export function fetchEditDetail(catagory, index, orderColumn, orderDirection) {
    if (!orderColumn)
        orderColumn = "time";

    const URL = "/pilot/home/edits/" + catagory + "?page=" + index + "&&order_column=" + orderColumn + "&&order_direction=" + orderDirection;
    return dispatch => {
        dispatch(reuqestPosts());
        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
        .then(response => response.json())
        .then(json => dispatch(receiveData(json)));
    };
}

export function fetchEventDetail(index, orderColumn, orderDirection) {
    if (!orderColumn)
        orderColumn = "time";
    
    const URL = "/pilot/home/actions?page=" + index + "&&order_column=" + orderColumn + "&&order_direction=" + orderDirection;
    return dispatch => {
        dispatch(reuqestPosts());
        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
        .then(response => response.json())
        .then(json => dispatch(receiveData(json)));
    };
}

export function changeCatagory(catagory) {
    return {
        type: CHANGE_CATAGORY_IN_TENDENCY,
        catagory
    }
}

export function swithTabInFavourite(tab) {
    return {
        type: SWITCH_TAB_IN_FAVOURITE,
        tab
    }
}

export function swithTabInEdit(tab) {
    return {
        type: SWITCH_TAB_IN_EDIT,
        tab
    }
}


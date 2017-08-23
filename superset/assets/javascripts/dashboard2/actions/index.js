/**
 * Created by haitao on 17-5-18.
 */
import fetch from 'isomorphic-fetch';
import {getOnOfflineInfoUrl, renderLoadingModal} from '../../../utils/utils'

export const REQUEST_POSTS = 'REQUEST_POSTS';
export const RECEIVE_POSTS = 'RECEIVE_POSTS';

export const REQUEST_DASHBOARD_DETAIL = 'REQUEST_DASHBOARD_DETAIL';
export const RECEIVE_DASHBOARD_DETAIL = 'RECEIVE_DASHBOARD_DETAIL';

export const CONFIG_PARAMS = {
    SET_KEYWORD: 'SET_KEYWORD',
    SHOW_TYPE: 'SHOW_TYPE',
    PAGE_NUMBER: 'PAGE_NUMBER',
    PAGE_SIZE: 'PAGE_SIZE',
    SELECTED_ROWS: 'SELECTED_ROWS',
    CLEAR_ROWS: 'CLEAR_ROWS',
    VIEW_MODE: 'VIEW_MODE',
    TABLE_LOADING: 'TABLE_LOADING',
    SWITCH_FETCHING_STATE: 'SWITCH_FETCHING_STATE'
};

const callbackHandler = (response, callback) => {
    if(response.status === 200) {
        callback && callback(true, response.data);
    }else if(response.status === 500) {
        callback && callback(false, response.message);
    }
};
const always = (response) => {
    return Promise.resolve(response);
};
const json = (response) => {
    return response.json();
};

export function requestPosts() {
    return {
        type: REQUEST_POSTS
    }
}

export function receivePosts(json) {
    return {
        type: RECEIVE_POSTS,
        posts: json
    }
}

export function requestDashboardDetail() {
    return {
        type: RECEIVE_DASHBOARD_DETAIL
    }
}

export function receiveDashboardDetail(json) {
    return {
        type: RECEIVE_DASHBOARD_DETAIL,
        detail: json
    }
}

export function setKeyword(keyword) {
    return {
        type: CONFIG_PARAMS.SET_KEYWORD,
        keyword: keyword
    }
}

export function setShowType(typeName) {
    return {
        type: CONFIG_PARAMS.SHOW_TYPE,
        typeName: typeName
    }
}

export function setPageNumber(pageNumber) {
    return {
        type: CONFIG_PARAMS.PAGE_NUMBER,
        pageNumber: pageNumber
    }
}

export function setPageSize(pageSize) {
    return {
        type: CONFIG_PARAMS.PAGE_SIZE,
        pageSize: pageSize
    }
}

export function setSelectedRow(selectedRowKeys, selectedRowNames) {
    return {
        type: CONFIG_PARAMS.SELECTED_ROWS,
        selectedRowKeys: selectedRowKeys,
        selectedRowNames: selectedRowNames
    }
}

export function clearRows() {
    return {
        type: CONFIG_PARAMS.CLEAR_ROWS,
        selectedRowKeys: [],
        selectedRowNames: []
    }
}

export function appendRow(dashboard, selectedRowKeys, selectedRowNames) {
    return {
        type: CONFIG_PARAMS.SELECTED_ROWS,
        selectedRowKeys: getSelectedRows(dashboard, selectedRowKeys, selectedRowNames, 'append').selectedRowKeys,
        selectedRowNames: getSelectedRows(dashboard, selectedRowKeys, selectedRowNames, 'append').selectedRowNames
    }
}

export function removeRow(dashboard, selectedRowKeys, selectedRowNames) {
    return {
        type: CONFIG_PARAMS.SELECTED_ROWS,
        selectedRowKeys: getSelectedRows(dashboard, selectedRowKeys, selectedRowNames, 'remove').selectedRowKeys,
        selectedRowNames: getSelectedRows(dashboard, selectedRowKeys, selectedRowNames, 'remove').selectedRowNames
    }
}

export function setViewMode(viewMode) {
    return {
        type: CONFIG_PARAMS.VIEW_MODE,
        viewMode: viewMode
    }
}

export function setTableLoadingStatus(loading) {
    return {
        type: CONFIG_PARAMS.TABLE_LOADING,
        tableLoading: loading
    }
}

export function switchFetchingState(isFetching) {
    const loadingModal = renderLoadingModal();
    if(isFetching) {
        loadingModal.show();
    }else {
        loadingModal.hide();
    }
    return {
        type: CONFIG_PARAMS.SWITCH_FETCHING_STATE,
        isFetching: isFetching
    }
}

export function fetchDashboardDelete(dashboardId, callback) {
    const url = window.location.origin + "/dashboard/delete/" + dashboardId;
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin"
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                if(response.status === 200) {
                    dispatch(fetchPosts());
                }
            }
        );
    }
}

export function fetchDashbaordDelInfo(dashboardId, callback) {
    const url = window.location.origin + "/dashboard/delete_info/" + dashboardId;
    return dispatch => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: "same-origin",
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchDashboardDeleteMul(callback) {
    const url = window.location.origin + "/dashboard/muldelete";
    return (dispatch, getState) => {
        const selectedRowKeys = getState().configs.selectedRowKeys;
        let data = {selectedRowKeys: selectedRowKeys};
        return fetch(url, {
            credentials: "same-origin",
            method: "POST",
            body: JSON.stringify(data)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                if(response.status === 200) {
                    dispatch(fetchPosts());
                }
            }
        );
    }
}

export function fetchDashboardMulDelInfo(callback) {
    const url = window.location.origin + "/dashboard/muldelete_info/";
    return (dispatch, getState) => {
        const selectedRowKeys = getState().configs.selectedRowKeys;
        let data = {selectedRowKeys: selectedRowKeys};
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: "same-origin",
            method: "POST",
            body: JSON.stringify(data)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchAvailableSlices(callback) {
    const url = window.location.origin + "/dashboard/addablechoices";
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin"
        }).then(function(response) {
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

export function fetchUpdateDashboard(state, dashboard, callback) {
    const url = window.location.origin + "/dashboard/edit/" + dashboard.id;
    const newDashboard = getNewDashboard(dashboard, state.selectedSlices, dashboard.available_slices);
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin",
            method: "POST",
            body: JSON.stringify(newDashboard)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(fetchPosts());
                }
            }
        );
    }
}

export function fetchAddDashboard(state, availableSlices, callback) {
    const url = window.location.origin + "/dashboard/add";
    const dashboard = getNewDashboard(state.dashboard, state.selectedSlices, availableSlices);
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin",
            method: "POST",
            body: JSON.stringify(dashboard)
        }).then(function(response) {
            if(response.ok) {
                dispatch(fetchPosts());
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

export function fetchStateChange(record, callback, type) {
    const url = getStateChangeUrl(record, type);
    return dispatch => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: "same-origin",
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(fetchPosts());
                }
            }
        );
    }
}

export function fetchOnOfflineInfo(dashboardId, published, callback) {
    const url = getOnOfflineInfoUrl(dashboardId, 'dashboard', published);
    return dispatch => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: "same-origin",
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchDashboardDetail(dashboardId, callback) {
    const url = window.location.origin + "/dashboard/show/" + dashboardId;
    return dispatch => {
        return fetch(url, {
            credentials: "same-origin",
        }).then(function(response) {
            if(response.ok) {
                response.json().then(
                    function(json) {
                        callback(true, json);
                    })
            }else {
                callback(false);
            }
        })
    }
}

export function fetchPosts() {
    return (dispatch, getState) => {
        dispatch(requestPosts());
        let url = getDashboardListUrl(getState());
        return fetch(url, {
            credentials: "same-origin"
        }).then(response => response.json())
            .then(json => {
                dispatch(receivePosts(json));
                dispatch(clearRows());
            })
    }
}

function getDashboardListUrl(state) {
    let url = window.location.origin + "/dashboard/listdata?page=" + (state.configs.pageNumber - 1) +
        "&page_size=" + state.configs.pageSize + "&filter=" + state.configs.keyword;
    if(state.configs.type === "show_favorite") {
        url += "&only_favorite=1";
    }
    return url;
}

function getStateChangeUrl(record, type) {
    if(type === "favorite") {
        let url_favorite = window.location.origin + "/pilot/favstar/Dashboard/" + record.id;
        if(record.favorite) {
            url_favorite += "/unselect";
        }else {
            url_favorite += "/select";
        }
        return url_favorite;
    }else if(type === "publish") {
        let url_publish = window.location.origin + "/pilot/release/dashboard/";
        if(record.online) {
            url_publish += "offline/" + record.id;
        }else {
            url_publish += "online/" + record.id;
        }
        return url_publish;
    }
}

function getNewDashboard(dashboard, selectedSlices, availableSlices) {
    let obj = {};
    obj.id = dashboard.id;
    obj.dashboard_title = dashboard.dashboard_title;
    obj.description = dashboard.description;
    obj.slices = getSelectedSlices(selectedSlices, availableSlices);
    return obj;
}

function getSelectedSlices(selectedSlices, availableSlices) {
    let array = [];
    selectedSlices.forEach(function(selected) {
        availableSlices.forEach(function(slice) {
            if(selected === slice.id.toString()) {
                array.push(slice);
            }
        });
    });
    return array;
}

function getSelectedRows(dashboard, selectedRowKeys, selectedRowNames, type) {
    let row = {};
    if(type === "append") {
        let existed = false;
        selectedRowKeys.map((key) => {
            if(key === dashboard.id) {
                existed = true;
            }
        });
        if(!existed) {
            selectedRowKeys.push(dashboard.id);
            selectedRowNames.push(dashboard.dashboard_title);
        }
    }else if(type === "remove") {
        selectedRowKeys.map((key, index) => {
            if(key === dashboard.id) {
                selectedRowKeys.splice(index, 1);
                selectedRowNames.splice(index, 1);
            }
        });
    }
    row.selectedRowKeys = selectedRowKeys;
    row.selectedRowNames = selectedRowNames;
    return row;
}


import fetch from 'isomorphic-fetch';

export const SHOW_ALL = 'showAll';
export const SHOW_FAVORITE = 'showFavorite';

export const LISTS = {
    REQUEST_LISTS: 'REQUEST_LISTS',
    RECEIVE_LISTS: 'RECEIVE_LISTS'
};

export const DETAILS = {
    REQUEST_LISTS: 'REQUEST_DETAIL',
    RECEIVE_LISTS: 'RECEIVE_DETAIL'
};

export const CONDITION_PARAMS = {
    KEYWORD: 'KEYWORD',
    SHOW_TYPE: 'SHOW_TYPE',
    PAGE_NUMBER: 'PAGE_NUMBER',
    PAGE_SIZE: 'PAGE_SIZE',
    SELECTED_ROWS: 'SELECTED_ROWS'
};

const baseURL = window.location.origin + '/slice/';

export function navigateTo(pageNumber){
    return {
        type: CONDITION_PARAMS.PAGE_NUMBER,
        pageNumber: pageNumber
    }
}

export function setPageSize(pageSize) {
    return {
        type: CONDITION_PARAMS.PAGE_SIZE,
        pageSize: pageSize
    }
}

export function switchFavorite(typeName){
    return {
        type: CONDITION_PARAMS.SHOW_TYPE,
        typeName: typeName
    }
}

export function requestLists() {
    return {
        type: LISTS.REQUEST_LISTS
    };
}

export function setKeyword(keyword) {
    return {
        type: CONDITION_PARAMS.KEYWORD,
        keyword: keyword
    }
}

export function setSelectedRows(selectedRowKeys, selectedRowNames) {
    return {
        type: CONDITION_PARAMS.SELECTED_ROWS,
        selectedRowKeys: selectedRowKeys,
        selectedRowNames: selectedRowNames
    }
}

export function receiveLists(json) {
    return {
        type: LISTS.RECEIVE_LISTS,
        lists: json
    };
}

export function fetchStateChange(record, type) {
    const url = getStateChangeUrl(record, type);
    return dispatch => {
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(function(response) {
            if(response.ok) {
                dispatch(fetchLists());
            }else {

            }
        });
    }
}

export function fetchLists() {
    return (dispatch, getState) => {
        dispatch(requestLists());
        const url = getSliceListUrl(getState());
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(response => {
            if(response.ok) {
                return response.json();
            }else {
                throw new Error('Network response was not ok.');
            }
        }).then(response => {
            dispatch(receiveLists(response));
        }).catch( argus => {
            console.log(argus);
        });
    };
}

export function fetchSliceDelete(sliceId, callback) {
    const url = baseURL + "delete/" + sliceId;
    return dispatch => {
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(function(response) {
            if(response.ok) {
                dispatch(fetchLists());
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

export function fetchSliceDeleteMul(callback) {
    const url = baseURL + "muldelete";
    return (dispatch, getState) => {
        const selectedRowKeys = getState().conditions.selectedRowKeys;
        let data = {selectedRowKeys: selectedRowKeys};
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(data)
        }).then(function(response) {
            if(response.ok) {
                dispatch(fetchLists());
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

export function fetchSliceDetail(sliceId, callback) {
    const url = baseURL + "show/" + sliceId;
    return dispatch => {
        return fetch(url, {
            credentials: "include",
            method: 'GET'
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

export function fetchUpdateSlice(state, slice, callback) {
    const url = baseURL + "edit/" + slice.id;
    const newSlice = getNewSlice(slice, state.selectedDashboards, slice.available_dashboards);
    return dispatch => {
        return fetch(url, {
            credentials: "include",
            method: "POST",
            body: JSON.stringify(newSlice)
        }).then(function(response) {
            if(response.ok) {
                dispatch(fetchLists());
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

function getSliceListUrl(state) {
    let url = baseURL + "listdata?page=" + (state.conditions.pageNumber - 1) +
        "&page_size=" + state.conditions.pageSize + "&filter=" + state.conditions.keyword;
    if(state.conditions.type === SHOW_FAVORITE) {
        url += "&only_favorite=1";
    }
    return url;
}

function getStateChangeUrl(record, type) {
    if(type === "favorite") {
        let url_favorite = window.location.origin + "/superset/favstar/Slice/" + record.id;
        if(record.favorite) {
            url_favorite += "/unselect";
        }else {
            url_favorite += "/select";
        }
        return url_favorite;
    }else if(type === "publish") {
        let url_publish = baseURL + "release/";
        if(record.online) {
            url_publish += "offline/" + record.id;
        }else {
            url_publish += "online/" + record.id;
        }
        return url_publish;
    }
}

function getNewSlice(slice, selectedDashboards, availableDashboards) {
    let obj = {};
    obj.id = slice.id;
    obj.slice_name = slice.slice_name;
    obj.description = slice.description;
    obj.dashboards = getSelectedSlices(selectedDashboards, availableDashboards);
    return obj;
}

function getSelectedSlices(selectedDashboards, availableDashboards) {
    let array = [];
    selectedDashboards.forEach(function(selected) {
        availableDashboards.forEach(function(dashboard) {
            if(selected === dashboard.id.toString()) {
                array.push(dashboard);
            }
        });
    });
    return array;
}
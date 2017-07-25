import fetch from 'isomorphic-fetch';

export const actionTypes = {
    sendRequest: 'SEND_REQUEST',
    receiveData: 'RECEIVE_DATA',

    changePath: 'CHANGE_PATH',

    search: 'SEARCH',

    setSelectedRows: 'SET_SELECTED_ROWS'
}

export const popupActions = {
    setPopupParam: 'SET_POPUP_PARAM',
    popupChangeStatus: 'POPUP_CHANGE_STATUS'
}

export const popupNormalActions = {
    setPopupParam: 'SET_POPUP_NORMAL_PARAM',
    popupChangeStatus: 'POPUP_NORMAL_CHANGE_STATUS'
}

export const CONSTANT = {
    mkdir: 'mkdir',
    move: 'move',
    copy: 'copy',
    auth: 'auth',
    upload: 'upload',
    remove: 'remove'
}

const ORIGIN = window.location.origin;
const connectionListUrl = `${ORIGIN}/connection/listdata`;
const baseURL = `${ORIGIN}/hdfsfilebrowser?`;

const errorHandler = error => alert(error);

/**
@description: S-mock
*/
const connectionsMock = require('../mock/connections.json');

export function changePath(path) {
    return {
        type: actionTypes.changePath,
        path
    }
}

function fetchMakedir() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;
        const URL = baseURL + `action=mkdir&connection_id=${connectionID}&path=${popupNormalParam.path}&dir_name=${popupNormalParam.dirName}`;

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
            });
    }
}

export function fetchOperation() {
    let submit = argu => argu;
    return (dispatch, getState) => {
        const popupType = getState().popupNormalParam.popupType;

        switch (popupType) {
        case CONSTANT.mkdir:
            submit = fetchMakedir;
            break;
        case CONSTANT.move:
            submit = fetchMove;
            break;
        case CONSTANT.copy:
            submit = fetchCopy;
            break;
        case CONSTANT.auth:
            submit = fetchAuth;
            break;
        case CONSTANT.upload:
            submit = fetchUpload;
            break;
        default:
            break;
        }
        return dispatch(submit());
    }
}

function fetchMove() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;
        const URL = baseURL + `action=move&connection_id=${connectionID}&path=${popupNormalParam.path}&dir_name=${popupNormalParam.dirName}`;

        //TODO:get the path and dest_path
        //TODO:set the params befor commit

        //path=/user/hive/employee/subdir/test_upload.txt&
        //dest_path=/user/hive/employee

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
            });
    }
}

function fetchCopy() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;
        const URL = baseURL + `action=copy&connection_id=${connectionID}&path=${popupNormalParam.path}&dir_name=${popupNormalParam.dirName}`;

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
            });
    }
}

//no api but have the function
function fetchAuth() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;
        const URL = baseURL + `action=&connection_id=${connectionID}&path=${popupNormalParam.path}&dir_name=${popupNormalParam.dirName}`;

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
            });
    }
}

function fetchUpload() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;
        const URL = baseURL + `action=upload&connection_id=${connectionID}&path=${popupNormalParam.path}&dir_name=${popupNormalParam.dirName}`;

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
            });
    }
}

function fetchRemove() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;
        const URL = baseURL + `action=remove&connection_id=${connectionID}&path=${popupNormalParam.path}&dir_name=${popupNormalParam.dirName}`;

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
            });
    }
}
//S: popup related actions
export function setPopupParam(param) {
    return {
        type: popupActions.setPopupParam,
        status: param.status,
        response: param.response
    }
}

export function popupChangeStatus(param) {
    return {
        type: popupActions.popupChangeStatus,
        status: param
    }
}

//normal popup in operation
export function setPopupNormalParam(param) {
    return {
        type: popupNormalActions.setPopupParam,
        path: param.path,
        dirName: param.dirName,
        connectionID: param.connectionID,
        popupType: param.popupType,
        submit: param.submit,
        status: param.status
    }
}
export function popupNormalChangeStatus(param) {
    return {
        type: popupNormalActions.popupChangeStatus,
        status: param
    }
}
//E: popup related actions
/**
@description: S:operation functions here
*/
export function search(filter) {
    return {
        type: actionTypes.search,
        filter: filter
    };
}
/**
@description: E:operation functions here
*/

function sendRequest(condition) {
    return {
        type: actionTypes.sendRequest,
        condition,
    };
}

function receiveData(condition, json) {
    return {
        type: actionTypes.receiveData,
        condition,
        response: json,
        receivedAt: Date.now()
    };
}

function applyFetch(condition) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));

        const URL = baseURL + 'action=list&' +
        (condition.connectionId ? 'connection_id=' + condition.connectionId : '');

        const errorHandler = (error => alert(error));
        const dataMatch = json => {
            if (!json.files) return json;
            json.files.map(function(obj, index, arr) {
                obj.key = index + 1;
            });
            return json;
        }

        /*      return fetch(URL, {
                    credentials: 'include',
                    method: 'GET'
                })
                .then(
                    response => response.ok?
                        response.json() : (response => errorHandler(response))(response),
                    error => errorHandler(error)
                )
                .then(json => {
                    dispatch(receiveData(condition, dataMatch(json)));
                });
        */

        let mockFunc = function() {
            dispatch(receiveData(condition, dataMatch(connectionsMock)));
        }();
    };
}

function shouldFetch(state, condition) {
    return true;
}

export function fetchIfNeeded(condition) {
    return (dispatch, getState) => {
        if (shouldFetch(getState(), condition)) {
            return dispatch(applyFetch(condition));
        }
        return null;
    };
}

export function setSelectedRows(selectedRowKeys, selectedRowNames) {

    return {
        type: actionTypes.setSelectedRows,
        selectedRowKeys,
        selectedRowNames
    }
}
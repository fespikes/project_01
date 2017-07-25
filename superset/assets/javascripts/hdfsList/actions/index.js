import fetch from 'isomorphic-fetch';

export const actionTypes = {
    sendRequest: 'SEND_REQUEST',
    receiveData: 'RECEIVE_DATA',

    search: 'SEARCH',

    setSelectedRows: 'SET_SELECTED_ROWS'
}

export const popupActions = {
    setPopupParam: 'SET_POPUP_PARAM',
    popupChangeStatus: 'POPUP_CHANGE_STATUS'
}

export const popupNormalActions = {
    setPopupParams: 'SET_POPUP_NORMAL_PARAMS',
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
const baseURL = `${ORIGIN}/hdfs/`;

// const urlDown = baseURL + `download/?path=/tmp/test_upload.txt   GET 下载  None    200，400，404 
// ?
// /hdfs/upload/?dest_path=/tmp&filename=test.txt  POST    上传

// filename:上传后保存的文件名； 文件内容以二进制post    200，400 
// ?
// /hdfs/remove/?path=/tmp/test_upload.txt GET 删除  None    200，400，404 
// ?
// /hdfs/move/?path=/tmp/test_upload.txt&dest_path=/tmp/testdir    GET 移动  None    200，400，404 
// ?
// /hdfs/copy/?path=/tmp/testdir/test_upload.txt&dest_path=/tmp    GET 拷贝  None    200，400，404 
// ?
// /hdfs/mkdir/?path=/tmp&dir_name=testdir GET 创建目录    None    200，400 
// ?
// /hdfs/rmdir/?path=/tmp/testdir  GET 删除目录    None    200，400 
// ?
// /hdfs/preview/?path=/tmp/test_upload.txt    GET 预览文件    None    200，400 
// ?
// /hdfs/chmod/?path=/tmp/test_upload.txt&mode=0o777

const errorHandler = error => alert(error);

/**
@description: S-mock
*/
const connectionsMock = require('../mock/connections.json');

actionTypes.changePath = 'CHANGE_PATH';
export function changePath(path) {
    return {
        type: actionTypes.changePath,
        path
    }
}
//TODO
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
        case CONSTANT.mkdir:
            submit = fetchMakedir;
            break;
        default:
            break;
        }
        return dispatch(submit());
    }
}

//doing
function fetchMove() {
    return (dispatch, getState) => {
        const state = getState();
        const connectionID = state.condition.connectionID;
        const popupNormalParam = state.popupNormalParam;

        const URL = baseURL + `move/?` +
        (condition.path ? ('path=' + condition.path + '&') : '') +
        (condition.dest_path ? 'dest_path=' + condition.dest_path : '');

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
export function setPopupNormalParams(param) {
    return {
        type: popupNormalActions.setPopupParams,
        path: param.path,
        dirName: param.dirName,
        popupType: param.popupType,
        submit: param.submit,
        status: param.status
    }
}

//normal popup in operation
export function setPopupNormalParam(param) {
    return {
        type: popupNormalActions.setPopupParam,
        param
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

        const URL = baseURL + `list/?` +
        (condition.path ? ('path=' + condition.path + '&') : '') +
        (condition.page_num !== undefined ? ('page_num=' + condition.page_num + '&') : '') +
        (condition.page_size ? 'page_size=' + condition.page_size : '');

        // const urlListUnderPath = baseURL + `list/` //?path=/tmp&page_num=0&page_size=10   GET 列出目录下所有文件   

        const dataMatch = json => {
            if (!json.files) return json;
            json.files.map(function(obj, index, arr) {
                obj.key = index + 1;
            });
            return json;
        };

        /*return fetch(URL, {
            credentials: 'include',
            method: 'GET',
            mode: 'cors'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                dispatch(receiveData(condition, dataMatch(json)));
            });*/

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

actionTypes.giveDetail = 'GIVE_DETAIL';
export function giveDetail(detail) {
    return {
        type: actionTypes.giveDetail,
        detail
    }
}

actionTypes.setPreview = 'SET_PREVIEW';
export function setPreview(preview) {
    return {
        type: actionTypes.setPreview,
        preview
    }
}

export function fetchPreview() {
    return (dispatch, getState) => {
        const state = getState();

        const URL = baseURL + `preview/?path=${state.fileReducer.path}`;
        // /hdfs/preview/?path=/tmp/test_upload.txt

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(preview => {
                dispatch(setPreview(preview));
            });
    }
}
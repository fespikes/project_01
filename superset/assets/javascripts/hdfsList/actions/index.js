import fetch from 'isomorphic-fetch';

import { appendTreeChildren, findTreeNode } from '../../tableList/module';

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

export function fetchOperation(param) {
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
        case CONSTANT.auth: //TODO:
            submit = fetchAuth;
            break;
        case CONSTANT.upload: //TODO:
            submit = fetchUpload;
            break;
        case CONSTANT.mkdir:
            submit = fetchMakedir;
            break;
        default:
            break;
        }
        return dispatch(submit(param));
    }
}

//doing
function fetchMove(param) {
    return (dispatch, getState) => {
        const popupNormalParam = getState().popupNormalParam;
        const path = popupNormalParam.path;
        const dest_path = popupNormalParam.dest_path;

        const URL = baseURL + `move/?` +
        (path ? ('path=' + path + '&') : '') +
        (dest_path ? 'dest_path=' + dest_path : '');

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
                console.log();
            });
    }
}

function fetchCopy() {
    return (dispatch, getState) => {
        const popupNormalParam = getState().popupNormalParam;
        const path = popupNormalParam.path;
        const dest_path = popupNormalParam.dest_path;

        const URL = baseURL + `copy/?` +
        (path ? ('path=' + path + '&') : '') +
        (dest_path ? 'dest_path=' + dest_path : '');

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

//TODO
function fetchMakedir() {
    return (dispatch, getState) => {
        const popupNormalParam = getState().popupNormalParam;
        const path = popupNormalParam.path;
        const dir_name = popupNormalParam.dir_name;

        const URL = baseURL + `mkdir/?` +
        (path ? ('path=' + path + '&') : '') +
        (dir_name ? 'dest_path=' + dir_name : '');
        ///hdfs/mkdir/?path=/tmp&dir_name=testdir

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
        status: param.status,
        dest_path: param.dest_path
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

function receiveData(json, condition) {
    return {
        type: actionTypes.receiveData,
        condition,
        response: json,
        receivedAt: Date.now()
    };
}

popupNormalActions.requestLeafData = 'REQUEST_LEAF_DATA';
function requestLeafData(json) {
    return {
        type: popupNormalActions.requestLeafData,
        isFetching: true
    };
}
popupNormalActions.receiveLeafData = 'RECEIVE_LEAF_DATA';
function receiveLeafData(json) {
    console.log('in receiveLeafData:', json);
    return {
        type: popupNormalActions.receiveLeafData,
        treeData: json,
        isFetching: false
    };
}

export function fetchLeafData(condition, treeDataReady) {
    //TODO: adjust the data and dispatch receiveLeafData
    return (dispatch, getState) => {

        dispatch(requestLeafData());
        let treeData = getState().popupNormalParam.treeData;

        const URL = baseURL + `list/?` +
        (condition.pathString ? ('path=' + condition.pathString) : '');

        let pathArray = [].concat(condition.pathArray);

        let length = pathArray.length; //the min is 2
        let pathString = condition.pathString;
        let keyData = {}; //record the correct child node;

        return fetch(URL, {
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
                let i = 0;

                //only used when path is '/'
                if (length === 1) {
                    keyData = json.files.filter(file => {
                        return (file.name !== '.' && file.name !== '..');
                    }).map((file, index) => {
                        return {
                            title: file.name, //what to display
                            value: file.path, //for filter
                            key: file.path,
                            isLeaf: true
                        }
                    });
                    dispatch(receiveLeafData(keyData));
                } else {
                    let treeData = getState().popupNormalParam.treeData;
                    let swap = {};
                    while (i < length) {

                        if (length = 2) {
                            for (var j = 0; j < treeData.length; j++) {
                                if (treeData[j].value === pathString) {
                                    keyData = treeData[j];
                                    continue;
                                }
                            }
                        //if length ===3 or more
                        } else {
                            for (var j = 0; j < keyData.children.length; j++) {
                                swap = keyData.children[j];
                                if (swap.value === pathString) {
                                    keyData = swap;
                                }
                            }
                        }
                        i++;
                    }

                    keyData.isLeaf = false
                    keyData.children = json.files.filter(file => {
                        return (file.name !== '.' && file.name !== '..');
                    }).map((file, index) => {
                        return {
                            title: file.name, //what to display
                            value: file.path, //for filter
                            key: file.path,
                            isLeaf: true
                        }
                    });

                    treeData = JSON.parse(JSON.stringify(treeData));
                    dispatch(receiveLeafData(treeData));

                // fetchCallback(dispatch, receiveLeafData, treeData);
                }
                treeDataReady && treeDataReady(treeData);

            // dispatch(receiveLeafData(condition, dataMatch(json)));
            });
    }
}

const fetchCallback = (dispatch, receiveData, data, condition) => {
    dispatch(receiveData(data, condition));
}
function applyFetch(condition) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));

        const URL = baseURL + `list/?` +
        (condition.path ? ('path=' + condition.path + '&') : '') +
        (condition.page_num !== undefined ? ('page_num=' + condition.page_num + '&') : '') +
        (condition.page_size ? 'page_size=' + condition.page_size : '');

        // const urlListUnderPath = baseURL + `list/` //?path=/tmp&page_num=0&page_size=10   GET 列出目录下所有文件   

        const listDataMatch = json => {
            if (!json || !json.files) return json;
            json.files.map(function(obj, index, arr) {
                obj.key = index + 1;
            });
            return json;
        };
        return fetch(URL, {
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
                const data = listDataMatch(json);
                fetchCallback(dispatch, receiveData, data, condition);
            // dispatch(receiveData(condition, listDataMatch(json)));
            });

    /*        let mockFunc = function() {
                dispatch(receiveData(condition, dataMatch(connectionsMock)));
            }();*/
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

export function setSelectedRows(selectedRows, selectedRowKeys, selectedRowNames) {
    return {
        type: actionTypes.setSelectedRows,
        selectedRows,
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
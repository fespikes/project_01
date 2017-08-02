import fetch from 'isomorphic-fetch';

import { appendTreeChildren, findTreeNode } from '../../tableList/module';

export const actionTypes = {
    sendRequest: 'SEND_REQUEST',
    receiveData: 'RECEIVE_DATA',

    search: 'SEARCH',

    setSelectedRows: 'SET_SELECTED_ROWS',

    switchFetchingStatus: 'SWITCH_FETCHING_STATUS'
};

export const popupActions = {
    setPopupParam: 'SET_POPUP_PARAM',
    popupChangeStatus: 'POPUP_CHANGE_STATUS'
};

export const popupNormalActions = {
    setPopupParams: 'SET_POPUP_NORMAL_PARAMS',
    setPopupParam: 'SET_POPUP_NORMAL_PARAM',
    popupChangeStatus: 'POPUP_NORMAL_CHANGE_STATUS',
    setPermData: 'SET_PERM_DATA',
    setPermMode: 'SET_PERM_MODE',
    setHDFSPath: 'SET_HDFS_PATH',
    setRecursivePerm: 'SET_RECURSIVE_PERM'
};

export const CONSTANT = {
    mkdir: 'mkdir',
    move: 'move',
    copy: 'copy',
    auth: 'auth',
    upload: 'upload',
    remove: 'remove',
    noSelect: 'noSelect'
};

const ORIGIN = window.location.origin;
const baseURL = `${ORIGIN}/hdfs/`;

const errorHandler = (error, callback, dispatch) => {
    console.log(error.message);
    if(typeof callback === 'function') {
        callback(false, error);
    }
    dispatch(switchFetchingStatus(false));
};
const succeedHandler = (response, callback, dispatch) => {
    if(typeof callback === 'function') {
        callback(true, response);
    }
    dispatch(switchFetchingStatus(false));
};
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
        case CONSTANT.auth:
            submit = fetchAuth;
            break;
        case CONSTANT.upload:
            submit = fetchUpload;
            break;
        case CONSTANT.mkdir:
            submit = fetchMakedir;
            break;
        case CONSTANT.remove:
            submit = fetchRemove;
            break;
        case CONSTANT.noSelect:
            submit = fetchNoSelection;
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
//TODO
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
function fetchAuth(callback) {
    return (dispatch, getState) => {
        const state = getState();
        const popupNormalParam = state.popupNormalParam;
        const params = {
            path: [popupNormalParam.path],
            mode: popupNormalParam.permMode,
            recursive: popupNormalParam.recursivePerm
        };
        const URL = baseURL + "chmod/";

        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(params)
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response, callback, dispatch))(response),
                error => errorHandler(error, callback, dispatch)
        )
            .then(json => {
                succeedHandler(json, callback, dispatch);
            });
    }
}

function fetchUpload(callback) {
    return (dispatch, getState) => {
        const popupNormalParam = getState().popupNormalParam;
        const destPath = popupNormalParam.dest_path;
        const fileName = popupNormalParam.file_name;
        const binaryFile = popupNormalParam.binaryFile;
        const url = baseURL + 'upload/?dest_path=' + destPath + '&file_name=' + fileName;

        return fetch(url, {
            credentials: 'include',
            method: "POST",
            body: binaryFile
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response, callback, dispatch))(response),
                error => errorHandler(error)
        )
            .then(json => {
                console.log('TODO: get the interface');
                succeedHandler(json, callback, dispatch);
            });
    }
}


function fetchMakedir() {
    return (dispatch, getState) => {
        const popupNormalParam = getState().popupNormalParam;
        const path = popupNormalParam.path;
        const dir_name = popupNormalParam.dir_name;

        const URL = baseURL + `mkdir/?` +
        (path ? ('path=' + path + '&') : '') +
        (dir_name ? 'dir_name=' + dir_name : '');
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
                let obj = {};
                //TODO: the verification
                if (json) {
                    obj = {
                        ...popupNormalParam,
                        path: '',
                        dir_name: '',

                        alertStatus: '',
                        alertMsg: json.message,
                        alertType: 'success',
                        disabled: 'disabled'
                    };
                } else {
                    obj = {
                        ...popupNormalParam,
                        dir_name: '',
                        alertStatus: '',
                        //TODO:
                        alertMsg: 'json.message' || 'made an error',
                        alertType: 'error',
                        disabled: 'disabled'
                    };
                }
                dispatch(setPopupNormalParams(obj));
            });
    }
}

function fetchRemove() {
    return (dispatch, getState) => {
        const state = getState();
        const selectedRows = state.condition.selectedRows;
        const popupNormalParam = state.popupNormalParam;
        let path = [];
        selectedRows.map((currentValue, index, array) => {
            path.push(currentValue.path);
        });

        // const URL = baseURL + `remove/`;
        const URL = baseURL + `rmdir/`;

        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                path: path
            })
        })
            .then(
                response => response.ok ?
                    response.json() : (response => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {

                let obj = {};

                if (json) {
                    obj = {
                        ...popupNormalParam,
                        path: '',
                        dir_name: '',

                        alertStatus: '',
                        alertMsg: json.message || json || 'succeed!',
                        alertType: 'success',
                        disabled: 'disabled'
                    };
                } else {
                    obj = {
                        ...popupNormalParam,
                        dir_name: '',
                        alertStatus: '',
                        alertMsg: json.message || 'made an error',
                        alertType: 'error',
                        disabled: 'disabled'
                    };
                }
                dispatch(setPopupNormalParams(obj));

                dispatch(setSelectedRows([], [], []));

                setTimeout(argu => {
                    dispatch(setPopupNormalParams({
                        status: 'none',
                        alertStatus: 'none'
                    }));
                }, 2000);
            });
    }
}

popupNormalActions.fetchNoSelection = 'FETCH_NO_SELECTION';
function fetchNoSelection(callback) {
    callback(true, CONSTANT.noSelect);

    return {
        type: popupNormalActions.fetchNoSelection
    }
}

export function setPermData(permData) {
    return {
        type: popupNormalActions.setPermData,
        permData: permData
    }
}

export function setPermMode(permMode) {
    return {
        type: popupNormalActions.setPermMode,
        permMode: permMode
    }
}

export function setRecursivePerm(isRecursive) {
    return {
        type: popupNormalActions,
        recursivePerm: isRecursive
    }
}

export function setHDFSPath(path) {
    return {
        type: popupNormalActions.setHDFSPath,
        path: path
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

/**
deprecated
*/
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
        ...param
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

export function switchFetchingStatus(status) {
    return {
        type: actionTypes.switchFetchingStatus,
        isFetching: status
    }
}

const fetchCallback = (dispatch, receiveData, data, condition) => {
    dispatch(receiveData(data, condition));
}
function applyFetch(condition, callback) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));
        dispatch(switchFetchingStatus(true));
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
                    response.json() : (response => errorHandler(response, callback, dispatch ))(response),
                error => errorHandler(error, callback, dispatch )
        )
            .then(json => {
                const data = listDataMatch(json ? json.data : {});
                fetchCallback(dispatch, receiveData, data, condition);
                succeedHandler(json, callback, dispatch );
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
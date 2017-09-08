import fetch from 'isomorphic-fetch';
import {getPublishConnectionUrl} from '../utils';
import {getOnOfflineInfoUrl, renderLoadingModal, PILOT_PREFIX} from '../../../utils/utils'

export const actionTypes = {
    selectType: 'SELECT_TYPE',
    navigateTo: 'CHANGE_PAGE_NUMBER',
    changePageSize: 'CHANGE_PAGE_SIZE',

    selectRows: 'SELECT_ROWS',
    clearRows: 'CLEAR_ROWS',
    search: 'SEARCH',

    sendRequest: 'SEND_REQUEST',
    receiveData: 'RECEIVE_DATA',
    invalidateCondition: 'INVALIDATE_CONDITION',

    //for popup only
    setPopupTitle: 'SET_POPUP_TITLE',
    setPopupParam: 'SET_POPUP_PARAM',
    clearPopupParams: 'CLEAR_POPUP_PARAMS',
    changePopupStatus: 'CHNAGE_POPUP_STATUS',

    receiveConnectionNames: 'RECEIVE_CONNECTION_NAMES',
    switchFetchingState: 'SWITCH_FETCHING_STATE'
}

export const connectionTypes = {
    inceptor: 'INCEPTOR',
    HDFS: 'HDFS'
}

const origin = window.location.origin;
const baseURL = origin + '/database/';
const connBaseURL = origin + '/connection/';
const INCEPTORConnectionBaseURL = origin + '/database/';
const HDFSConnectionBaseURL = origin + '/hdfsconnection/';

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

const errorHandler = (error) => {
    return error;
}

const getParamDB = (database) => {
    let db = {};
    let connectionType = (database.connectionType||database.backend);
    if (connectionType ===connectionTypes.inceptor) {
        db.database_name = database.database_name;
        db.sqlalchemy_uri = database.sqlalchemy_uri;
        db.description = database.description;
        db.args = database.databaseArgs;
        db.database_type = connectionType;
    } else {
        db = {
            connection_name: database.connection_name,
            description: database.description,
            httpfs: database.httpfs,
            database_id: database.database_id
        }
    }

    return db;
}

/**
@deprecated
*/
export function invalidateCondition(condition) {
    return {
        type: actionTypes.invalidateCondition,
        condition,
    };
}

export function selectType (type) {
    return {
        type: actionTypes.selectType,
        tableType: type
    }
}

export function navigateTo (pageNumber) {
    return {
        type: actionTypes.navigateTo,
        pageNumber: pageNumber
    }
}

export function changePageSize (pageSize) {
    return {
        type: actionTypes.changePageSize,
        pageSize: pageSize
    }
}

export function selectRows (selectedRowKeys, connToBeDeleted, selectedRowNames) {
    return {
        type: actionTypes.selectRows,
        selectedRowKeys,
        connToBeDeleted,
        selectedRowNames
    }
}

export function clearRows () {
    return {
        type: actionTypes.clearRows
    }
}

export function testConnectionInEditConnectPopup(database, callback) {
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        const URL = origin + PILOT_PREFIX + 'testconn';
        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(database)
        })
        .then(
            response => {
                if(response.ok) {
                    dispatch(switchFetchingState(false));
                    callback(true);

                }else {
                    dispatch(switchFetchingState(false));
                    callback(false);
                }
            }
        );
    }
}

export function fetchInceptorConnectAdd(connect, callback) {

    return (dispatch, getState) => {
        const URL = baseURL + 'add';
        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(connect)
        })
        .then(
            response => response.ok?
                response.json() : ((response)=>errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            if(json.success) {
                dispatch(fetchIfNeeded());
                callback(true);
            }else {
                callback(false, json);
            }
        });
    }
}

export function fetchPublishConnection(record, callback) {
    const url = getPublishConnectionUrl(record);
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: "same-origin"
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(fetchIfNeeded());
                }
            }
        );
    }
}

export function fetchOnOfflineInfo(connectionId, published, connectionType, callback) {
    let prefix = "database";
    if(connectionType === "HDFS") {
        prefix = "hdfsconnection";
    }
    const url = getOnOfflineInfoUrl(connectionId, prefix, published);
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

export function switchFetchingState(isFetching) {
    const loadingModal = renderLoadingModal();
    if(isFetching) {
        loadingModal.show();
    }else {
        loadingModal.hide();
    }
    return {
        type: actionTypes.switchFetchingState,
        isFetching: isFetching
    }
}

/**
@description: add connection in database list

*/
export function applyAdd (callback) {
    return (dispatch, getState) => {
        const inceptorAddURL = baseURL;
        const HDFSAddURL = origin + '/hdfsconnection/';
        let URL;
        const {
            datasetType,

            databaseName,
            sqlalchemyUri,
            databaseArgs,
            descriptionInceptor,

            connectionName,
            databaseId,
            httpfs,
            descriptionHDFS,
        } = getState().popupParam;

        let paramObj = {credentials: 'include', method: 'post'};
        if (datasetType==='INCEPTOR') {
            URL = inceptorAddURL;
            paramObj= {
                ...paramObj,
                body: JSON.stringify({
                    'database_name': databaseName,
                    'sqlalchemy_uri': sqlalchemyUri,
                    'description': descriptionInceptor,
                    'database_type': connectionTypes.inceptor,
                    'args': databaseArgs
                })
            };
        } else {
            URL = HDFSAddURL;
            paramObj= {
                ...paramObj,
                body: JSON.stringify({
                    'connection_name': connectionName,
                    'database_id':databaseId,
                    'httpfs':httpfs,
                    'description':descriptionHDFS
                })
            };
        }
        return fetch(URL+'add', paramObj)
        .then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(fetchIfNeeded());
                }
            }
        );
    }
}

export function applyDelete (callback) {
    return (dispatch, getState) => {
        const URL = connBaseURL + 'muldelete';
        const connToBeDeleted = getState().paramOfDelete.connToBeDeleted;
        dispatch(switchFetchingState(true));
        return fetch(URL, {
            credentials: 'include',
            method: 'post',
            body: JSON.stringify(connToBeDeleted)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if (response.status === 200) {
                    dispatch(fetchIfNeeded(getState().condition));
                }
            }
        );
    }
}

export function fetchConnectDelInfo(connectId, callback) {

    const url = INCEPTORConnectionBaseURL + "delete_info/" + connectId;
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

export function fetchConnectDelMulInfo(callback) {
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        const url = connBaseURL + 'muldelete_info/';
        const connToBeDeleted = getState().paramOfDelete.connToBeDeleted;
        return fetch(url, {
            credentials: 'include',
            method: 'post',
            body: JSON.stringify(connToBeDeleted)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

const getURLBase = (type, subfix) => {
    if (!type) return;
    let URL = '';
    switch (type.toUpperCase()) {
        case 'HDFS':
            URL = HDFSConnectionBaseURL;
            break;
        case 'INCEPTOR':
            URL = INCEPTORConnectionBaseURL;
            break;
        default:
            break;
    }
    return URL + subfix;
}

export function fetchDBDetail(record, callback) {
    const type = record.connection_type;

    return dispatch => {
        const URL = getURLBase(type, 'show/') + record.id;
        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : ((response)=>errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            callback(true, json);
        });
    }
}

export function fetchUpdateConnection(database, callback) {

    return (dispatch, getState) => {
        const URL = getURLBase(database.connectionType, 'edit/') + database.id;
        const db = getParamDB(database);
        dispatch(switchFetchingState(true));
        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(db)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(fetchIfNeeded());
                }
            }
        );
    }
}

export function search (filter) {
    return {
        type: actionTypes.search,
        filter: filter
    };
}

function sendRequest (condition) {
    return {
        type: actionTypes.sendRequest,
        condition
    };
}

function receiveData (condition, json) {
    return {
        type: actionTypes.receiveData,
        condition,
        response: json,
        receivedAt: Date.now()
    };
}

export function fetchTypes (callback) {
    return (dispatch, getState) => {
        const URL = connBaseURL + 'connection_types';
        let types = [];

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : (errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(function(data){
            data.map((obj, index) => {
            //format the data for the options
                types.push({
                    id: index+1,
                    label: obj
                });
            });
            callback(types);
        }, errorHandler);
    };
}

function applyFetch (condition) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));

        const URL = connBaseURL + 'listdata/?' +
            (condition.page? 'page=' + (+condition.page-1) : '') +
            (condition.pageSize? '&page_size=' + condition.pageSize : '') +
            (condition.orderColumn? '&order_column=' + condition.orderColumn : '') +
            (condition.orderDirection? '&order_direction=' + condition.orderDirection : '') +
            (condition.filter? '&filter=' + condition.filter : '') +
            (condition.tableType&&condition.tableType!=='all'? '&table_type=' + condition.tableType : '');

        const dataMatch = json => {
            if(!json.data) return json;
            json.data.map(function(obj, index, arr){
                obj.iconClass = (obj.dataset_type == 'hdfs_folder'? 'HDFS' : obj.dataset_type == 'Inceptor'?'Inceptor' : 'upload');
                obj.elementId = index+1;
            });
            return json;
        }

        return fetch(URL, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : (errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            dispatch(receiveData(condition, dataMatch(json)));
        });
    };
}

function shouldFetch (state, condition) {
    return true;
}

export function fetchIfNeeded (condition) {

    return (dispatch, getState) => {
        const conditionInside = condition || getState().condition;
        if (shouldFetch(getState(), conditionInside)) {
            dispatch(clearRows());
            return dispatch(applyFetch(conditionInside));
        }
        return null;
    };
}

export * as popupActions from './popupAction';
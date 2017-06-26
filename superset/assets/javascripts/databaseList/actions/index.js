import fetch from 'isomorphic-fetch';
import { getEditConData } from '../utils'

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
    changePopupStatus: 'CHNAGE_POPUP_STATUS',

    receiveConnectionNames: 'RECEIVE_CONNECTION_NAMES'
}

const origin = window.location.origin;
const baseURL = origin + '/database/';
const errorHandler = (error) => {
    console.log(error);
    return error;
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

export function selectRows (selectedRowKeys, selectedRowNames) {
    return {
        type: actionTypes.selectRows,
        selectedRowKeys: selectedRowKeys,
        selectedRowNames: selectedRowNames
    }
}

export function clearRows () {
    return {
        type: actionTypes.clearRows
    }
}

/**
@description: this is only for inceptor connection test
*/
export const testConnection = () => {
    return (dispatch) => {
        const URL = origin + '/pilot/testconn';
        const {
            datasetType,
            databaseName,
            sqlalchemyUri
        } = getState().popupParam;

        return fetch(URL, {
            credentials: 'include',
            method: 'post',
            body: JSON.stringify({
                'database_name': databaseName,
                'sqlalchemy_uri':sqlalchemyUri
            })
        })
        .then(
            response => response.ok?
                response.json() : ((response)=>errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            if (json.success) {
                callback(true);
            } else {
                callback(false, json);
            }
        });

    }
}

export function testConnection2(database, callback) {
    return (dispatch, getState) => {
        const URL = origin + '/pilot/testconn';
        const db = getEditConData(database);
        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(db)
        })
        .then(
            response => {
                if(response.ok) {
                    dispatch(fetchIfNeeded());
                    callback(true);
                }else {
                    callback(false);
                }
            }
        );
    }
}

/**
@description: add connection in database list

*/
export function applyAdd (callback) {
    return (dispatch, getState) => {
        const inceptorAddURL = baseURL + 'add/';
        const HDFSAddURL = origin + '/hdfsconnection';
        let URL;
        //{"database_name":"1.198_copy", "sqlalchemy_uri":"inceptor://hive:123"}
        const {
            datasetType,
            databaseName,
            sqlalchemyUri,
            connectionName,
            databaseId,
            verfifyType,
            configFile,
            principal,
            keytabFile
        } = getState().popupParam;

        let paramObj = {credentials: 'include', method: 'post',};
        if (datasetType==='inceptor') {
            URL = inceptorAddURL;
            paramObj= {
                ...paramObj,
                body: JSON.stringify({
                    'database_name': databaseName,
                    'sqlalchemy_uri':sqlalchemyUri
                })
            };
        } else {
            URL = HDFSAddURL;
            paramObj= {
                ...paramObj,
                body: JSON.stringify({
                    'connection_name': connectionName,
                    'database_id':databaseId,
                    'config_file': configFile,
                    'principal':principal,
                    'keytab_file':keytabFile
                })
            };
        }
        return fetch(URL, paramObj)
        .then(
            response => response.ok?
                response.json() : ((response)=>errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            if (json.success) {
                callback(true);
            } else {
                callback(false, json);
            }
        });
    }
}

export function applyDeleteMulti (callback) {
    return (dispatch, getState) => {
        const URL = baseURL + 'muldelete';
        const selectedRowKeys = getState().paramOfDelete.selectedRowKeys;

        return fetch(URL, {
            credentials: 'include',
            method: 'post',
            body: JSON.stringify({
                'selectedRowKeys': selectedRowKeys
            })
        })
        .then(
            response => response.ok?
                response.json() : ((response)=>errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            if (json.success) {
                dispatch(fetchIfNeeded());
                callback(true)
            } else {
                callback(false, json)
            }
        });
    }
}

export function applyDeleteSingle (id, callback) {
    return (dispatch, getState) => {
        const URL = baseURL + 'delete/' + id;
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
            if(json.success) {
                dispatch(fetchIfNeeded());
                callback(true);
            }else {
                callback(false, json);
            }
        });
    }
}

export function fetchDBDetail(id, callback) {
    return dispatch => {
        const URL = baseURL + 'show/' + id;
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
        const URL = baseURL + 'edit/' + database.id;
        const db = getEditConData(database);
        return fetch(URL, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(db)
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

function applyFetch (condition) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));

        const URL = baseURL + 'listdata?' +
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

//        const json = require('./d40cb439062601b83de7.json');
//        dispatch(receiveData(condition, dataMatch(json)));
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
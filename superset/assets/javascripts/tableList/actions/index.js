import fetch from 'isomorphic-fetch';
import {getPublishTableUrl} from '../utils';
import {constructHDFSPreviewUrl} from '../module';
import {getOnOfflineInfoUrl, renderLoadingModal} from '../../../utils/utils'

export const actionTypes = {
    selectType: 'SELECT_TYPE',
    navigateTo: 'CHANGE_PAGE_NUMBER',
    changePageSize: 'CHANGE_PAGE_SIZE',

    selectRows: 'SELECT_ROWS',
    search: 'SEARCH',

    sendRequest: 'SEND_REQUEST',
    receiveData: 'RECEIVE_DATA',
    invalidateCondition: 'INVALIDATE_CONDITION',

    setPopupTitle: 'SET_POPUP_TITLE',
    setPopupParam: 'SET_POPUP_PARAM',

    switchDatasetType: 'SWITCH_DATASET_TYPE',
    switchHDFSConnected: 'SWITCH_HDFS_CONNECTED',
    switchOperationType: 'SWITCH_OPERATION_TYPE',
    switchFetchingState: 'SWITCH_FETCHING_STATE',

    saveDatasetId: 'SAVE_DATASET_ID',
    saveInceptorPreviewData: 'SAVE_INCEPTOR_PREVIEW_DATA',
    saveHDFSDataset: 'SAVE_HDFS_DATASET',
    saveInceptorDataset: 'SAVE_INCEPTOR_DATASET',

    getTableColumn: 'GET_TABLE_COLUMNS',
    getSQLMetric: 'GET_SQL_METRICS',

    clearDatasetData: 'CLEAR_DATASET_DATA'
};

export const datasetTypes = {
    database: 'DATABASE',
    hdfs: 'HDFS',
    uploadFile: 'UPLOAD FILE',
    inceptor: 'INCEPTOR',
    mysql: 'MYSQL',
    oracle: 'ORACLE',
    mssql: 'MSSQL'
};

const baseURL = window.location.origin + '/table/';

const callbackHandler = (response, callback) => {
    if(response.status === 200) {
        callback && callback(true, response.data);
    }else {
        callback && callback(false, response.message);
    }
};
const always = (response) => {
    return Promise.resolve(response);
};
const json = (response) => {
    return response.json();
};

const errorHandler = (response, dispatch) => {
    dispatch(switchFetchingState(false));
};

let fetchingStatus = [];

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

export function selectRows(selectedRowKeys, selectedRowNames) {
   return {
        type: actionTypes.selectRows,
        selectedRowKeys: selectedRowKeys,
        selectedRowNames: selectedRowNames
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
    condition,
  };
}

function receiveData (condition, json) {
  return {
    type: actionTypes.receiveData,
    condition,
    response: json,
    receivedAt: Date.now(),
  };
}

function receiveTableColumn(json) {
    return {
        type: actionTypes.getTableColumn,
        tableColumn: json
    };
}

function receiveSQLMetric(json) {
    return {
        type: actionTypes.getSQLMetric,
        sqlMetric: json
    };
}

export function saveHDFSDataset(json) {
    return {
        type: actionTypes.saveHDFSDataset,
        dsHDFS: json,
        HDFSConfigured: true
    }
}

export function saveInceptorDataset(json) {
    return {
        type: actionTypes.saveInceptorDataset,
        dsInceptor: json
    }
}

export function getTableColumn(dataset_id) {
    const url = window.location.origin + '/tablecolumn/listdata/?dataset_id=' + dataset_id;
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : (response => errorHandler(response, dispatch))(response),
            error => errorHandler(error)
        )
        .then(json => {
            dispatch(receiveTableColumn(json));
            dispatch(switchFetchingState(false));
        });
    }
}

export function fetchTableColumnAdd(column, callback) {
    const url = window.location.origin + '/tablecolumn/add';
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(column)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(getTableColumn(column.dataset_id));
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchTableColumnEdit(column, callback) {
    const url = window.location.origin + '/tablecolumn/edit/' + column.id;
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(column)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(getTableColumn(column.dataset_id));
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchTableColumnDelete(id, callback) {
    const url = window.location.origin + '/tablecolumn/delete/' + id;
    const errorHandler = error => alert(error);
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(function(response) {
            if(response.ok) {
                dispatch(getTableColumn(getState().subDetail.datasetId));
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

export function fetchSQLMetricAdd(metric, callback) {
    const url = window.location.origin + '/sqlmetric/add';
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(metric)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(getSQLMetric(metric.dataset_id));
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchSQLMetricEdit(metric, callback) {
    const url = window.location.origin + '/sqlmetric/edit/' + metric.id;
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(metric)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(getSQLMetric(metric.dataset_id));
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchSQLMetricDelete(id, callback) {
    const url = window.location.origin + '/sqlmetric/delete/' + id;
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(function(response) {
            if(response.ok) {
                dispatch(getSQLMetric(getState().subDetail.datasetId));
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

export function getSQLMetric(dataset_id) {
    const url = window.location.origin + '/sqlmetric/listdata/?dataset_id=' + dataset_id;
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : (response => errorHandler(response, dispatch))(response),
            error => errorHandler(error)
        )
        .then(json => {
            dispatch(receiveSQLMetric(json));
            dispatch(switchFetchingState(false));
        });
    }
}

export function fetchTableDelete(tableId, callback) {
    const url = baseURL + "delete/" + tableId;
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(selectRows([], []));
                    dispatch(applyFetch(getState().condition));
                }
            }
        );
    }
}

export function fetchTableDelInfo(tableId, callback) {
    const url = baseURL + "delete_info/" + tableId;
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchTableDeleteMul(callback) {
    const url = baseURL + "muldelete";
    return (dispatch, getState) => {

        dispatch(switchFetchingState(true));
        const selectedRowKeys = getState().condition.selectedRowKeys;
        let data = {selectedRowKeys: selectedRowKeys};
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(data)
        }).then(always).then(json).then(
            response => {
                callback(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(applyFetch(getState().condition));
                }
            }
        );
    }
}

export function fetchTableDelMulInfo(callback) {
    const url = baseURL + "muldelete_info/";
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        const selectedRowKeys = getState().condition.selectedRowKeys;
        let data = {selectedRowKeys: selectedRowKeys};
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(data)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchDatabaseList(callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = baseURL + 'databases';
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        dispatch(switchFetchingState(false));
                        callback(true, response);
                    });
                }else {
                    dispatch(switchFetchingState(false));
                    callback(false);
                }
            }
        );
    }
}

export function fetchSchemaList(dbId, callback) {
    return (dispatch) => {
        const url = baseURL + 'schemas/' + dbId;
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                        dispatch(switchFetchingState(false));
                    });
                }else {
                    callback(false);
                    dispatch(switchFetchingState(false));
                }
            }
        );
    }
}

export function fetchTableList(dbId, schema, callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = baseURL + 'tables/' + dbId + '/' + schema;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                        dispatch(switchFetchingState(false));
                    });
                }else {
                    callback(false);
                    dispatch(switchFetchingState(false));
                }
            }
        );
    }
}

export function fetchHDFSFileBrowser(path, callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = window.location.origin + '/hdfstable/files/?path=' + path;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        dispatch(switchFetchingState(false));
                        callback(true, response);
                    });
                }else {
                    dispatch(switchFetchingState(false));
                    callback(false);
                }
            }
        );
    }
}

export function fetchUploadFile(data, fileName, path, callback) {
    const url = window.location.origin + '/hdfs/upload/?dest_path=' + path + '&file_name=' + fileName;
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: 'include',
            method: "POST",
            body: data
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function createDataset(dataset, callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = baseURL + 'add';
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(dataset)
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(saveDatasetId(response.data.object_id));
                    dispatch(saveInceptorDataset(dataset));
                }
            }
        );
    }
}

export function editDataset(dataset, id, callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = baseURL + 'edit/' + id;
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(dataset)
        }).then(always).then(json).then(
            response => {
                dispatch(switchFetchingState(false));
                callbackHandler(response, callback);
            }
        );
    }
}

export function saveInceptorPreviewData(data) {
    return {
        type: actionTypes.saveInceptorPreviewData,
        inceptorPreviewData: data
    }
}

export function saveDatasetId(datasetId) {
    return {
        type: actionTypes.saveDatasetId,
        datasetId: datasetId
    }
}

export function clearDatasetData() {
    return {
        type: actionTypes.clearDatasetData
    }
}

export function fetchAddTypeList(callback) {
    return () => {
        const url = baseURL + 'add_dataset_types';
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function fetchFilterTypeList(callback) {
    return () => {
        const url = baseURL + 'filter_dataset_types';
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function fetchInceptorPreviewData(id, callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = baseURL + 'preview_data?dataset_id=' + id;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchHDFSPreviewData(dsHDFS, callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const url = constructHDFSPreviewUrl(dsHDFS);
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
            }
        );
    }
}

export function fetchHDFSConnectList(callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const MAX_PAGE_SIZE = 1000;
        const url = window.location.origin + '/hdfsconnection/listdata?page_size=' + MAX_PAGE_SIZE;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        dispatch(switchFetchingState(false));
                        callback(true, response.data);
                    });
                }else {
                    dispatch(switchFetchingState(false));
                    callback(false);
                }
            }
        );
    }
}

export function fetchInceptorConnectList(callback) {
    return (dispatch) => {
        dispatch(switchFetchingState(true));
        const MAX_PAGE_SIZE = 1000;
        const url = window.location.origin + '/database/listdata?page_size=' + MAX_PAGE_SIZE;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        dispatch(switchFetchingState(false));
                        callback(true, response.data);
                    });
                }else {
                    dispatch(switchFetchingState(false));
                    callback(false);
                }
            }
        );
    }
}

export function fetchCreateHDFSConnect(data, callback) {
    return () => {
        const url = window.location.origin + '/hdfsconnection/add';
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(data)
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true);
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function fetchDatasetDetail(id, callback) {
    return () => {
        const url = baseURL + 'show/' + id;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function fetchDBDetail(id, callback) {
    return () => {
        const url = window.location.origin + '/database/show/' + id;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function fetchHDFSDetail(id, callback) {
    return () => {
        const url = window.location.origin + '/hdfsconnection/show/' + id;
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        callback(true, response);
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function fetchPublishTable(record, callback) {
    const url = getPublishTableUrl(record);
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        return fetch(url, {
            credentials: "same-origin"
        }).then(always).then(json).then(
            response => {
                callbackHandler(response, callback);
                dispatch(switchFetchingState(false));
                if(response.status === 200) {
                    dispatch(applyFetch(getState().condition));
                }
            }
        );
    }
}

export function fetchOnOfflineInfo(datasetId, published, callback) {
    const url = getOnOfflineInfoUrl(datasetId, 'table', published);
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

function applyFetch(condition) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));

        const URL = baseURL + 'listdata?' +
            (condition.page? 'page=' + (condition.page - 1) : '') +
            (condition.pageSize? '&page_size=' + condition.pageSize : '') +
            (condition.orderColumn? '&order_column=' + condition.orderColumn : '') +
            (condition.orderDirection? '&order_direction=' + condition.orderDirection : '') +
            (condition.filter? '&filter=' + condition.filter : '') +
            (condition.tableType&&condition.tableType!=='ALL'? '&dataset_type=' + condition.tableType : '');

        const errorHandler = error => alert(error);
        const dataMatch = json => {
            if(!json.data) return json;
            json.data.map(function(obj, index, arr){
                obj.iconClass = (obj.dataset_type == 'HDFS'? 'HDFS' : obj.dataset_type == 'INCEPTOR'?'Inceptor' : 'upload');
            });
            return json;
        }

        return fetch(URL, {
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
    };
}

function shouldFetch(state, condition) {
  const schema = state.requestByCondition[condition.tableType];
  if (!schema) {
    return true;
  }
  if (schema.isFetching) {
    return false;
  }
  return schema.didInvalidate;
}

export function fetchIfNeeded(condition) {
  return (dispatch, getState) => {
    if (shouldFetch(getState(), condition)) {
      return dispatch(applyFetch(condition));
    }
    return null;
  };
}

export function setPopupTitle (title) {
    return {
        type: actionTypes.setPopupTitle,
        title
    };
}

export function setPopupParam (param) {
    return {
        type: actionTypes.setPopupParam,
        param
    };
}

export function showPopup (param) {
    return (dispatch, getState) => {
        const box = getState().popupParam.popupContainer;
        const container = document.querySelector('.' + box);
        container.style.display = 'flex';
    }
}

export function switchDatasetType (datasetType) {
    return {
        type: actionTypes.switchDatasetType,
        datasetType
    };
}

export function switchHDFSConnected (HDFSConnected) {
    return {
        type: actionTypes.switchHDFSConnected,
        HDFSConnected
    };
}

export function switchOperationType (operationType) {
    return {
        type: actionTypes.switchOperationType,
        operationType
    };
}

export function switchFetchingState(isFetching) {
    const loadingModal = renderLoadingModal();
    if(isFetching) {
        fetchingStatus.push(true);
    }else {
        let index = fetchingStatus.indexOf(true);
        if(index > -1) {
            fetchingStatus.splice(index, 1);
        }
    }
    if(fetchingStatus.indexOf(true) === -1) {
        loadingModal.hide();
    }else {
        loadingModal.show();
    }
    return {
        type: actionTypes.switchFetchingState,
        isFetching: isFetching
    }
}
import fetch from 'isomorphic-fetch';

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

    saveDatasetId: 'SAVE_DATASET_ID',

    getTableColumn: 'GET_TABLE_COLUMNS',
    getSQLMetric: 'GET_SQL_METRICS'
};


const baseURL = window.location.origin + '/table/';

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

export function getTableColumn(dataset_id) {
    const url = window.location.origin + '/tablecolumn/listdata/?dataset_id=' + dataset_id;
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : (response => errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            dispatch(receiveTableColumn(json));
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
        }).then(function(response) {
            if(response.ok) {
                dispatch(getTableColumn(column.dataset_id));
                if(typeof callback === "function") {
                    callback(true);
                }
            }else {
                // if(typeof callback === "function") {
                //     callback(false);
                // }
            }
        });
    }
}

export function fetchTableColumnEdit(column, callback) {
    const url = window.location.origin + '/tablecolumn/edit/' + column.id;
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(column)
        }).then(function(response) {
            if(response.ok) {
                dispatch(getTableColumn(column.dataset_id));
                if(typeof callback === "function") {
                    callback(true);
                }
            }else {
                // if(typeof callback === "function") {
                //     callback(false);
                // }
            }
        });
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
        }).then(function(response) {
            if(response.ok) {
                dispatch(getSQLMetric(metric.dataset_id));
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

export function fetchSQLMetricEdit(metric, callback) {
    const url = window.location.origin + '/sqlmetric/edit/' + metric.id;
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(metric)
        }).then(function(response) {
            if(response.ok) {
                dispatch(getSQLMetric(metric.dataset_id));
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
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        })
        .then(
            response => response.ok?
                response.json() : (response => errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            dispatch(receiveSQLMetric(json));
        });
    }
}

export function fetchTableDelete(tableId, callback) {
    const url = baseURL + "delete/" + tableId;
    const errorHandler = error => alert(error);
    return (dispatch, getState) => {
        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        }).then(function(response) {
            if(response.ok) {
                dispatch(applyFetch(getState().condition));
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

export function fetchTableDeleteMul(callback) {
    const url = baseURL + "muldelete";
    return (dispatch, getState) => {
        const selectedRowKeys = getState().condition.selectedRowKeys;
        let data = {selectedRowKeys: selectedRowKeys};
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(data)
        }).then(function(response) {
            if(response.ok) {
                dispatch(applyFetch(getState().condition));
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

export function fetchDatabaseList(callback) {
    return () => {
        const url = baseURL + 'databases';
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

export function fetchSchemaList(dbId, callback) {
    return () => {
        const url = baseURL + 'schemas/' + dbId;
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

export function fetchTableList(dbId, schema, callback) {
    return () => {
        const url = baseURL + 'tables/' + dbId + '/' + schema;
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

export function createDataset(dataset, callback) {
    return () => {
        const url = baseURL + 'add';
        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(dataset)
        }).then(
            response => {
                if(response.ok) {
                    response.json().then(response => {
                        if(response.success) {
                            callback(true, response.data);
                        }else {
                            callback(false, response.message);
                        }
                    });
                }else {
                    callback(false);
                }
            }
        );
    }
}

export function saveDatasetId(datasetId) {
    return {
        type: actionTypes.saveDatasetId,
        datasetId: datasetId
    }
}

export function fetchTypeList(callback) {
    return () => {
        const url = baseURL + 'dataset_types';
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

function applyFetch(condition) {
    return (dispatch, getState) => {
        dispatch(sendRequest(condition));

        const URL = baseURL + 'listdata?' +
            (condition.page? 'page=' + (condition.page - 1) : '') +
            (condition.pageSize? '&page_size=' + condition.pageSize : '') +
            (condition.orderColumn? '&order_column=' + condition.orderColumn : '') +
            (condition.orderDirection? '&order_direction=' + condition.orderDirection : '') +
            (condition.filter? '&filter=' + condition.filter : '') +
            (condition.tableType&&condition.tableType!=='all'? '&dataset_type=' + condition.tableType : '');

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
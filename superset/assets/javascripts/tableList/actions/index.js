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
    switchOperationType: 'SWITCH_OPERATION_TYPE'
}

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

export function fetchTableDelete(tableId, callback) {
    const url = baseURL + "delete/" + tableId;
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



//////////////////
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
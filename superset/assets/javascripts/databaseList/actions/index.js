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
    setPopupParam: 'SET_POPUP_PARAM'
}

const baseURL = window.location.origin + '/database/';
const errorHandler = error => alert(error);

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

export function applyDelete (callback) {
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
                response.json() : (errorHandler(response))(response),
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
            return dispatch(applyFetch(conditionInside));
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
        //TODO: show the popup
        const box = getState().popupParam.popupContainer;
        const container = document.querySelector('.' + box);
        container.style.display = 'flex';
    }
}
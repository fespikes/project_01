import {actionTypes} from './';


const baseURL = window.location.origin + '/database/';
const errorHandler = error => alert(error);

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

export function changePopupStatus (status) {
    return {
        type: actionTypes.changePopupStatus,
        status
    };
}

export function showPopup (param) {
    return (dispatch, getState) => {
        const title = param.popupTitle;
        dispatch(setPopupTitle(title));

        dispatch(setPopupParam (param));

        return dispatch(changePopupStatus('flex'));
    }
}

export const fetchConnectionNames = (callback) => {
    return (dispatch, getState) => {
        const URL = `${baseURL}listdata?page_size=1000`;
        let connectionNames = [];

        return fetch(URL, {
            credentials: 'include',
            method: 'get'
        })
        .then(
            response => response.ok?
                response.json() : ((response)=>errorHandler(response))(response),
            error => errorHandler(error)
        )
        .then(json => {
            json.data.map((obj, key) => {
                connectionNames.push({
                    id:obj.id,
                    label:obj.database_name
                })
            })
            callback && callback(connectionNames);
            dispatch(receiveConnectionNames(connectionNames));
        });

    }
}

function receiveConnectionNames (connectionNames) {
    return {
        type: actionTypes.receiveConnectionNames,
        connectionNames: connectionNames
    };
}

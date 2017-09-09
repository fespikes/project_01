import { actionTypes } from './';
import { switchFetchingState } from './index';
import { renderLoadingModal, PILOT_PREFIX } from '../../../utils/utils'

const baseURL = window.location.origin + '/database/';
const errorHandler = error => console.log(error);

export function setPopupTitle(title) {
    return {
        type: actionTypes.setPopupTitle,
        title
    };
}

export function setPopupParam(param) {
    return {
        type: actionTypes.setPopupParam,
        param
    };
}

export function clearPopupParams() {
    return {
        type: actionTypes.clearPopupParams,
        params: {
            popupContainer: 'popup',
            title: '',
            content: '',
            deleteTips: '',
            deleteType: '',
            datasetType: '',
            databaseName: '',
            sqlalchemyUri: '',
            databaseArgs: '',
            descriptionInceptor: '',
            descriptionHDFS: '',
            connectionName: '',
            databaseId: '',
            httpfs: '',
            connectionNames: []
        }
    }
}

export function changePopupStatus(status) {
    return {
        type: actionTypes.changePopupStatus,
        status
    };
}

export function showPopup(param) {
    return (dispatch, getState) => {
        const title = param.popupTitle;
        dispatch(setPopupTitle(title));

        dispatch(setPopupParam(param));

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
                response => response.ok ?
                    response.json() : ((response) => errorHandler(response))(response),
                error => errorHandler(error)
        )
            .then(json => {
                json.data.map((obj, key) => {
                    connectionNames.push({
                        id: obj.id,
                        label: obj.database_name
                    })
                })
                callback && callback(connectionNames);
                dispatch(receiveConnectionNames(connectionNames));
            });

    }
}

function receiveConnectionNames(connectionNames) {
    return {
        type: actionTypes.receiveConnectionNames,
        connectionNames: connectionNames
    };
}

/**
@description: this is only for inceptor connection test
*/
export const testConnection = (callback) => {
    return (dispatch, getState) => {
        dispatch(switchFetchingState(true));
        let URL = window.location.origin + PILOT_PREFIX + 'testconn';

        const {datasetType, httpfs, databaseName, sqlalchemyUri, databaseArgs, } = getState().popupParam;

        if (datasetType.toUpperCase() === 'HDFS') {
            URL = window.location.origin + '/hdfsconnection/test/?httpfs=' + httpfs;

            return fetch(URL, {
                credentials: 'include',
                method: 'get'
            }).then(
                response => {
                    if (response.ok) {
                        dispatch(switchFetchingState(false));
                        callback(true);
                    } else {
                        dispatch(switchFetchingState(false));
                        callback(false);
                    }
                }
            );
        }

        return fetch(URL, {
            credentials: 'include',
            method: 'post',
            body: JSON.stringify({
                'database_name': databaseName,
                'sqlalchemy_uri': sqlalchemyUri,
                'args': databaseArgs
            })
        }).then(
            response => {
                if (response.ok) {
                    dispatch(switchFetchingState(false));
                    callback(true);
                } else {
                    dispatch(switchFetchingState(false));
                    callback(false);
                }
            }
        );
    }
}
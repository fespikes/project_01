import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';
import {REHYDRATE} from 'redux-persist/constants';

export default function subDetail(state = {
    //all below are radios
    datasetType: '',     //uploadFile HDFS inceptor
    HDFSConnected: true,
    operationType: 'table',    //table or SQL in inceptor
    datasetId: ''
}, action) {
    switch (action.type) {
        case actionTypes.switchDatasetType:
            return {...state, datasetType: action.datasetType};
            break;
        case actionTypes.switchHDFSConnected:
            return {...state, HDFSConnected: action.HDFSConnected};
            break;
        case actionTypes.switchOperationType:
            return {...state, operationType: action.operationType};
            break;
        case actionTypes.saveDatasetId:
            return {...state, datasetId: action.datasetId};
            break;
        case REHYDRATE:
            return {...state, datasetId: action.payload.subDetail.datasetId};
            break;
        default:
            return state;
    }
}

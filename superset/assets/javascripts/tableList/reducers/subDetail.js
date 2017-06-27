import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';

export default function subDetail(state = {
    //all below are radios
    datasetType: 'INCEPTOR',     //uploadFile HDFS inceptor
    HDFSConnected: false,
    operationType: 'table',    //table or SQL in inceptor
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
        default:
            return state;
    }
}

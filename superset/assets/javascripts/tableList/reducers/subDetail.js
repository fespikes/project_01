import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';
import {REHYDRATE} from 'redux-persist/constants';

export default function subDetail(state = {
    //all below are radios
    datasetType: '',     //uploadFile HDFS inceptor
    HDFSConnected: true,
    datasetId: '',
    dsHDFS: {},
    dsInceptor: {},
    isFetching: false
}, action) {
    switch (action.type) {
        case actionTypes.switchDatasetType:
            return {...state, datasetType: action.datasetType};
            break;
        case actionTypes.switchHDFSConnected:
            return {...state, HDFSConnected: action.HDFSConnected};
            break;
        case actionTypes.saveDatasetId:
            return {...state, datasetId: action.datasetId};
            break;
        case actionTypes.saveHDFSDataset:
            return {...state, dsHDFS: action.dsHDFS};
            break;
        case actionTypes.switchFetchingState:
            return {...state, isFetching: action.isFetching};
            break;
        case REHYDRATE:
            return {...state, ...action.payload.subDetail};
            break;
        case actionTypes.clearDataButId:
            return {...state, ...action.dataset};
            break;
        default:
            return state;
    }
}

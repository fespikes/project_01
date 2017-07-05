import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';
import {REHYDRATE} from 'redux-persist/constants';

export default function subDetail(state = {
    //all below are radios
    datasetType: '',     //uploadFile HDFS inceptor
    HDFSConnected: true,
    datasetId: '',
    dsHDFS: {}
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
        case REHYDRATE:
            if(action.payload.subDetail) {
                return {...state, datasetId: action.payload.subDetail.datasetId};
            }else {
                return {...state, datasetId: ''}
            }
            break;
        default:
            return state;
    }
}

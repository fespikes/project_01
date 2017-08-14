import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';
import {REHYDRATE} from 'redux-persist/constants';

export default function subDetail(state = {
    //all below are radios
    datasetType: '',     //INCEPTOR, HDFS, UPLOAD FILE
    HDFSConnected: true,
    HDFSConfigured: false,
    datasetId: '',
    dsHDFS: {
        dataset_name: '',
        description: '',
        hdfsConnectName: '',
        inceptorConnectName: '',
        hdfsPath: '',
        uploadFileName: '',
        file_type: 'csv',
        separator: ',',
        quote: '\\',
        skip_rows: '0',
        next_as_header: false,
        skip_more_rows: '0',
        charset: 'utf-8'
    },
    dsInceptor: {
        dataset_name: '',
        description: '',
        db_name: '',
        table_name: '',
        sql: ''
    },
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
        case actionTypes.saveInceptorDataset:
            return {...state, dsInceptor: action.dsInceptor};
            break;
        case actionTypes.saveHDFSDataset:
            return {...state, dsHDFS: action.dsHDFS, HDFSConfigured: action.HDFSConfigured};
            break;
        case actionTypes.switchFetchingState:
            return {...state, isFetching: action.isFetching};
            break;
        //case REHYDRATE:
        //    return {...state, ...action.payload.subDetail};
        //    break;
        case actionTypes.clearDatasetData:
            return {
                ...state,
                dsHDFS: {},
                dsInceptor: {},
                dsUpload: {}
            };
            break;
        default:
            return state;
    }
}

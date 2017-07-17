import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';

export default function popupParam(state = {
    popupContainer: 'popup',    //popup container class

    //popup param:
    title: '删除数据库连接',
    content: '',
    deleteTips: '',
    deleteType: '',

    //request param
    //1.datasetType: 'HDFS'
    datasetType: 'inceptor',     //uploadFile HDFS inceptor
    databaseName: '',
    sqlalchemyUri: '',
    connectionParams: '',

    description:'',

    //2.datasetType: 'HDFS'
    connectionName:'',      //连接名  /database/listdata   param-》 page_size:1000
    databaseId:2,      //related to above name
    httpfs:'httpfs',

    connectionNames:[],

    //popup callbacks
    submit: argu=>argu,
    closeDialog: argu=>argu,
    testConnection: argu=>argu,

    status: 'none'//flex, none
}, action) {
    switch (action.type) {
        case actionTypes.setPopupTitle:
            return {...state, title: action.title};
            break;
        case actionTypes.setPopupParam:
            return {...state, ...action.param};
            break;
        case actionTypes.changePopupStatus:
            return {...state, status:action.status};
            break;
        case actionTypes.receiveConnectionNames:
            return {...state, connectionNames: action.connectionNames};
            break;
        default:
            return state;
    }
}

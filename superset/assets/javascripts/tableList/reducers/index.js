import { combineReducers } from 'redux';
import { actionTypes  } from '../actions';
import subDetail from './subDetail';

function condition(state = {
    page: 1,
    pageSize: 10,
    orderDirection: 'desc',//取值 ('desc' or 'asc'),
    filter: '',//搜索字符串,
    tableType: 'all',//选择数据集类型时需要('database','hdfs', 'upload');
    selectedRowKeys: [],
    selectedRowNames: []
}, action) {
    switch (action.type) {
        case actionTypes.navigateTo:
            return {...state, page: action.pageNumber};
            break;
        case actionTypes.changePageSize:
            return {...state, pageSize: action.pageSize};           //TODO
            break;
        case actionTypes.search:
            return {...state, filter: action.filter};
            break;
        case actionTypes.selectType:
            return {...state, tableType: action.tableType};
            break;
        case actionTypes.selectRows:
            return {...state, selectedRowKeys: action.selectedRowKeys, selectedRowNames: action.selectedRowNames};
        default:
            return state;
    }
}

function emitFetch(state = {
    isFetching: false,
    didInvalidate: false,
    response: [],
}, action) {
    switch (action.type) {
        case actionTypes.invalidateCondition:
            return {...state, didInvalidate: true};
        case actionTypes.sendRequest:
            return Object.assign({}, state, {
                isFetching: true,
                didInvalidate: false,
            });
        case actionTypes.receiveData:
            return Object.assign({}, state, {
                isFetching: false,
                didInvalidate: false,
                response: action.response
            });
        default:
        return state;
    }
}

function requestByCondition (state = {}, action) {
    switch (action.type) {
        case actionTypes.invalidateCondition:
        case actionTypes.sendRequest:
        case actionTypes.receiveData:
            return Object.assign({}, state, {
                [action.condition.tableType]: emitFetch(state[action.condition.tableType], action),
            });

        default:
            return state;
    }
}

const rootReducer = combineReducers({
    condition,
    requestByCondition,

    subDetail
});

export default rootReducer;

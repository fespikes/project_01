import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { DashboardAdd, DashboardDelete } from '../popup';
import { message } from 'antd';
import { fetchAvailableSlices, fetchPosts, fetchDashboardDeleteMul, setShowType, setKeyword,
    setPageNumber, setViewMode, fetchDashboardMulDelInfo } from '../actions';

class Operations extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.addDashboard = this.addDashboard.bind(this);
        this.deleteDashboardMul = this.deleteDashboardMul.bind(this);
        this.showAll = this.showAll.bind(this);
        this.showFavorite = this.showFavorite.bind(this);
        this.searchDashboard = this.searchDashboard.bind(this);
        this.clickSearchDashboard = this.clickSearchDashboard.bind(this);
        this.keywordChange = this.keywordChange.bind(this);
        this.switchTableMode = this.switchTableMode.bind(this);
        this.switchGraphMode = this.switchGraphMode.bind(this);
    };

    addDashboard() {

        const { dispatch } = this.props;
        dispatch(fetchAvailableSlices(callback));
        function callback(success, data) {
            if(success) {
                var dashboard = {dashboard_title: '', description: ''};
                var addSlicePopup = render(
                    <DashboardAdd
                        dispatch={dispatch}
                        dashboard={dashboard}
                        availableSlices={data.data.available_slices}
                        enableConfirm={false}/>,
                    document.getElementById('popup_root'));
                if(addSlicePopup) {
                    addSlicePopup.showDialog();
                }
            }
        }
    }

    deleteDashboardMul() {
        const { dispatch, selectedRowNames } = this.props;
        dispatch(fetchDashboardMulDelInfo(callback));
        function callback(success, data) {
            if(success) {
                let deleteType = "multiple";
                let deleteTips = data.length===0 ? '确定删除' + selectedRowNames + '?' : data;
                if(selectedRowNames.length === 0) {
                    deleteType = 'none';
                    deleteTips = '没有选择任何将要删除的记录，请选择！';
                }
                render(
                    <DashboardDelete
                        dispatch={dispatch}
                        deleteType={deleteType}
                        deleteTips={deleteTips}
                    />,
                    document.getElementById('popup_root')
                );
            }else {
                message.error(data, 5);
            }
        }
    }

    switchTableMode() {
        const {dispatch} = this.props;
        dispatch(setViewMode('table'));
    }

    switchGraphMode() {
        const {dispatch} = this.props;
        dispatch(setViewMode('graph'));
    }

    searchDashboard(event) {
        if(event.keyCode === 13) {
            const { dispatch } = this.props;
            dispatch(fetchPosts());
            dispatch(setPageNumber(1));
        }
    }

    clickSearchDashboard() {
        const {dispatch} = this.props;
        dispatch(fetchPosts());
        dispatch(setPageNumber(1));
    }

    keywordChange(event) {
        const { dispatch } = this.props;
        dispatch(setKeyword(event.target.value));
        if(event.target.value === "") {
            dispatch(fetchPosts());
            dispatch(setPageNumber(1));
        }
    }

    showAll() {
        const { dispatch } = this.props;
        dispatch(setPageNumber(1));
        dispatch(setShowType('show_all'));
        dispatch(setKeyword(''));
        dispatch(fetchPosts());
    }

    showFavorite() {
        const { dispatch } = this.props;
        dispatch(setPageNumber(1));
        dispatch(setShowType('show_favorite'));
        dispatch(setKeyword(''));
        dispatch(fetchPosts());
    }

    componentDidMount() {

    }

    render() {
        const { typeName, viewMode } = this.props;
        return (
            <div className="operations">
                <ul className="icon-list">
                    <li onClick={this.addDashboard}><i className="icon icon-plus"/></li>
                    <li onClick={this.deleteDashboardMul}><i className="icon icon-trash"/></li>
                </ul>
                <div className="tab-btn">
                    <button className={typeName === 'show_all' ? 'active' : ''} onClick={this.showAll}>全部</button>
                    <button className={typeName === 'show_favorite' ? 'active' : ''} onClick={this.showFavorite}>
                        <i className={typeName === 'show_favorite' ? 'icon icon-star-active' : 'icon icon-star'}/>收藏
                    </button>
                </div>
                <div className="search-input">
                    <input onKeyUp={this.searchDashboard} onChange={this.keywordChange} className="tp-input" placeholder="search..." />
                    <i className="icon icon-search" onClick={this.clickSearchDashboard}/>
                </div>
                <div className="view-btn">
                    <Link to="/table" onClick={this.switchTableMode}>
                        <i className={viewMode === 'table' ? 'icon icon-table-mode active' : 'icon icon-table-mode'}/>
                    </Link>
                    <Link to="/graph" onClick={this.switchGraphMode}>
                        <i className={viewMode === 'graph' ? 'icon icon-graph-mode active' : 'icon icon-graph-mode'}/>
                    </Link>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

Operations.propTypes = propTypes;
Operations.defaultProps = defaultProps;

export default Operations;
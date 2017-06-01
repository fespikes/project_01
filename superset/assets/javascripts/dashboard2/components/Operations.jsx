import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { fetchAvailableSlices, fetchPosts, fetchDashboardDeleteMul, setShowType, setKeyword, setPageNumber, setViewMode } from '../actions';
import { DashboardAdd, DashboardDelete } from '../../components/popup';

class Operations extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.addDashboard = this.addDashboard.bind(this);
        this.deleteDashboardMul = this.deleteDashboardMul.bind(this);
        this.importDashboard = this.importDashboard.bind(this);
        this.exportDashboard = this.exportDashboard.bind(this);
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
        const deleteType = "multiple";
        const { dispatch, selectedRowNames } = this.props;
        var deleteSlicePopup = render(
            <DashboardDelete
                dispatch={dispatch}
                deleteType={deleteType}
                deleteTips={selectedRowNames} />,
            document.getElementById('popup_root'));
        if(deleteSlicePopup) {
            deleteSlicePopup.showDialog();
        }
    }

    importDashboard() {

    }

    exportDashboard() {

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
                    <li onClick={this.addDashboard}><i className="icon"></i></li>
                    <li onClick={this.deleteDashboardMul}><i className="icon"></i></li>
                    <li onClick={this.importDashboard}><i className="icon"></i></li>
                    <li onClick={this.exportDashboard}><i className="icon"></i></li>
                </ul>
                <div className="tab-btn">
                    <button className={typeName === 'show_all' ? 'active' : ''} onClick={this.showAll}>全部</button>
                    <button className={typeName === 'show_favorite' ? 'active' : ''} onClick={this.showFavorite}>
                        <i className="icon"></i>收藏</button>
                </div>
                <div className="search-input">
                    <input onKeyUp={this.searchDashboard} onChange={this.keywordChange} placeholder="search..." />
                    <i className="icon" onClick={this.clickSearchDashboard}></i>
                </div>
                <div className="view-btn">
                    <Link to="/table" onClick={this.switchTableMode}><i className={viewMode === 'table' ? 'icon active' : 'icon'}></i></Link>
                    <Link to="/graph" onClick={this.switchGraphMode}><i className={viewMode === 'graph' ? 'icon active' : 'icon'}></i></Link>
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
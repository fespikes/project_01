import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchAvailableSlices, fetchPosts, fetchDashboardDeleteMul, setShowType, setKeyword, setPageNumber } from '../actions';
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
                        availableSlices={data.data.available_slices}/>,
                    document.getElementById('popup_root'));
                if(addSlicePopup) {
                    addSlicePopup.showDialog();
                }
            }
        }
    }

    deleteDashboardMul() {
        //dispatch(fetchDashboardDeleteMul());
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

    searchDashboard(event) {
        if(event.keyCode === 13) {
            const { dispatch } = this.props;
            dispatch(setKeyword(event.target.value));
            dispatch(fetchPosts());
        }
    }

    showAll() {
        const { dispatch } = this.props;
        dispatch(setPageNumber(0));
        dispatch(setShowType('show_all'));
        dispatch(setKeyword(''));
        dispatch(fetchPosts());
    }

    showFavorite() {
        const { dispatch } = this.props;
        dispatch(setPageNumber(0));
        dispatch(setShowType('show_favorite'));
        dispatch(setKeyword(''));
        dispatch(fetchPosts());
    }

    componentDidMount() {

    }

    render() {
        const { typeName } = this.props;
        return (
            <div className="dashboard-operation">
                <ul className="icon-list">
                    <li id="add" onClick={this.addDashboard}><i className="icon"></i></li>
                    <li id="delete" onClick={this.deleteDashboardMul}><i className="icon"></i></li>
                    <li id="upload" onClick={this.importDashboard}><i className="icon"></i></li>
                    <li id="download" onClick={this.exportDashboard}><i className="icon"></i></li>
                </ul>
                <div className="tab-btn">
                    <button id="showAll" className={typeName === 'show_all' ? 'active' : ''} onClick={this.showAll}>全部</button>
                    <button id="showFavorite" className={typeName === 'show_favorite' ? 'active' : ''} onClick={this.showFavorite}><i className="icon"></i>收藏</button>
                </div>
                <div className="search-input">
                    <input id="searchInput" onKeyUp={this.searchDashboard} placeholder="search..." />
                    <i className="icon"></i>
                </div>
                <div className="operation-btn">
                    <button id="shrink"><i className="icon active"></i></button>
                    <button id="enlarge"><i className="icon active"></i></button>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {
    typeName: 'show_all'
};

Operations.propTypes = propTypes;
Operations.defaultProps = defaultProps;

const mapStateToProps = (state) => {
    return {
        typeName: state.configs.type,
        selectedRowKeys: state.configs.selectedRowKeys,
        selectedRowNames: state.configs.selectedRowNames
    }
};

export default connect(mapStateToProps)(Operations);
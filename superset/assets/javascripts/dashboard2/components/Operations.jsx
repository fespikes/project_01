import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import { fetchAvailableSlices, fetchPosts, showAll, showFavorite, setKeyword } from '../actions';
import { DashboardAdd } from '../../components/popup';

const propTypes = {};
const defaultProps = {
    typeName: 'show_all'
};

class Operations extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.addSlice = this.addSlice.bind(this);
        this.deleteSlices = this.deleteSlices.bind(this);
        this.importDashboard = this.importDashboard.bind(this);
        this.exportDashboard = this.exportDashboard.bind(this);
        this.showAll = this.showAll.bind(this);
        this.showFavorite = this.showFavorite.bind(this);
        this.searchSlice = this.searchSlice.bind(this);
    };

    addSlice() {

        const { dispatch, typeName, pageSize } = this.props;
        let url = window.location.origin + "/dashboard/addablechoices";
        dispatch(fetchAvailableSlices(url, callback));
        function callback(success, data) {
            if(success) {
                var slice = {dashboard_title: '', description: ''};
                var addSlicePopup = render(
                    <DashboardAdd
                        dispatch={dispatch}
                        slice={slice}
                        availableSlices={data.data.available_slices}
                        pageSize={pageSize}
                        typeName={typeName}/>,
                    document.getElementById('popup_root'));
                if(addSlicePopup) {
                    addSlicePopup.showDialog();
                }
            }
        }
    }

    deleteSlices() {

    }

    importDashboard() {

    }

    exportDashboard() {

    }

    searchSlice(event) {
        if(event.keyCode === 13) {
            const { dispatch, pageSize, typeName } = this.props;
            let url = window.location.origin + "/dashboard/listdata?page=0&page_size=" + pageSize + "&filter=" + event.target.value;
            if(typeName === "show_favorite") {
                url += "&only_favorite=1"
            }
            dispatch(setKeyword(event.target.value));
            dispatch(fetchPosts(url));
        }
    }

    showAll() {
        const { dispatch, pageSize } = this.props;
        let url = window.location.origin + "/dashboard/listdata?page=0&page_size=" + pageSize;
        dispatch(showAll());
        dispatch(setKeyword(''));
        dispatch(fetchPosts(url));
    }

    showFavorite() {
        const { dispatch, pageSize } = this.props;
        let url = window.location.origin + "/dashboard/listdata?page=0&page_size=" + pageSize + "&only_favorite=1";
        dispatch(showFavorite());
        dispatch(setKeyword(''));
        dispatch(fetchPosts(url));
    }

    componentDidMount() {

    }

    render() {
        const { typeName } = this.props;
        return (
            <div className="dashboard-operation">
                <button id="add" className="btn btn-default" onClick={this.addSlice}>+</button>
                <button id="delete" className="btn btn-default" onClick={this.deleteSlices}>-</button>
                <button id="upload" className="btn btn-default" onClick={this.importDashboard}>import</button>
                <button id="download" className="btn btn-default" onClick={this.exportDashboard}>export</button>
                <button id="showAll" className={typeName === 'show_all' ? 'btn-primary' : 'btn-default'} onClick={this.showAll}>全部</button>
                <button id="showFavorite" className={typeName === 'show_favorite' ? 'btn-primary' : 'btn-default'} onClick={this.showFavorite}>收藏</button>
                <input id="searchInput" onKeyUp={this.searchSlice} placeholder="search..." />
                <button id="shrink" className="btn btn-default">shrink</button>
                <button id="enlarge" className="btn btn-default">enlarge</button>
            </div>
        );
    }
}

Operations.propTypes = propTypes;
Operations.defaultProps = defaultProps;

const mapStateToProps = (state) => {
    return {
        typeName: state.types.type
    }
};

export default connect(mapStateToProps)(Operations);
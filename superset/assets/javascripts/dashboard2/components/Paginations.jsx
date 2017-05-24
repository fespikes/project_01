import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import { addSliceAction, editSliceAction, publishSliceAction, deleteSliceAction, fetchPosts } from '../actions';
import { Pagination } from 'antd';
import 'antd/dist/antd.css';

const propTypes = {
    dispatch: PropTypes.func.required
};
const defaultProps = {};

class Paginations extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        };
        // bindings

    };

    componentDidMount() {

        const { pageSize, dispatch } = this.props;
        function getSliceList() {
            let url = window.location.origin + "/dashboard/listdata/?page=0&page_size=" + pageSize;
            dispatch(fetchPosts(url));
        }

        getSliceList();
    }

    render() {
        const { dispatch, pageSize, type } = this.props;
        const total = Math.ceil(this.props.count / pageSize);
        //onChange();
        function onChange(page) {
            if(!page) {
                let page = 1;
            }
            let url = window.location.origin + "/dashboard/listdata/?page=" + (page-1) + "&page_size=" + pageSize;
            if(type === "show_favorite") {
                url += "&only_favorite=1";
            }
            dispatch(fetchPosts(url));
        }
        return (
            <div className="dashboard-paging">
                <Pagination
                    defaultCurrent={1}
                    pageSize={pageSize}
                    total={total}
                    onChange={onChange} />
            </div>
        );
    }
}

Paginations.propTypes = propTypes;
Paginations.defaultProps = defaultProps;

function mapStateToProps(state) {
    console.log("pagination-state=", state);
    return {
        dataSource: state.posts.params.data || [],
        count: state.posts.params.count,
        type: state.types.type,
    }
}

export default connect(mapStateToProps)(Paginations);
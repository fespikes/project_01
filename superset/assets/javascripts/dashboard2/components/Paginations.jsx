import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchPosts, setPageNumber, setPageSize } from '../actions';
import { Pagination } from 'antd';
import 'antd/lib/pagination/style';

class Paginations extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings

    };

    componentDidMount() {
        const { dispatch } = this.props;
        dispatch(fetchPosts());
    }

    render() {

        const { dispatch, pageSize} = this.props;
        const total = Math.ceil(this.props.count / pageSize);

        function onChange(page) {
            dispatch(setPageNumber(page - 1));
            dispatch(fetchPosts());
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

const propTypes = {};
const defaultProps = {};

Paginations.propTypes = propTypes;
Paginations.defaultProps = defaultProps;

function mapStateToProps(state) {

    return {
        dataSource: state.posts.params.data || [],
        count: state.posts.params.count,
        type: state.configs.type,
        keyword: state.configs.keyword,
        pageSize: state.configs.pageSize
    }
}

export default connect(mapStateToProps)(Paginations);
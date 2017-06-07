import React from 'react';
import { render } from 'react-dom';
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

        const { dispatch, pageSize, count, pageNumber} = this.props;

        function onChange(page) {
            dispatch(setPageNumber(page));
            dispatch(fetchPosts());
        }

        function onShowSizeChange(current, size) {
            dispatch(setPageSize(size));
            dispatch(fetchPosts());
        }

        return (
            <Pagination
                showQuickJumper
                showSizeChanger
                pageSize={pageSize}
                total={count}
                current={pageNumber}
                onChange={onChange}
                onShowSizeChange={onShowSizeChange}
            />
        );
    }
}

const propTypes = {};
const defaultProps = {};

Paginations.propTypes = propTypes;
Paginations.defaultProps = defaultProps;

export default Paginations;

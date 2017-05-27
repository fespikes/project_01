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

        const { dispatch, pageSize, count} = this.props;

        function onChange(page) {
            dispatch(setPageNumber(page - 1));
            dispatch(fetchPosts());
        }
        return (
            <div className="dashboard-paging">
                <Pagination
                    defaultCurrent={1}
                    pageSize={pageSize}
                    total={count}
                    onChange={onChange} />
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

Paginations.propTypes = propTypes;
Paginations.defaultProps = defaultProps;

export default Paginations;

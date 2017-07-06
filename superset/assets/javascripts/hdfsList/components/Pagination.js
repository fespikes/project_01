import React from 'react';
import ReactDOM from 'react-dom';
import { Pagination } from 'antd';
import PropTypes from 'prop-types';
import { navigateTo, changePageSize} from '../actions';

class SlicePagination extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {}
        this.dispatch = context.dispatch

    }

    render() {
        const { pageSize, count, pageNumber } = this.props;
        const dispatch = this.dispatch;

        function onChange(page) {
            dispatch(navigateTo(page));
        }

        function onShowSizeChange(current, size) {
            dispatch(changePageSize(size));
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

SlicePagination.propTypes = {};
SlicePagination.contextTypes = {
    dispatch: PropTypes.func.isRequired
};
export default SlicePagination;
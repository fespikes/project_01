import React from 'react';
import ReactDOM from 'react-dom';
import { Pagination } from 'antd';
import PropTypes from 'prop-types';
import { navigateTo, changePageSize} from '../actions';

class SlicePagination extends React.Component {
  constructor(props) {
    super(props);
    this.state = {}
  }

  render() {
      const { dispatch, pageSize, count, pageNumber} = this.props;

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

export default SlicePagination;
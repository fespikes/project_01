
import React from 'react';
import ReactDOM from 'react-dom';

import { Pagination } from 'antd';

import PropTypes from 'prop-types';

class SlicePagination extends React.Component {
  constructor(props) {
    super(props);

    // console.log( 'props', props );

    this.state = {
    	'defaultCurrent': props.defaultCurrent,
    	'total': props.total,
      'pageSizeOptions': props.pageSizeOptions
    }
  }

  render(argus) { 
    // console.log(argus, this.props, 'in Pagination.render')

    const { loading, selectedRowKeys } = this.state;
    const { onPagination, defaultCurrent, total } = this.props;

    //when page size been modified
    const onShowSizeChange = (pageNumber, pageSize) => {
      // console.log( 'onShowSizeChange:', 'pageNumber:', pageNumber, 'pageSize:', pageSize );
    }

    //when page id been modified
    function onChange(pageNumber) {
      // console.log('onChange, pageNumber: ', pageNumber);
      onPagination(pageNumber);
    }

    return (
      <div className="dashboard-paging">
        <Pagination
        	showQuickJumper
        	showSizeChanger

          // pageSizeOptions={[ '3','10', '20', '30', '40', '50']}
          // showTotal={total => `Total ${total} items`}
        	onShowSizeChange={onShowSizeChange}
          onChange={onChange}
        	defaultCurrent={defaultCurrent}
        	total={total}
          pageSize={3} />
        </div>
    );
  }
}

SlicePagination.propTypes = {
  defaultCurrent: PropTypes.any.isRequired,
  total: PropTypes.any.isRequired
};

export default SlicePagination;
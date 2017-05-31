
import React from 'react';
import ReactDOM from 'react-dom';

import { Pagination } from 'antd';

import PropTypes from 'prop-types';

class SlicePagination extends React.Component {
  constructor(props) {
    super(props);

    // console.log( 'props', props );
    this.state = { }

    this.onChange = this.onChange.bind(this);
    this.onAdd = this.onAdd.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onFilter = this.onFilter.bind(this);
  }

  componentDidMount() {
  }

  onChange() {
    if( this.refs.searchField.value ){
      this.refs.searchButton.removeAttribute('disabled');
      this.setState({
        searchValue: this.refs.searchField.value
      });
    } else {
      this.refs.searchButton.setAttribute('disabled', 'disabled');
      this.props.onSearch();
    }
  }

  onAdd() {
    const me = this;
    const {onAdd} = me.props;
    onAdd && onAdd();
  }

  onDelete() {
    const me = this;
    const {onDelete} = me.props;
    onDelete && onDelete();
  }

  onSearch() {
    const me = this;

    if(!this.state.searchValue){
      return;
    }

    const {onSearch} = me.props;
    onSearch && onSearch({
      filter: me.state.searchValue
    });

  }

  onFilter(argus) {
    this.props.onSearch({
      onlyFavorite: argus
    });
    console.log('onFilter:', argus);
  }

  render(argus) {

    const { loading, selectedRowKeys } = this.state;
    const me = this;

    //when page size been modified
    const onShowSizeChange = (pageNumber, pageSize) => {
      // console.log( 'onShowSizeChange:', 'pageNumber:', pageNumber, 'pageSize:', pageSize );
    }

    //when page id been modified
    function onChange(pageNumber) {
      // console.log('onChange, pageNumber: ', pageNumber);
    }

    function showTotal(total) {
      return `Total ${total} items`;
    }

    return (
      <div className="dashboard-operation">
          <ul className="icon-list">
              <li id="add" onClick={this.onAdd}><i className="icon"></i></li>
              <li id="delete" onClick={this.onDelete}><i className="icon"></i></li>
          </ul>
          <div className="tab-btn">
              <button id="showAll" className={'active'} onClick={()=>this.onFilter(1)}>全部</button>
              <button id="showFavorite" className={''} onClick={()=>this.onFilter(0)}><i className="icon"></i>收藏</button>
          </div>
          <div className="search-input">
              <input id="searchInput" onKeyUp={this.searchSlice} placeholder="search..." />
              <i className="icon"></i>
          </div>
      </div>
    );
  }
}

SlicePagination.propTypes = {
  defaultCurrent: PropTypes.any.isRequired,
  total: PropTypes.any.isRequired
};

SlicePagination.defaultProps = {
  defaultCurrent: '',
  total: ''
}

export default SlicePagination;
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table, Input, Button, Icon } from 'antd';

const data = [{
  key: '1',
  name: 'John Brown',
  rowId: 'rowId001',
  age: 32,
  address: 'New York No. 1 Lake Park',
}, {
  key: '2',
  name: 'Joe Black',
  rowId: 'rowId002',
  age: 42,
  address: 'London No. 1 Lake Park',
}, {
  key: '3',
  name: 'Jim Green',
  rowId: 'rowId003',
  age: 32,
  address: 'Sidney No. 1 Lake Park',
}, {
  key: '4',
  name: 'Jim Red',
  rowId: 'rowId004',
  age: 32,
  address: 'London No. 2 Lake Park',
}];

class SubPreview extends Component {
  state = {
    filterDropdownVisible: false,
    data,
    searchText: '',
    filtered: false,
  };
  onInputChange = (e) => {
    this.setState({ searchText: e.target.value });
  }
  onSearch = () => {
    const { searchText } = this.state;
    const reg = new RegExp(searchText, 'gi');
    this.setState({
      filterDropdownVisible: false,
      filtered: !!searchText,
      data: data.map((record) => {
        const match = record.name.match(reg);
        if (!match) {
          return null;
        }
        return {
          ...record,
          name: (
            <span>
              {record.name.split(reg).map((text, i) => (
                i > 0 ? [<span className="highlight">{match[0]}</span>, text] : text
              ))}
            </span>
          ),
        };
      }).filter(record => !!record),
    });
  }

  render() { const me = this;
const columns = [{
  title: 'Name',
  dataIndex: 'name',
  key: 'name',
  filterDropdown: (
    <div className="custom-filter-dropdown">
      <Input
        ref={ele => this.searchInput = ele}
        placeholder="Search here..."
        value={this.state.searchText}
        onChange={this.onInputChange}
        onPressEnter={this.onSearch}
      />
      <Button type="primary" onClick={this.onSearch}>Search</Button>
    </div>
  ),
  filterIcon: <Icon type="smile-o" style={{ color: this.state.filtered ? '#108ee9' : '#aaa' }} />,
  filterDropdownVisible: this.state.filterDropdownVisible,
  onFilterDropdownVisibleChange: (visible) => {
    this.setState({
      filterDropdownVisible: visible,
    }, () => this.searchInput.focus());
  },
}, {
  title: 'Age',
  dataIndex: 'age',
  key: 'age',
}, {
  title: 'Address',
  dataIndex: 'address',
  key: 'address',
  filters: [{
    text: 'London',
    value: 'London',
  }, {
    text: 'New York',
    value: 'New York',
  }],
  onFilter: (value, record) => record.address.indexOf(value) === 0,
}];

const ownColumns = [{
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    filterDropdown: (
    <div className="custom-filter-dropdown">
      <Input
        ref={ele => this.searchInput = ele}
        placeholder="Search here..."
        value={this.state.searchText}
        onChange={this.onInputChange}
        onPressEnter={this.onSearch}
      />
      <Button type="primary" onClick={this.onSearch}>Search</Button>
    </div>
    ),
    filterIcon: <Icon type="smile-o" style={{ color: this.state.filtered ? '#108ee9' : '#aaa' }} />,
    filterDropdownVisible: this.state.filterDropdownVisible,
    onFilterDropdownVisibleChange: (visible) => {
    this.setState({
      filterDropdownVisible: visible,
    }, () => this.searchInput.focus());
    },
  }, {
  title: '行ID',
  dataIndex: 'rowId',
  key: 'rowId',
  filterDropdown: (
      <div className="custom-filter-dropdown">
        <Input
          ref={ele => this.searchInput = ele}
          placeholder="Search here..."
          value={this.state.searchText}
          onChange={this.onInputChange}
          onPressEnter={this.onSearch}
        />
        <Button type="primary" onClick={this.onSearch}>Search</Button>
      </div>
    ),
  filterIcon: <Icon type="smile-o" style={{ color: this.state.filtered ? '#108ee9' : '#aaa' }} />,
  filterDropdownVisible: me.state.filterDropdownVisible,
  onFilterDropdownVisibleChange: (visible) => {
    me.setState({
      filterDropdownVisible: visible,
    }, () => this.searchInput.focus());
  },
}, {
  title: 'Age',
  dataIndex: 'age',
  key: 'age',
}, {
  title: 'Address',
  dataIndex: 'address',
  key: 'address',
  filters: [{
    text: 'London',
    value: 'London',
  }, {
    text: 'New York',
    value: 'New York',
  }],
  onFilter: (value, record) => record.address.indexOf(value) === 0,
}];

    return <Table columns={ownColumns} dataSource={this.state.data} />;
  }
}

export default SubPreview;
import React from 'react';
import ReactDOM from 'react-dom';
import { message, Table, Icon } from 'antd';

import PropTypes from 'prop-types';

function getDataSource(argus) {
  let arr = [];
  let obj = {};
  if(!argus.dataSource || argus.dataSource.length==0) return;

  argus.dataSource.map(function(value, index, array) {
    obj = {
      key: value.id,
      slice_name: value.slice_name,
      viz_type: value.viz_type,
      datasource: value.datasource,
      created_by_user: value.created_by_user,
      online: value.online,
      changed_on: value.changed_on,
      id: value.id,

      // name: slice_name + slice_url + description
      slice_url: value.slice_url,
      description: value.description
    };
    arr.push(obj);
  });
  return arr;
}

        function editDashboard(record) {

        }

        function deleteDashboard(record) {

        }

        function publishDashboard(record) {

        }
        function favoriteSlice(record) {
            // dispatch(fetchStateChange(record, "favorite"));
        }
const columns = [
{
  title: '',
  dataIndex: 'favorite',
  key: 'favorite',
  width: '5%',
  render: (text, record) => {
      return (
          <i className={record.favorite ? 'star-selected icon' : 'star icon'}
             onClick={() => favoriteSlice(record)}></i>
      )
  }
},
{
  title: '名称',  //TODO: title need to i18n
  key: 'name',
  render: (text, record) => {
    return (
      <span>
        <a target="_blank" href={record.slice_url}>{record.slice_name}</a>
        <br />{record.description}
      </span>
    )
  },
  sorter: (a, b) => a.slice_name-b.slice_name,
  width: '10%'
}, {
  title: '图标类型',
  dataIndex: 'viz_type',
  key: 'viz_type',
  sorter: (a, b) => a.viz_type-b.viz_type,
  width: '15%'
}, {
  title: '数据集',
  dataIndex: 'datasource',
  key: 'datasource',
  sorter: (a, b) => a.datasource-b.datasource,
  width: '15%'
}, {
  title: '所有者',
  dataIndex: 'created_by_user',
  key: 'created_by_user',
  width: '15%',
  sorter: (a, b) => a.created_by_user-b.created_by_user
}, {
  title: '发布状态',
  dataIndex: 'online',
  key: 'online',
  width: '10%',
  sorter: (a, b) => a.online-b.online,
  render: (text, record) => record.online?'已发布':'未发布'
}, {
  title: '最后修改时间',
  dataIndex: 'changed_on',
  key: 'changed_on',
  width: '15%',
  sorter: (a, b) => a.changed_on-b.changed_on
}, {
  title: '操作',
  key: 'action',
  width: '15%',
  render: (record) => {
      return (
          <div className="icon-group">
              <i className="icon" onClick={() => editDashboard(record)}></i>&nbsp;
              <i className={record.online ? 'icon online' : 'icon offline'}
                 onClick={() => publishDashboard(record)}></i>&nbsp;
              <i className="icon" onClick={() => deleteDashboard(record)}></i>
          </div>
      )
  }
}]

class SliceTable extends React.Component {
  constructor(props) {
    super(props);
    const defaultCurrent = 2;

    this.state = {
      selectedRowKeys: [],  // Check here to configure the default column
    }

    this.onSelectChange = this.onSelectChange.bind(this)
  }

  onSelectChange = (selectedRowKeys, selectedRows) => {
    this.setState({ selectedRowKeys });

    const {onSelectChange} = this.props;
    onSelectChange && onSelectChange(this.getSelectedRowKeys.bind(this))
  }

  getSelectedRowKeys() {
    return this.state.selectedRowKeys;
  }

  render() {

    const { selectedRowKeys } = this.state;
    const { dataSource } = this.props;

    const rowSelection = {
      // selectedRowKeys,
      onChange: this.onSelectChange,

      // onSelect: (record, selected, selectedRows) => {
      //   console.log(record, selected, selectedRows);
      // },
      
      // onSelectAll: (selected, selectedRows, changeRows) => {
      //   console.log(selected, selectedRows, changeRows);
      // }
    };


    const onChange = (pagination, filters, sorter)=> {
      console.log('params in onChange:', pagination, filters, sorter);
      console.log( rowSelection, 'is rowSelection')
    }

    const onShowSizeChange = (current, pageSize) => {
      console.log(current, pageSize);
    }

    return (
      <div className="dashboard-table">
        <Table
          onChange={onChange}
          rowSelection={rowSelection}
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          rowKey={record => record.id}
          bordered
        />
      </div>
    );
  }
}

export default SliceTable;
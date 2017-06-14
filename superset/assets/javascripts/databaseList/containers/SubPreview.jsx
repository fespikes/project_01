import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table, Input, Button, Icon } from 'antd';

const getData = (length) => {
    length = length||12;
    let arr = [];
    for( let i=length; i--;) {
        arr.push({
            key: i,
            rowId: 'rowId'+i,
            orderId: 'orderId'+i,
            orderDate: 'orderDate'+i,
            shippingDate: 'shippingDate'+i,
            shippingType: 'shippingType'+i,
            customerID: 'customerID'+i,
            customerName: 'customerName'+i,
            customerType: 'customerType'+i,
            zipCode: 200001+i,
            customerCity: 'customerCity'+i
        });
    }
    return arr;
};

const data = getData();

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

    onCellClick (a, b) {
        console.log(a, b, 'in onCellClick');
    }


    onRowClick (a, b) {return;
        console.log(a, b, 'in onRowClick');
    }

    render() {
        const me = this;

        const ownColumns = [{
            title: '行ID',
            dataIndex: 'rowId',
            key: 'rowId',
            width: '8%'
        }, {
            title: '订单ID',
            dataIndex: 'orderId',
            key: 'orderId',
            width: '8%'
        }, {
            title: '订购日期',
            dataIndex: 'orderDate',
            key: 'orderDate',
            width: '8%'
        }, {
            title: '装运日期',
            dataIndex: 'shippingDate',
            key: 'shippingDate',
            width: '12%'
        }, {
            title: '装运方式',
            dataIndex: 'shippingType',
            key: 'shippingType',
            width: '12%'
        },{
            title: '客户ID',
            dataIndex: 'customerID',
            key: 'customerID',
            width: '10%'
        },{
            title: '客户名称',
            dataIndex: 'customerName',
            key: 'customerName',
            width: '12%',
            onCellClick:me.onCellClick
        },{
            title: '客户种类',
            dataIndex: 'customerType',
            key: 'customerType',
            width: '12%'
        },{
            title: '邮政编码',
            dataIndex: 'zipCode',
            key: 'zipCode',
            width: '8%'
        },{
            title: '城市',
            dataIndex: 'customerCity',
            key: 'customerCity',
            width: '10%'
        }];

        return <Table
            columns={ownColumns}
            dataSource={this.state.data}
            size='small'
            pagination={false}
            onRowClick={me.onRowClick}
        />;
    }
}

export default SubPreview;
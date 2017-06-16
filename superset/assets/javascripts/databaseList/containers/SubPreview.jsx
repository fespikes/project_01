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
    }


    onRowClick (a, b) {return;
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

        return (
            <div>
                <div style={{width:'100%', height:'30px', background:'#fff', marginTop:'-2px'}}> </div>
                <Table
                    columns={ownColumns}
                    dataSource={this.state.data}
                    size='small'
                    pagination={false}
                    onRowClick={me.onRowClick}
                    scroll={{ y: 350 }}
                />

                <div className="data-detail-preview">
                    <div className="data-detail-border">
                        <label className="data-detail-item">
                            <span>type：</span>
                            <input type="text" defaultValue="Separated values(CSV,TSV,...)" />
                        </label>
                        <label className="data-detail-item">
                            <span>Quoting style：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span>Separator：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span>Quoting character：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span>Skip first lines：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id=""/>
                                <p>Parse next line as column headers </p>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>Skip next lines：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span>Charset：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span>arrayMapFormat：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span>arrayItemSeparator：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span>mapKeySeparator：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span>Date serialization format：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span>File Compression：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span>Bad data type behavior (read)：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span>Bad data type behavior (write)：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id="" />
                                <p>Normalize booleans Normalize all possible boolean values (0, 1, yes, no, …) to 'true' and 'false' </p>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id="" />
                                <p>Normalize floats & doubles Normalize floating point values (force '42' to '42.0')</p>
                            </div>
                        </label>

                        <label className="data-detail-item">
                            <span>Add. columns behavior (read)：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"></i>
                        </label>
                    </div>
                    <label className="sub-btn">
                        <input type="button" defaultValue="保存" />
                    </label>
                </div>
            </div>
        );
    }
}

export default SubPreview;
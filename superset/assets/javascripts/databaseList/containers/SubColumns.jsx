import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table, Input, Button, Icon } from 'antd';

const getData = (length) => {
    length = length||12;
    let arr = [];
    for( let i=length; i--;) {
        arr.push({
            key: i,
            row: 'row'+i,
            type: 'type'+i,
            groupAble: 'groupAble'+i,
            filterAble: 'filterAble'+i,
            accountAble: 'accountAble'+i,
            sumAble: 'sumAble'+i,
            minimumSeekAble  : 'minimumSeekAble'+i,
            maximumSeekAble: 'maximumSeekAble'+i,
            timeExpressAble: 'timeExpressAble'+i,
            customerCity: 'customerCity'+i,
            online: Math.random()>0.5
        });
    }
    return arr;
};

const data = getData();

class SubColumns extends Component {
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

    addTableColumn (argus) {
        //TODO: show popup
        alert('TODO: add table column');
    }

    onCellClick (a, b) {
        console.log(a, b, 'in onCellClick');
    }


    onRowClick (a, b) {return;
        console.log(a, b, 'in onRowClick');
    }

    render() {
        const me = this;

        const columns = [{
            title: '行',
            dataIndex: 'row',
            key: 'row',
            width: '10%'
        }, {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: '10%'
        }, {
            title: '可分组',
            dataIndex: 'groupAble',
            key: 'groupAble',
            width: '8%',
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input type="checkbox" />)
            }
        }, {
            title: '可筛选',
            dataIndex: 'filterAble',
            key: 'filterAble',
            width: '8%',
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input type="checkbox" />)
            }
        }, {
            title: '可计数',
            dataIndex: 'accountAble',
            key: 'accountAble',
            width: '8%',
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input type="checkbox" />)
            }
        },{
            title: '可求和',
            dataIndex: 'sumAble',
            key: 'sumAble',
            width: '8%',
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input type="checkbox" />)
            }
        },{
            title: '可求最小值',
            dataIndex: 'minimumSeekAble',
            key: 'minimumSeekAble',
            width: '12%',
            onCellClick:me.onCellClick,
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input type="checkbox" />)
            }
        },{
            title: '可求最大值',
            dataIndex: 'maximumSeekAble',
            key: 'maximumSeekAble',
            width: '12%',
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input className="checkbox" type="checkbox" />)
            }
        },{
            title: '可表示时间',
            dataIndex: 'timeExpressAble',
            key: 'timeExpressAble',
            width: '12%',
            className: 'checkb',
            render: (a, b) => {
                console.log(a, b, 'in render');
                return (<input type="checkbox" />)
            },
            onCellClick: (record, event) => {
                console.log(record, event, 'onCellClick:record, event');
            }
        },{
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: '12%',
            render: (text, record, index) => {
                return (
                    <div className="icon-group">
                        <i className="icon" onClick={() => editSlice(record)}></i>&nbsp;
                        <i className={record.online ? 'icon online' : 'icon offline'}
                           onClick={() => publishSlice(record)}></i>&nbsp;
                        <i className="icon" onClick={() => deleteSlice(record)}></i>
                    </div>
                )
            }
        }];

        return (
            <div>
                <div>
                    <button onClick={me.addTableColumn} className='' >+&nbsp; 添加列表</button>
                </div>
                <Table
                    columns={columns}
                    dataSource={this.state.data}
                    size='small'
                    pagination={false}
                    onRowClick={me.onRowClick}
                />
            </div>
        );
    }
}

export default SubColumns;
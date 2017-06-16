import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table, Input, Button, Icon } from 'antd';

const getData = (length) => {
    length = length||12;
    let arr = [];
    for( let i=length; i--;) {
        arr.push({
            key: i,
            metric: 'row'+i,
            fullName: 'fullName'+i,
            type: 'type'+i,
            online: Math.random()>0.5
        });
    }
    return arr;
};

const data = getData();

class SubSqlMetric extends Component {
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

    addSQLMetric (argus) {
        //TODO: show popup
        alert('TODO: addSQLMetric');
    }

    editMetric () {
        alert(`TODO: editMetric, argus: ${arguments}`);
    }

    removeMetric () {
        alert(`TODO: removeMetric, argus: ${arguments}`);
    }

    render() {
        const me = this;

        const columns = [{
            title: '度量',
            dataIndex: 'metric',
            key: 'metric',
            width: '25%'
        }, {
            title: '全称',
            dataIndex: 'fullName',
            key: 'fullName',
            width: '30%'
        }, {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: '25%',
            className: 'checkb'
        }, {
            title: '操作',
            dataIndex: 'operation',
            key: 'operation',
            width: '20%',
            render: (text, record, index) => {
                return (
                    <div className="icon-group">
                        <i className="icon edit" onClick={() => editMetric(record)}></i>&nbsp;
                        <i className="icon remove"
                            onClick={() => removeMetric(record)}
                            style={{marginLeft:'30px'}}
                        ></i>
                    </div>
                )
            }
        }];

        return (
            <div style={{padding: '10px'}}>
                <div style={{width:'100%',
                     height:'50px',
                     textAlign:'right'}}>
                    <button
                        className='btn-blue tab-btn-ps'
                        onClick={me.addSQLMetric}
                    >+&nbsp; 添加SQL Metric</button>
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

export default SubSqlMetric;
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Tooltip } from 'antd';

function Edit(props) {
    return (
        <Table dataSource={props.dataSource} columns={props.columns} />
    );
}

Edit.propTypes = {
    name: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
};

export default class EditList extends Component {
    constructor(props) {
        super();
        this.translateOperation = this.translateOperation.bind(this);
    }

    translateOperation(type) {
        if(type === 'edit') {
            return '编辑';
        }else if('create') {
            return '创建';
        }else {
            return type;
        }
    }

    render() {
        const listDashboard = this.props.dashboard;
        const listSlice = this.props.slice;

        const dataSource = (this.props.catagory === 'dashboard'? listDashboard : listSlice) || [];
        const columns = [{
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            className: "name-column",
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text, record) => (<a href={record.link}>{text}</a>)
        }, {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            className: "action-column",
            sorter: (a, b) => a.action.localeCompare(b.action),
            render: (text) => (<span>{this.translateOperation(text)}</span>)
        }, {
            title: '编辑时间',
            dataIndex: 'time',
            key: 'time',
            className: "time-column",
            sorter: (a, b) => { return a.time > b.time　? 1 : -1;},
            render: (text) => (<span>{text}</span>)
        }];

        return (
            <Table dataSource={dataSource} pagination={false} columns={columns} />
        );
    }
}

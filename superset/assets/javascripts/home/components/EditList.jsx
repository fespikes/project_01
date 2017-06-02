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
            render: (text, record) => (<Tooltip placement="topRight" title={text} arrowPointAtCenter><a href={record.link}>{text}</a></Tooltip>)
        }, {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            className: "action-column",
            sorter: (a, b) => a.action.localeCompare(b.action),
            render: (text) => (<Tooltip placement="topRight" title={text} arrowPointAtCenter><span>{text}</span></Tooltip>)
        }, {
            title: '编辑时间',
            dataIndex: 'time',
            key: 'time',
            className: "time-column",
            sorter: (a, b) => { return a.time > b.time　? 1 : -1;},
            render: (text) => (<Tooltip placement="top" title={text} arrowPointAtCenter><span>{text}</span></Tooltip>)
        }];

        return (
            <Table dataSource={dataSource} pagination={false} columns={columns} />
        );
    }
}

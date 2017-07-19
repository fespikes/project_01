import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { fetchEventDetail } from "../actions";
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Table, Button, Tooltip } from 'antd';
import { Redirect } from 'react-router-dom';

const _ = require('lodash');

class EventDetail extends Component {

    constructor(props) {
        super(props);
        this.goBack = this.goBack.bind(this);
        this.tableOnChange = this.tableOnChange.bind(this);
    }

    componentDidMount() {
        const { dispatch } = this.props;
        this.state = {
            redirect: false
        };
        dispatch(fetchEventDetail(0, "time", "desc"));
    }

    goBack () {
        this.setState({redirect: true});
    }

    tableOnChange (pagination, filters, sorter) {
        const { dispatch } = this.props;
        const pager = { ...this.props.pagination };
        pager.current = pagination.current;
        let direction = sorter.order === "ascend" ? "asc" : "desc";
        dispatch(fetchEventDetail(pager.current -1, sorter.columnKey, direction));
    }

    render() {

        const dataSource = this.props.actions;
        const itemCount = this.props.itemCount;
        const redirect = this.state ? this.state.redirect : false;

        const columns = [{
            title: '用户',
            dataIndex: 'user',
            key: 'user',
            width: '33%',
            sorter: true,
            className: 'user-column',
            render: (text, record) => (<a className="user-td" href={record.link}><i className="icon user-icon"></i><span>{text}</span></a>)
        }, {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            sorter: true,
            width: '33%',
            render: (text, record) => {
                        const classes = "icon action-title-icon " + record.type + "-icon";
                        return (
                            <div>
                                <div className="action-text">{text}</div>
                                <div className="action-title"><i className={classes}></i>{record.title}</div>
                            </div>
                        );
                    }
        }, {
            title: '编辑时间',
            dataIndex: 'time',
            key: 'time',
            sorter: true,
            width: '30%',
            className: 'time-col',
            render: (text) => (<span>{text}</span>)
        }];

        const pagination = this.props.pagination;


        return (
            <div className="event-detail-page detail-page">
                <div className="event-detail-page-title detail-page-title">
                    <div className="left">
                        <span className="title">事件</span>
                        <span className="count-title">记录条目</span>
                        <span　className="count-value">{itemCount || 0}</span>
                    </div>
                    <div className="right">
                        <BackButton handleOnClick={this.goBack} redirect={redirect}></BackButton>
                    </div>
                </div>
                <Table onChange={this.tableOnChange} className="event-table" pagination={pagination} dataSource={dataSource} columns={columns} />
            </div>
        );
    }
}

function BackButton(props) {
    if (props.redirect) {
        return <Redirect push to="/" />;
    }
    else {
        return <Button onClick={props.handleOnClick} className="back-button" icon="left">返回</Button>;
    }
}

const getActionList = createSelector(
    state => state.posts.param.data,
    (data) => {
        if (!data) {
            return [];
        }

        let result = [];
        let item = {};

        _.forEach(data, (obj, key) => {
            item = {
                'key': key + 1,
                'user': obj.user,
                'action': obj.action,
                'time': obj.time,
                'link': obj.link,
                'title': obj.title,
                'type': obj.obj_type
            };
            result.push(item);
        });

        return result;
    }
);

const getPagination = createSelector(
    state => state.posts.param,
    (data) => {
        if (!data) {
            return {
                total: 0,
                pageSize: 10,
                defaultPageSize: 10,
                current: 1
            };
        }

        let result = {
            total: data.count,
            current: data.page + 1,
            pageSize: data.page_size,
            defaultPageSize: data.page_size
        }
        return result;
    }
);

const mapStateToProps = (state, props) => {
    const { posts } = state;
    return {
        actions: getActionList(state),
        pagination: getPagination(state),
        itemCount: posts.param.count
    };
}


export default connect(mapStateToProps)(EventDetail);
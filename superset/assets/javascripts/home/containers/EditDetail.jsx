import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { fetchEditDetail, swithTabInEdit} from "../actions";
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Redirect } from 'react-router-dom';
import { Table, Button, Tooltip } from 'antd';

class EditDetail extends Component {

    constructor(props) {
        super(props);
        this.goBack = this.goBack.bind(this);
        this.tableOnChange = this.tableOnChange.bind(this);
    }

    componentDidMount() {
        const { fetchEditDetail } = this.props;
        this.state = {
            redirect: false
        };
        fetchEditDetail('dashboard', 0, 'time', 'desc');
    }

    componentWillReceiveProps (nextProps) {
        const { fetchEditDetail } = this.props;
        if (nextProps.currentCatagory !== this.props.currentCatagory) {
            fetchEditDetail(nextProps.currentCatagory, 0);
        }
    }

    goBack () {
        this.setState({redirect: true});
    }

    tableOnChange (pagination, filters, sorter) {
        console.log(sorter);
        const pager = { ...this.props.pagination };
        const { fetchEditDetail } = this.props;
        pager.current = pagination.current;
        let direction = sorter.order === "ascend" ? "asc" : "desc";
        fetchEditDetail(this.props.currentCatagory, pager.current - 1, sorter.columnKey, direction);
    }

    render() {
        const {currentCatagory, dataSource, onChangeCatagory, pagination, itemCount} = this.props;
        const redirect = this.state ? this.state.redirect : false;

        const columns = [{
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            className: "name-column",
            sorter: true,
            render: (text, record) => (<a href={record.link}>{text}</a>)
        }, {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            className: "action-column",
            width: '33%',
            render: (text) => (<span>{text}</span>)

        }, {
            title: '编辑时间',
            dataIndex: 'time',
            key: 'time',
            className: "time-column",
            sorter: true,
            width: '33%',
            render: (text) => (<span>{text}</span>)
        }];

        return (
            <div className="edit-detail-page detail-page">
                <div className="edit-detail-page-title detail-page-title">
                    <div className="left">
                        <span className="title">最近编辑</span>
                        <span className="count-title">记录条目</span>
                        <span　className="count-value">{itemCount || 0}</span>
                    </div>
                    <div className="right">
                        <div className="title-tab">
                            <ul>
                                <li onClick={ () => {onChangeCatagory('dashboard')} } className={currentCatagory==='dashboard'?'current':''}>仪表板</li>
                                <li onClick={ () => {onChangeCatagory('slice')} } className={currentCatagory==='slice'?'current':''}>工作表</li>
                            </ul>
                        </div>
                        <BackButton handleOnClick={this.goBack} redirect={redirect}></BackButton>
                    </div>
                </div>
                <Table onChange={this.tableOnChange} pagination={pagination} className="edit-table" dataSource={dataSource} columns={columns} />
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

const getEidtListData = createSelector(
    state => state.posts.param.data,
    (data) => {
        if (!data) {
            return [];
        }

        let result = [];
        let item =  {};
        _.forEach(data, (obj, key) => {
            item = {
                'key': key + 1,
                'name': obj.name,
                'action': obj.action,
                'time': obj.time,
                'link': obj.link
            };
            if(obj.action === 'edit') {
                item.action = '编辑';
            }else if(obj.action === 'create') {
                item.action = '创建';
            }
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
    const { posts, switcher} = state;
    return {
        currentCatagory: switcher.editPanelCatagory,
        dataSource: getEidtListData(state),
        pagination: getPagination(state),
        itemCount: posts.param.count
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onChangeCatagory: (catagory) => {
            dispatch(swithTabInEdit(catagory));
        },
        fetchEditDetail: (catagory, index, orderColumn, orderDirection) => {
            dispatch(fetchEditDetail(catagory, index, orderColumn, orderDirection));
        }
    }
};


export default connect(mapStateToProps, mapDispatchToProps)(EditDetail);
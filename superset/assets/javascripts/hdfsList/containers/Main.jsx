import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as actions from '../actions';
import { Pagination, Table, Operate, PopupConnections } from '../components';
import PropTypes from 'prop-types';

import '../style/hdfs.scss';

class Main extends Component {

    getChildContext () {
        const { dispatch, condition } = this.props;
        this.dispatch = dispatch;
        return {
            dispatch: dispatch,
            connectionID: condition.connectionID
        }

    }

    constructor(props, context) {
        super(props);
        const {condition} = this.props;

        this.state = {
            breadCrumbEditable: false,
            path: condition.path
        };
    }

    componentDidMount() {
        const {condition } = this.props;
        this.props.fetchIfNeeded(condition);
    }

    componentWillReceiveProps (nextProps) {
        const { condition } = nextProps;

        if (condition.filter !== this.props.condition.filter ||
            condition.onlyFavorite !== this.props.condition.onlyFavorite ||
            condition.tableType !== this.props.condition.tableType ||
            condition.popupNormalParam && 
                condition.popupNormalParam.status==='none' && this.props.popupNormalParam.status==='flex' ||
            condition.path !== this.props.condition.path
        ) {
            this.props.fetchIfNeeded(condition);
        }
    }

    breadCrumbEditable () {
        this.setState({
            breadCrumbEditable: !this.state.breadCrumbEditable
        })
    }

    onPathChange (e) {
        this.setState({
            path: e.currentTarget.value
        });
    }

    onPathBlur (e) {
        console.log('this is the path,', e.currentTarget.value);
        const {dispatch, condition, changePath} = this.props;
        let val = e.currentTarget.value.trim();
        if (val === condition.path) {
            return;
        }
        console.log('tell me what happenning');
        changePath(val);
    }

    render () {
        const {
            popupActions,

            popupParam,

            condition,
            emitFetch,

            fetchIfNeeded,
            popupChangeStatus,

            setSelectedRows
        } = this.props;

        const editable = this.state.breadCrumbEditable;
        //TODO: what does edit folder path mean here???


        const connectionResponse= popupParam.response;

        const response = emitFetch.response;

        let username = "TODO: user name";

        // let count=0, breadCrumbText = `user/${username}`;
        let count=0,
            breadCrumbText = this.state.path || `user/${username}`;
        if (response.length >0) {
            count = response.page.total_count;
            breadCrumbText = response.path;
        }

        return (
            <div className="hdfs-panel">
                <div className="panel-top">
                    <div className="left">
                        <span className="f16">路径:</span>
{/*
<span contentEditable={editable} className="bread-crumb-span">

    <small className="text">Home</small>
    <small className="slash">/</small>
    <small className="text">Application Center</small>
    <small className="slash">/</small>
    <small>An Application</small>
    <small className="crumb">/</small>
</span>*/}

                        <textarea rows="1" cols="30" contentEditable={editable}
                            className={(editable?'editing':'')+' f16'}
                            name="pathName"
                            onBlur={e => this.onPathBlur(e)}
                            onChange={e => this.onPathChange(e)}
                            value={breadCrumbText}
                            disabled={editable?'':'disabled'}
                            >
                        </textarea>
                        <i
                            className="icon icon-edit"
                            onClick={() => this.breadCrumbEditable()}
                            style={{
                                width:'15px', height:'14px',
                                backgroundPosition:'-253px -134px',
                                position:'relative', left:'10px', top:'8px'
                            }}
                        ></i>
                    </div>
                    <div className="right">
                        <Operate
                            tableType={condition.tableType}
                            selectedRowKeys={condition.selectedRowKeys}
                            selectedRowNames={condition.selectedRowNames}
                        />
                    </div>
                </div>
                <div className="panel-middle">
                    <Table
                        {...response}
                        setSelectedRows={setSelectedRows}
                    />
                </div>
                <div className="panel-bottom">
                    <Pagination
                        count={count}
                        pageSize={condition.pageSize}
                        pageNumber={condition.page}
                    />
                </div>
            </div>
        );
    }
}

Main.propTypes = {};

function mapStateToProps (state, pros) {
    const { condition, popupParam, emitFetch, popupNormalParam } = state;

    return {
        condition,
        emitFetch,
        popupParam,

        popupNormalParam
    };
}

function mapDispatchToProps (dispatch) {
    const {
        changePath,
        setPopupParam,
        fetchIfNeeded,
        popupChangeStatus,

        setSelectedRows
    } = bindActionCreators(actions, dispatch);

    return {
        changePath,
        setPopupParam,
        popupActions:actions.popupActions,
        fetchIfNeeded,
        popupChangeStatus,
        setSelectedRows,
        dispatch
    };
}

Main.childContextTypes = {
    connectionID: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Main);


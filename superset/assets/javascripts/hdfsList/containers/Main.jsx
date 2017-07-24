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
        this.state = {
            breadCrumbEditable: false
        };
    }

    componentDidMount() {
        // const {condition } = this.props;
    }

    componentWillReceiveProps (nextProps) {
        const { condition } = nextProps;

        if (condition.filter !== this.props.condition.filter ||
            condition.onlyFavorite !== this.props.condition.onlyFavorite ||
            condition.tableType !== this.props.condition.tableType ||
            nextProps.popupNormalParam.status==='none' && this.props.popupNormalParam.status==='flex'
        ) {
            this.props.fetchIfNeeded(condition);
        }
    }

    breadCrumbEditable () {
        this.setState({
            breadCrumbEditable: !this.state.breadCrumbEditable
        })
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

        let count=0, breadCrumbText = `user/${username}`;
        if (response.length >0) {
            count = response.page.total_count;
            breadCrumbText = response.path;
        }

        return (
            <div className="hdfs-panel">
                <div className="panel-top">
                    <div className="left">
                        <span className="f14">路径</span>
{/*
<span contentEditable={editable} className="bread-crumb-span">

    <small className="text">Home</small>
    <small className="slash">/</small>
    <small className="text">Application Center</small>
    <small className="slash">/</small>
    <small>An Application</small>
    <small className="crumb">/</small>
</span>*/}

                        <span contentEditable={editable}>
                            &nbsp;&nbsp;<small className="text">{breadCrumbText}</small>&nbsp;&nbsp;
                        </span>
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
        setPopupParam,
        fetchIfNeeded,
        popupChangeStatus,

        setSelectedRows
    } = bindActionCreators(actions, dispatch);

    return {
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


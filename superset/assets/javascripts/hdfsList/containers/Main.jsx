import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as actions from '../actions';
import { Pagination, Table, Operate, PopupConnections } from '../components';
import PropTypes from 'prop-types';

import '../style/hdfs.scss';

class Main extends Component {

    getChildContext() {
        const {dispatch, condition} = this.props;
        this.dispatch = dispatch;
        return {
            dispatch: dispatch
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

    componentWillMount() {
        console.log('componentWillMount');
    }

    componentDidMount() {
        const {condition} = this.props;
        this.props.fetchIfNeeded(condition);
    }

    componentWillReceiveProps(nextProps) {
        const {condition, popupNormalParam} = nextProps;

        if (condition.filter !== this.props.condition.filter ||
                condition.onlyFavorite !== this.props.condition.onlyFavorite ||
                condition.tableType !== this.props.condition.tableType ||
                popupNormalParam && popupNormalParam.status === 'none' && this.props.popupNormalParam.status === 'flex' ||
                condition.path !== this.props.condition.path
        ) {
            this.props.fetchIfNeeded(condition);
        }
    }

    breadCrumbEditable() {
        this.setState({
            breadCrumbEditable: !this.state.breadCrumbEditable
        })
    }

    //S:Path 
    onPathChange(e) {
        let val = e.currentTarget.value.trim();
        this.setState({
            path: val
        });
    }

    onPathBlur(e) {
        console.log('this is the path,', e.currentTarget.value);
        const {dispatch, condition, changePath} = this.props;
        let val = this.state.path;
        if (val === condition.path) {
            return;
        }
        console.log('tell me what happenning');
        changePath({
            path: val
        });
    }
    //E:Path 

    render() {
        const {changePath, giveDetail, condition, emitFetch, fetchIfNeeded, popupChangeStatus, setSelectedRows} = this.props;

        const editable = this.state.breadCrumbEditable;
        //TODO: what does edit folder path mean here???

        const response = emitFetch.response;

        let username = "TODO: user name";

        // let count=0, breadCrumbText = `user/${username}`;
        let count = 0,
            breadCrumbText = this.state.path || `user/${username}`;
        if (response.length > 0) {
            count = response.pagesize;
            breadCrumbText = response.path;
        }

        const linkToPath = (ag) => {
            this.setState({...ag});
            changePath(ag);
        }

        return (
            <div className="hdfs-panel">
                <div className="panel-top">
                    <div className="left">
                        <span className="f16">路径:</span>
{ /*
<span contentEditable={editable} className="bread-crumb-span">

    <small className="text">Home</small>
    <small className="slash">/</small>
    <small className="text">Application Center</small>
    <small className="slash">/</small>
    <small>An Application</small>
    <small className="crumb">/</small>
</span>*/ }

                        <textarea rows="1" contentEditable={editable}
            className={(editable ? 'editing' : '') + ' f16'}
            name="pathName"
            onBlur={e => this.onPathBlur(e)}
            onChange={e => this.onPathChange(e)}
            value={breadCrumbText}
            disabled={editable ? '' : 'disabled'}
            >
                        </textarea>
                        <i
            className="icon icon-edit"
            onClick={() => this.breadCrumbEditable()}
            style={{
                width: '15px',
                height: '14px',
                backgroundPosition: '-253px -134px',
                position: 'relative',
                left: '10px',
                top: '8px'
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
            giveDetail={giveDetail}
            linkToPath={linkToPath}
            setSelectedRows={setSelectedRows}
            />
                </div>
                <div className="panel-bottom">
                    <Pagination
            count={count}
            pageSize={condition.page_size}
            pageNumber={condition.page_num}
            />
                </div>
            </div>
        );
    }
}

Main.propTypes = {};

function mapStateToProps(state, pros) {
    const {condition, popupParam, emitFetch, popupNormalParam} = state;

    return {
        condition,
        emitFetch,
        popupParam,

        popupNormalParam
    };
}

function mapDispatchToProps(dispatch) {
    const {changePath, giveDetail, setPopupParam, fetchIfNeeded, popupChangeStatus, setSelectedRows} = bindActionCreators(actions, dispatch);

    return {
        changePath,
        giveDetail,
        setPopupParam,
        fetchIfNeeded,
        popupChangeStatus,
        setSelectedRows,
        dispatch
    };
}

Main.childContextTypes = {
    dispatch: PropTypes.func.isRequired
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Main);


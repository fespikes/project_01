import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchIfNeeded, setPopupParam, popupActions } from '../actions';
import { Pagination, Table, Operate } from '../components';
import { Popup } from '../components';
import PropTypes from 'prop-types';
import { renderLoadingModal, renderAlertTip } from '../../../utils/utils';

class App extends Component {

    getChildContext () {
        const { dispatch } = this.props;
        return {
            dispatch: dispatch
        }
    }

    constructor (props) {
        super(props);
        this.state = {};
    }

    componentDidMount () {
        const { dispatch, condition } = this.props;
        dispatch(fetchIfNeeded());
    }

    componentWillReceiveProps (nextProps) {
        const { dispatch, condition } = nextProps;

        if (nextProps.condition.filter !== this.props.condition.filter ||
            nextProps.condition.onlyFavorite !== this.props.condition.onlyFavorite ||
            nextProps.condition.tableType !== this.props.condition.tableType ||
            nextProps.condition.page !== this.props.condition.page
        ) {
            dispatch(fetchIfNeeded(nextProps.condition));
        }
    }

    render () {
        const {dispatch, paramOfDelete, popupParam, response, condition} = this.props;

        const count = response&&response.count ||0;

        return (
            <div className="pilot-panel datasource-panel">
                <div className="popupContainer">
                    <Popup
                        {...popupParam}
                        {...popupActions}
                    />
                </div>
                <div className="panel-top">
                    <div className="left">
                        <i className="icon icon-database-list"/>
                        <span>连接</span>
                        <span>记录</span>
                        <span>{count}条</span>
                    </div>
                    <div className="right">
                        <Operate
                            tableType={condition.tableType}
                            {...paramOfDelete}
                        />
                    </div>
                </div>
                <div className="panel-middle">
                    <Table
                        {...response}
                        {...paramOfDelete}
                    />
                </div>
                <div className="panel-bottom">
                    <Pagination
                        dispatch={dispatch}
                        count={count}
                        pageSize={condition.pageSize}
                        pageNumber={condition.page}
                    />
                </div>
            </div>
        );
    }
}

App.propTypes = {};

function mapStateToProps(state) {
    const { condition, paramOfDelete, popupParam, requestByCondition } = state;

    const {
        isFetching,
        response        ///
    } = requestByCondition||{
        isFetching: false,
        response: {}
    }

    return {
        condition,
        paramOfDelete,
        popupParam,
        response,
        isFetching
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(actions, dispatch),
    };
}

App.childContextTypes = {
    dispatch: PropTypes.func.isRequired
}

export default connect(
    mapStateToProps
)(App);
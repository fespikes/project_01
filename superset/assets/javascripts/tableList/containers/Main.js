import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchIfNeeded } from '../actions';
import { Pagination, Table, Operate } from '../components';
import PropTypes from 'prop-types';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        const { dispatch, condition } = this.props;
        dispatch(fetchIfNeeded(condition));
    }

    componentWillReceiveProps(nextProps) {
        const { dispatch, condition } = nextProps;

        if (nextProps.condition.filter !== this.props.condition.filter ||
            nextProps.condition.onlyFavorite !== this.props.condition.onlyFavorite ||
            nextProps.condition.tableType !== this.props.condition.tableType
        ) {
            dispatch(fetchIfNeeded(condition));
        }
    }

    render() {
        const {dispatch, response, condition} = this.props;
        const count = response.count;

        return (
            <div className="slice-panel">
                <div className="panel-top">
                    <div className="left">
                        <i
                            className="icon icon-table"
                            style={{marginBottom:'-3px'}}
                        ></i>
                        <span>数据集</span>
                        <span>记录</span>
                        <span>{count +''}条</span>
                    </div>
                    <div className="right">
                        <Operate
                            dispatch={dispatch}
                            tableType={condition.tableType}
                            selectedRowKeys={condition.selectedRowKeys}
                            selectedRowNames={condition.selectedRowNames}
                        />
                    </div>
                </div>
                <div className="panel-middle">
                    <Table
                        dispatch={dispatch}
                        {...response}
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
    const { condition, requestByCondition } = state;

    const {
        isFetching,
        response        ///
    } = requestByCondition[condition.tableType]||{
        isFetching: true,
        response: {}
    }
    return {
        condition,
        response,
        isFetching
    };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  };
}

export default connect(
    mapStateToProps
)(App);

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchIfNeeded } from '../actions';
import { Pagination, Table, Operate } from '../components';
import PropTypes from 'prop-types';
import '../style/hdfs.scss';

class Main extends Component {
    constructor(props) {
        super(props);
        this.state = {
            breadCrumbEditable: false
        };
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

    breadCrumbEditable () {
        this.setState({
            breadCrumbEditable: !this.state.breadCrumbEditable
        })
    }

    render() {
        const {dispatch, response, condition} = this.props;
        const count = response.count;
        const breadCrumbText = 'Home/Application Center/An Application/';

        const editable = this.state.breadCrumbEditable;

        return (
            <div className="hdfs-panel">
                <div className="panel-top">
                    <div className="left">
                        <span className="f14">路径</span>
                        <span contentEditable={editable} className="bread-crumb-span">
                            <small className="text">Home</small>
                            <small className="slash">/</small>
                            <small className="text">Application Center</small>
                            <small className="slash">/</small>
                            <small>An Application</small>
                            <small className="crumb">/</small>
                        </span>

                        {/*<textarea contentEditable="true">
                        {breadCrumbText}
                        </textarea>*/}
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

Main.propTypes = {};

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
)(Main);


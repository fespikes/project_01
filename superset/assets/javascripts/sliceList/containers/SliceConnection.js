import React, { Component } from 'react';
import { connect } from 'react-redux';
import { fetchLists } from '../actions';
import { Pagination, Table, Operate } from '../components';
import PropTypes from 'prop-types';
import { renderLoadingModal, renderAlertTip } from '../../../utils/utils';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        const { dispatch } = this.props;
        dispatch(fetchLists());
    }

    componentWillReceiveProps(nextProps) {
        const { lists } = this.props;
        if(lists.isFetching !== nextProps.lists.isFetching) {
            const loadingModal = renderLoadingModal();
            if(nextProps.lists.isFetching) {
                loadingModal.show();
            }else {
                loadingModal.hide();
            }
        }
    }

    render() {
        const {dispatch, lists, conditions} = this.props;

        return (
            <div className="pilot-panel slice-panel">
                <div className="panel-top">
                    <div className="left">
                        <i className="icon icon-slice"></i>
                        <span>工作表</span>
                        <span>记录</span>
                        <span>{lists.items.count +''}条</span>
                    </div>
                    <div className="right">
                        <Operate
                            dispatch={dispatch}
                            typeName={conditions.type}
                            selectedRowKeys={conditions.selectedRowKeys}
                            selectedRowNames={conditions.selectedRowNames}
                        />
                    </div>
                </div>
                <div className="panel-middle">
                    <Table
                        dispatch={dispatch}
                        loading={conditions.tableLoading}
                        selectedRowKeys={conditions.selectedRowKeys}
                        sliceList={lists.items.data}
                    />
                </div>
                <div className="panel-bottom">
                    <Pagination
                        dispatch={dispatch}
                        count={lists.items.count}
                        pageSize={conditions.pageSize}
                        pageNumber={conditions.pageNumber}
                    />
                </div>
            </div>
        );
    }
}

App.propTypes = {};

function mapStateToProps(state) {
    return {
        lists: state.lists,
        details: state.details,
        conditions: state.conditions
    }
}

export default connect(mapStateToProps)(App);


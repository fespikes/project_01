import React, { Component } from 'react';
import { connect } from 'react-redux';
import { navigateTo, fetchPostsIfNeeded, searchReddit, removeReddit } from '../actions';
import {Pagination, Table, Operate } from '../components';
import PropTypes from 'prop-types';

class App extends Component {
    constructor(props) {
        super(props);

        this.getSelectedRowKeys = null;
        this.onPagination = this.onPagination.bind(this);

        this.onSelectChange = this.onSelectChange.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onSearch = this.onSearch.bind(this);
    }

    getDefaultState() {
        return {
            // selectedRowKeys: []
        }
    }

    componentDidMount() {
        const { dispatch, selectedReddit } = this.props;
        dispatch(fetchPostsIfNeeded(selectedReddit.pageNumber));
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.selectedReddit.pageNumber !== this.props.selectedReddit.pageNumber) {
            const { dispatch, selectedReddit } = nextProps;
            dispatch(fetchPostsIfNeeded(selectedReddit.pageNumber));
        }
    }

    onPagination(argus) {
        console.log(argus);
        this.props.dispatch( navigateTo(argus) );
    }

    onAdd() {
        console.log('add in SliceConnection, todo the popup.');
    }

    onDelete() {
        if(!this.getSelectedRowKeys)
            return;
        const rowKeys = this.getSelectedRowKeys();
        this.props.dispatch(
            removeReddit({
                selectedRowKeys: rowKeys
            })
        );
    }

    onSelectChange(getSelectedRowKeys) {
        this.getSelectedRowKeys = getSelectedRowKeys;
    }

    onSearch(argus) {
        const { dispatch, selectedReddit } = this.props;
        dispatch(searchReddit(Object.assign({}, selectedReddit, argus)));
    }

    render() {
        const { selectedReddit, dataSource, isFetching } = this.props;
        // const isEmpty = json.count === 0;
        const pageNumber = selectedReddit.pageNumber;
        const message = isFetching ? <h2>Loading...</h2> : <h2>Empty.</h2>;
        const amount = dataSource.length;
        const me = this;

        return (
            <div className="slice-panel">
                <div className="panel-top">
                    <div className="left">
                        <i className="icon"></i>
                        <span>工作表</span>
                        <span>记录</span>
                        <span>{dataSource.length +''}条</span>
                    </div>
                    <div className="right">
                        <Operate
                            onSearch = { me.onSearch }
                            onAdd = { me.onAdd }
                            onDelete = { me.onDelete }
                        />
                    </div>
                </div>
                <div className="panel-middle">
                    <Table
                        dataSource = {dataSource}
                        onDelete = {me.onDelete}
                        onSelectChange = {me.onSelectChange}
                    />
                </div>
                <div className="panel-bottom">
                    <Pagination
                        onPagination={this.onPagination}
                        defaultCurrent={pageNumber}
                        total={amount}
                    />
                </div>
            </div>
        );
    }
}

App.propTypes = {
    selectedReddit: PropTypes.object.isRequired,
    isFetching: PropTypes.bool.isRequired,
    lastUpdated: PropTypes.number,
    dispatch: PropTypes.func.isRequired,
};

function mapStateToProps(state) {
    const { postsBypageNumber, selectedReddit } = state;

    const {
        isFetching,
        lastUpdated,
        items: dataSource
        } = postsBypageNumber[selectedReddit.pageNumber] || {
        isFetching: true,
        items: [],
    };

    return {
        selectedReddit,
        dataSource,
        isFetching,
        lastUpdated,
    };
}

export default connect(mapStateToProps)(App);


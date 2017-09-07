import React from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchPosts } from '../actions';
import { Operations, Tables, Paginations } from '../components';
import { renderAlertTip } from '../../../utils/utils';

class TableContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    componentDidMount() {
        const { dispatch } = this.props;
        dispatch(fetchPosts());
    }

    render() {
        const { dispatch, posts, configs } = this.props;
        return (
            <div className="pilot-panel dashboard-panel">
                <div className="panel-top">
                    <div className="left">
                        <i className="icon icon-dashboard"/>
                        <span>仪表板</span>
                        <span>记录条目</span>
                        <span>{posts.params.count}</span>
                    </div>
                    <div className="right">
                        <Operations
                            dispatch={dispatch}
                            typeName={configs.type}
                            viewMode={configs.viewMode}
                            selectedRowKeys={configs.selectedRowKeys}
                            selectedRowNames={configs.selectedRowNames}/>
                    </div>
                </div>
                <div className="panel-middle">
                    <Tables
                        dispatch={dispatch}
                        loading={configs.tableLoading}
                        selectedRowKeys={configs.selectedRowKeys}
                        dashboardList={posts.params.data}
                        />
                </div>
                <div className="panel-bottom">
                    <Paginations
                        dispatch={dispatch}
                        count={posts.params.count}
                        pageSize={configs.pageSize}
                        pageNumber={configs.pageNumber}/>
                </div>
            </div>
        );
    }
}

const propTypes = {};

const defaultProps = {

};

TableContainer.propTypes = propTypes;
TableContainer.defaultProps = defaultProps;

function addTableKey(posts) {
    if(posts.params.data) {
        posts.params.data.forEach(function(table) {
            table.key = table.id;
        });
    }
    return posts;
}

function mapStateToProps(state) {
    return {
        posts: addTableKey(state.posts),
        configs: state.configs,
        details: state.details
    }
}

export default connect(mapStateToProps)(TableContainer);

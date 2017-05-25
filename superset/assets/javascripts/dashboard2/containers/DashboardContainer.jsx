import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import { Operations, TableList, Paginations } from '../components';
import { addSliceAction, editSliceAction, publishSliceAction, deleteSliceAction, fetchSliceListPromise } from '../actions';
import { DashboardEdit, SliceEdit, Confirm } from '../../components/popup';

const propTypes = {};

const defaultProps = {};

class DashboardContent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            types: {
                type: 'show_all'
            },
            paging: {
                pageSize: 2
            }
        };
    };

    componentDidMount() {

    }

    render() {
        const { countNum } = this.props;
        return (
            <div className="dashboard-panel">
                <div className="panel-top">
                    <div className="left">
                        <i className=""></i>
                        <span>仪表盘</span>
                        <span>记录条目</span>
                        <span>{countNum}</span>
                    </div>
                    <div className="right">
                        <Operations
                            pageSize={this.state.paging.pageSize}/>
                    </div>
                </div>
                <div className="panel-middle">
                    <TableList pageSize={this.state.paging.pageSize}/>
                </div>
                <div className="panel-bottom">
                    <Paginations
                        pageSize={this.state.paging.pageSize}/>
                </div>
            </div>
        );
    }
}

DashboardContent.propTypes = propTypes;
DashboardContent.defaultProps = defaultProps;

function mapStateToProps(state) {
    return {
        countNum: state.posts.params.count || 0
    }
}

export default connect(mapStateToProps)(DashboardContent);

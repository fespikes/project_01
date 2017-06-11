import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../actions';
import { HashRouter, Route, Link, IndexRoute } from 'react-router-dom';

import '../style/databaseAdd.css';

class App extends Component {

    render () {
        const props = this.props;

        return (
            <div className="data-detail">
                <h1 className="title"><i className="icon"></i>数据集详情</h1>
                <div className="data-detail-wrap">
                    <div className="data-wrap-center">
                        <nav className="detail-nav">
                            <ul>
                                <li><Link to="/add/detail">Detail</Link></li>
                                <li><Link to="/add/preview">preview</Link></li>
                                <li><Link to="/add/columns">List Table Column</Link></li>
                                <li><Link to="/add/sqlMetric">SqlMetric</Link></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        );
    }
}

App.propTypes = {
};

function mapStateToProps(state, ownProps) {
    return {
        errorMessage: state.errorMessage,
        inputValue: ownProps.location.pathname.substring(1),
    };
}

function mapDispatchToProps (dispatch) {
    return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(App);

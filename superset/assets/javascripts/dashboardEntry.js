/**
 * Created by haitao on 17-5-15.
 */
import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { HashRouter as Router, Route } from 'react-router-dom'
import TableContainer from './dashboard2/containers/TableContainer';
import GraphContainer from './dashboard2/containers/GraphContainer';
import configureStore from './dashboard2/store/configureStore';

const $ = window.$ = require('jquery');
const store = configureStore();

$('.navbar-inverse > .nav-container > .nav > li:nth-child(2)').addClass('active');


$(document).ready(() => {
    render(
        <Provider store={store}>
            <Router>
                <div>
                    <Route exact path="/" component={TableContainer} />
                    <Route path="/table" component={TableContainer}/>
                    <Route path="/graph" component={GraphContainer}/>
                </div>
            </Router>
        </Provider>,
        document.getElementById('dashboard')
    );
});

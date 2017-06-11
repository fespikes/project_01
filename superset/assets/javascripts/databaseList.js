import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

import {
    Main,
    DatabaseAdd,
//        SubDetail,
//        SubPreview,
//        SubColumns,
//        SubSqlMetric
    } from './databaseList/containers';

import configureStore from './databaseList/stores/configureStore';
const store = configureStore();

import { HashRouter, Route, IndexRoute } from 'react-router-dom';
import getRoutes from './databaseList/routes';
import './databaseList/style/database.scss'

const routes = getRoutes();

const rootElement = document.querySelector('#databaseList');

render(
    <Provider store={store}>
        <HashRouter>
        {routes}
            {/*
            <div>
                <Route exact path="/" component={Main} />
                <Route path="/add" component={DatabaseAdd}>
                </Route>
            </div>
            */}
        </HashRouter>
    </Provider>,
    rootElement
);

/*
render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
);
*/
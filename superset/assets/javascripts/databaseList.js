import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import {
    Main,
    DatabaseAdd
} from './databaseList/containers';
import configureStore from './databaseList/stores/configureStore';
import {
    HashRouter,
    BrowserRouter,
    Route,
    IndexRoute
} from 'react-router-dom';
import './databaseList/style/database.scss';

const store = configureStore();
const rootElement = document.querySelector('#databaseList');
$('.navbar-inverse > .nav-container > .nav > li:nth-child(4)').addClass('active');

render(
    <Provider store={store}>
        <HashRouter>
            <div>
                <Route exact path="/" component={Main} />
                <Route path="/add" component={DatabaseAdd} />
            </div>
        </HashRouter>
    </Provider>,
    rootElement
);
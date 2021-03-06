import React from 'react';
import { render } from 'react-dom';
import { getInitialState, sqlLabReducer } from './reducers';
import { initEnhancer } from '../reduxUtils';
import { createStore, compose, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';

import App from './components/App';


require('./main.css');

const appContainer = document.getElementById('app');
const bootstrapData = JSON.parse(appContainer.getAttribute('data-bootstrap'));
const state = Object.assign({}, getInitialState(bootstrapData.defaultDbId), bootstrapData);

let store = createStore(
  sqlLabReducer, state, compose(applyMiddleware(thunkMiddleware), initEnhancer()));


const $ = window.$ = require('jquery');
const jQuery = window.jQuery = require('jquery'); // eslint-disable-line
require('bootstrap');
// jquery hack to highlight the navbar menu
$('.nav > li:nth-child(5)').addClass('active');

render(
  <Provider store={store}>
    <App />
  </Provider>,
  appContainer
);

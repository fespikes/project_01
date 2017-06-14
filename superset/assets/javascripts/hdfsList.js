import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import App from './hdfsList/containers/';
import configureStore from './hdfsList/stores/configureStore';

const store = configureStore();
const rootElement = document.querySelector('#hdfsList');

render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
);

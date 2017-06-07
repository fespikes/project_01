import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import App from './databaseList/containers/';
import configureStore from './databaseList/stores/configureStore';

const store = configureStore();
const rootElement = document.querySelector('#databaseList');

render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
);

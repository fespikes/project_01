import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import App from './tableList/containers/';
import configureStore from './tableList/stores/configureStore';

const store = configureStore();
const rootElement = document.querySelector('#tableList');

render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
);

/**
 * Created by haitao on 17-5-18.
 */
import { createStore, applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import rootReducer from '../reducers';

export default function configureStore(initialState) {
    const store = createStore(
        rootReducer,
        initialState,
        compose(
            applyMiddleware(thunkMiddleware/*, createLogger()*/),
            window.devToolsExtension ? window.devToolsExtension() : f => f
        )
    );

    return store;
}
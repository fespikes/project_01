import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import PropTypes from 'prop-types';
import { Operations, TableList, Paginations } from '../components';

class GraphContent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    };

    componentDidMount() {

    }

    render() {
        return (
            <div className="dashboard-panel">
                graph model
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

GraphContent.propTypes = propTypes;
GraphContent.defaultProps = defaultProps;

function mapStateToProps() {
    return {}
}

export default connect(mapStateToProps)(GraphContent);

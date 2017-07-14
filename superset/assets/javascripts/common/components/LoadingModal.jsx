import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
require('../../../stylesheets/loading.css');
class LoadingModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        // bindings
        this.hide = this.hide.bind(this);
        this.show = this.show.bind(this);
    };

    show() {
        this.refs.loading.style.display = "flex";
    }

    hide() {
        //this.refs.loading.style.display = "none";
        ReactDOM.unmountComponentAtNode(
            document.getElementById("popup_root")
        );
    }

    render() {
        return (
            <div className="loading-overlay" ref="loading">
                <div className="transwarp-spinner-img"></div>
                <img className="loading-image"/>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

LoadingModal.propTypes = propTypes;
LoadingModal.defaultProps = defaultProps;

export default LoadingModal;
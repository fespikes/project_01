import React, { Component } from 'react';
import { DataTendency, FavouriteAndCountPanel, EditAndEventPanel} from './';
import PropTypes from 'prop-types';
import { fetchData } from "../actions";
import { connect } from 'react-redux';

import intl from "react-intl-universal";
import http from "axios";
import _ from "lodash";
import * as utils  from '../../../utils/utils.jsx';

class Home extends Component {

    state = { initDone: false };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const { dispatch } = this.props;
        this.loadLocales();
        dispatch(fetchData());
    }

    render() {

        const { param, state } = this.props;

        return ( this.state.initDone &&
          <div>
                <DataTendency intl={intl}></DataTendency>
                <FavouriteAndCountPanel intl={intl}></FavouriteAndCountPanel>
                <EditAndEventPanel intl={intl}></EditAndEventPanel>
          </div>
        );
    }

    loadLocales() {
        utils.loadIntlResources(_ => this.setState({ initDone: true }));
    }

}

Home.propTypes = {
    param: PropTypes.any.isRequired,
    isFetching: PropTypes.any.isRequired,
    lastUpdated: PropTypes.any.isRequired
}

const mapStateToProps = (state, props) => {
    const { posts } = state;
    return {
        isFetching: posts.isFetching,
        param: posts.param,
        lastUpdated: posts.lastUpdated || false
    };
}

export default connect(mapStateToProps)(Home);
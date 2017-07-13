import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import { Select, Tooltip, TreeSelect, Alert, Popconfirm } from 'antd';
//import * as actionCreators from '../actions';
//import configureStore from '../stores/configureStore';
//import { Confirm, CreateHDFSConnect, CreateInceptorConnect } from '../popup';
//import { constructInceptorDataset, constructFileBrowserData, appendTreeChildren,
//    initDatasetData, extractOpeType, getDatasetId, extractDatasetType } from '../module';
//import { appendTreeData, constructTreeData } from '../../../utils/common2';
//import { renderLoadingModal } from '../../../utils/utils';

/* mock data  */
const fileBrowserData = require('../../mock/fileData1.json');
const fileBrowserData2 = require('../../mock/fileData2.json');

class HDFSDetail extends Component {

    constructor (props) {
        super(props);
    }

    render () {

        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    HDFS...
                </div>
            </div>
        );
    }
}

export default HDFSDetail;
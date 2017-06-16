import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../actions';
import { HashRouter, BrowserRouter, Route, NavLink, IndexRoute } from 'react-router-dom';

import {
    SubDetail,
    SubPreview,
    SubColumns,
    SubSqlMetric
} from './';

import '../style/databaseAdd.css';

const DatabaseAdd = ({ match }) => {
    console.log( 'in DatabaseAdd, arguments is: ', arguments );
//    const isActive = match => match&& match.isExact;
    const isActive = (match, location) => {
        return location.pathname==='/add' || location.pathname==='/add/detail';
    }
    return (
        <div className="data-detail">
           <h1 className="title"><i className="icon"></i>新建数据集</h1>
           <div className="data-detail-wrap">
               <div className="data-wrap-center">
                   <nav className="detail-nav">
                       <ul>
                           <li>
                                <NavLink
                                    activeClassName="active"
                                    to={`${match.url}/detail`}
                                    isActive={isActive}
                                >Detail</NavLink></li>
                           <li><NavLink to={`${match.url}/preview`} activeClassName="active">Preview</NavLink></li>
                           <li><NavLink to={`${match.url}/columns`} activeClassName="active">List Table Column</NavLink></li>
                           <li><NavLink to={`${match.url}/sqlMetric`} activeClassName="active">SqlMetric</NavLink></li>
                       </ul>
                   </nav>

                   <Route exact path={match.url} component={SubDetail}/>
                   <Route path={`${match.url}/detail`} component={SubDetail}/>
                   <Route path={`${match.url}/preview`} component={SubPreview}/>
                   <Route path={`${match.url}/columns`} component={SubColumns}/>
                   <Route path={`${match.url}/sqlMetric`} component={SubSqlMetric}/>
               </div>
           </div>
        </div>
    );
}

const Topic = ({ match }) => (
  <div>
    <h3>{match.params.topicId}</h3>
  </div>
)

export default DatabaseAdd;
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../actions';

import {
    Route,
    NavLink
} from 'react-router-dom';

import {
    SubDetail,
    SubPreview,
    SubColumns,
    SubSqlMetric
} from './';

import '../style/tableAdd.css';

const TableAdd = ({ match, location }) => {
    const pathArray = location.pathname.split('/');
    const type = pathArray[pathArray.length -1];
    let tab2Name = "配置";
    if(type === 'inceptor') {
        tab2Name = '预览';
    }
    const isActive = (match, location) => {
        return location.pathname==='/add/inceptor' || location.pathname==='/add/HDFS' || location.pathname==='/add/uploadFile'
            || location.pathname==='/add/detail/inceptor' || location.pathname==='/add/detail/HDFS' || location.pathname==='/add/detail/uploadFile';
    };
    return (
        <div className="data-detail">
           <h1 className="title">
               <i className="icon"/>新建数据集
           </h1>
           <div className="data-detail-wrap">
               <div className="data-wrap-center">
                   <nav className="detail-nav">
                       <ul>
                           <li>
                               <NavLink to={`${match.url}/detail/${type}`} activeClassName="active" isActive={isActive}>
                                   Detail
                               </NavLink>
                           </li>
                           <li>
                               <NavLink to={`${match.url}/preview/${type}`} activeClassName="active">
                                   { tab2Name }
                               </NavLink>
                           </li>
                           <li>
                               <NavLink to={`${match.url}/columns/${type}`} activeClassName="active">
                                   List Table Column
                               </NavLink>
                           </li>
                           <li>
                               <NavLink to={`${match.url}/sqlMetric/${type}`} activeClassName="active">
                                   SqlMetric
                               </NavLink>
                           </li>
                       </ul>
                   </nav>

                   <Route exact path={`${match.url}/:type`} component={SubDetail}/>
                   <Route path={`${match.url}/detail/:type`} component={SubDetail}/>
                   <Route path={`${match.url}/preview/:type`} component={SubPreview}/>
                   <Route path={`${match.url}/columns/:type`} component={SubColumns}/>
                   <Route path={`${match.url}/sqlMetric/:type`} component={SubSqlMetric}/>
               </div>
           </div>
        </div>
    );
};

export default TableAdd;
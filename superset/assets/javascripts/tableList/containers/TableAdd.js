import React, { Component } from 'react';
import { extractUrlType } from '../utils';
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
    const type = extractUrlType(location.pathname);
    let tab2Name = "配置";
    if(type === 'INCEPTOR') {
        tab2Name = '预览';
    }
    const isActive = (match, location) => {
        return location.pathname==='/add/INCEPTOR' || location.pathname==='/add/HDFS' || location.pathname==='/add/UPLOAD'
            || location.pathname==='/add/detail/INCEPTOR' || location.pathname==='/add/detail/HDFS' || location.pathname==='/add/detail/UPLOAD';
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
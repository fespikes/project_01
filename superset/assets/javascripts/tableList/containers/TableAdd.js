import React, { Component } from 'react';
import { getDatasetTab2Name, getDatasetTitle, getDatasetId, extractDatasetType } from '../module.jsx';
import { Route, NavLink } from 'react-router-dom';
import {
    SubDetail,
    SubPreview,
    SubColumns,
    SubSqlMetric
} from './';

import '../style/tableAdd.css';

const TableAdd = ({ match, location }) => {
    const type = extractDatasetType(location.pathname);
    const tab2Name = getDatasetTab2Name(type);
    const title = getDatasetTitle(match.path.substring(1), type);
    const id = getDatasetId(match.path.substring(1), location.pathname);
    const isDetailActive = (match, location) => {
        return location.pathname==='/add/detail/INCEPTOR/' || location.pathname==='/add/detail/HDFS/' || location.pathname==='/add/detail/UPLOAD/'
            || location.pathname.indexOf('/edit/detail/INCEPTOR') > -1 || location.pathname.indexOf('/edit/detail/HDFS') > -1 || location.pathname.indexOf('/edit/detail/UPLOAD') > -1;
    };
    const isPreviewActive = (match, location) => {
        return location.pathname==='/add/preview/INCEPTOR/' || location.pathname==='/add/preview/HDFS/' || location.pathname==='/add/preview/UPLOAD/'
            || location.pathname.indexOf('/edit/preview/INCEPTOR') > -1 || location.pathname.indexOf('/edit/preview/HDFS') > -1 || location.pathname.indexOf('/edit/preview/UPLOAD') > -1;
    };
    return (
        <div className="data-detail">
           <h1 className="title">
               <i className="icon"/>{title}
           </h1>
           <div className="data-detail-wrap">
               <div className="data-wrap-center">
                   <nav className="detail-nav">
                       <ul>
                           <li>
                               <NavLink to={`${match.url}/detail/${type}/${id}`} activeClassName="active" isActive={isDetailActive}>
                                   Detail
                               </NavLink>
                           </li>
                           <li>
                               <NavLink to={`${match.url}/preview/${type}/${id}`} activeClassName="active" isActive={isPreviewActive}>
                                   { tab2Name }
                               </NavLink>
                           </li>
                           <li>
                               <NavLink to={`${match.url}/columns/${type}/${id}`} activeClassName="active">
                                   List Table Column
                               </NavLink>
                           </li>
                           <li>
                               <NavLink to={`${match.url}/sqlMetric/${type}/${id}`} activeClassName="active">
                                   SqlMetric
                               </NavLink>
                           </li>
                       </ul>
                   </nav>

                   <Route exact path={`${match.url}/detail/:type`} component={SubDetail}/>
                   <Route path={`${match.url}/detail/:type/:id`} component={SubDetail}/>
                   <Route exact path={`${match.url}/preview/:type`} component={SubPreview}/>
                   <Route path={`${match.url}/preview/:type/:id`} component={SubPreview}/>
                   <Route exact path={`${match.url}/columns/:type`} component={SubColumns}/>
                   <Route path={`${match.url}/columns/:type/:id`} component={SubColumns}/>
                   <Route exact path={`${match.url}/sqlMetric/:type`} component={SubSqlMetric}/>
                   <Route path={`${match.url}/sqlMetric/:type/:id`} component={SubSqlMetric}/>
               </div>
           </div>
        </div>
    );
};

export default TableAdd;
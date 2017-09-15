import React, { Component } from 'react';
import { getDatasetTab2Name, getDatasetTitle, getDatasetId, extractDatasetType, extractOpeType, extractOpeName,
    judgeEnableClick, judgeEnableClickHDFSPreview } from '../module.jsx';
import { HashRouter, Route, NavLink, Switch } from 'react-router-dom';
import { connect, Provider } from 'react-redux';
import { SubDetail, SubPreview, SubColumns, SubSqlMetric } from './';
import '../style/tableAdd.css';
import { isActive } from '../module';

class TableAdd extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const { datasetId, HDFSConfigured } = this.props;
        const path = window.location.hash;
        const datasetType = extractDatasetType(path);
        const tab2Name = getDatasetTab2Name(datasetType);
        const opeType = extractOpeType(path);
        const title = getDatasetTitle(opeType, datasetType);
        const id = getDatasetId(opeType, path);
        const enableClick = judgeEnableClick(opeType, datasetId);
        const enableClickHDFSPreview = judgeEnableClickHDFSPreview(
            opeType, datasetType, datasetId, HDFSConfigured);
        const isDetailActive = (match, location) => {
            return isActive('detail', location);
        };
        const isPreviewActive = (match, location) => {
            return isActive('preview', location);
        };
        const isColumnsActive = (match, location) => {
            return isActive('columns', location);
        };
        const isSqlMetricActive = (match, location) => {
            return isActive('sqlMetric', location);
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
                                    <NavLink to={`/${opeType}/detail/${datasetType}/${id}`} activeClassName="active" isActive={isDetailActive}>
                                        基本信息
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to={`/${opeType}/preview/${datasetType}/${id}`} activeClassName="active" className={enableClickHDFSPreview?'':'link-disabled'} isActive={isPreviewActive} >
                                        { tab2Name }
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to={`/${opeType}/columns/${datasetType}/${id}`} activeClassName="active" className={enableClick?'':'link-disabled'} isActive={isColumnsActive}>
                                        列属性
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to={`/${opeType}/sqlMetric/${datasetType}/${id}`} activeClassName="active" className={enableClick?'':'link-disabled'} isActive={isSqlMetricActive}>
                                        度量
                                    </NavLink>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
                <div>
                    <Switch>
                        <Route exact path={`/${opeType}/detail/:type`} component={SubDetail}/>
                        <Route path={`/${opeType}/detail/:type/:id`} component={SubDetail}/>
                        <Route exact path={`/${opeType}/preview/:type`} component={SubPreview}/>
                        <Route path={`/${opeType}/preview/:type/:id`} component={SubPreview}/>
                        <Route exact path={`/${opeType}/columns/:type`} component={SubColumns}/>
                        <Route path={`/${opeType}/columns/:type/:id`} component={SubColumns}/>
                        <Route exact path={`/${opeType}/sqlMetric/:type`} component={SubSqlMetric}/>
                        <Route path={`/${opeType}/sqlMetric/:type/:id`} component={SubSqlMetric}/>
                    </Switch>
                </div>
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { subDetail } = state;
    return {
        datasetId:  subDetail.datasetId,
        HDFSConfigured: subDetail.HDFSConfigured
    };
}

export default connect(mapStateToProps)(TableAdd);
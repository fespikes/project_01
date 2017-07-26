import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ReactDOM, {render} from 'react-dom';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actionCreators from '../actions';
import {InceptorDetail, HDFSUploadDetail, UploadDetail} from './details';
import {extractOpeType, getDatasetId, extractDatasetType} from '../module';

class SubDetail extends Component {

    constructor (props) {
        super(props);
        this.state = {
            datasetType: props.match.params.type
        };

        this.initDatasetCache(props);
    }

    initDatasetCache(props) {
        const {clearDatasetData, saveDatasetId} = props;
        const opeType = extractOpeType(window.location.hash);
        let datasetId = '';
        if(opeType === 'edit') {
            datasetId = getDatasetId("edit", window.location.hash);
            saveDatasetId(datasetId);
        }else if(opeType === 'add') {
            saveDatasetId('');
            clearDatasetData();
        }
    }

    render () {
        const {
            dispatch,
            history,
            datasetType,
            dsInceptor,
            dsHDFS,
            HDFSConnected,
            isFetching
        } = this.props;
        const {
            fetchSchemaList,
            fetchDatabaseList,
            saveDatasetId,
            switchDatasetType,
            fetchTableList,
            saveInceptorDataset,
            createDataset,
            editDataset,
            saveHDFSDataset,
            fetchDBDetail,
            switchHDFSConnected,
            fetchDatasetDetail,
            fetchHDFSConnectList,
            fetchHDFSDetail,
            fetchHDFSFileBrowser,
            fetchInceptorConnectList,
            fetchUploadFile
        } = this.props;
        const opeType = extractOpeType(window.location.hash);
        const datasetId = getDatasetId(opeType, window.location.hash);
        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    <div className={datasetType==='INCEPTOR'?'':'none'}>
                        <InceptorDetail
                            dispatch={dispatch}
                            history={history}
                            datasetId={datasetId}
                            datasetType={datasetType}
                            dsInceptor={dsInceptor}
                            isFetching={isFetching}
                            fetchTableList={fetchTableList}
                            fetchDBDetail={fetchDBDetail}
                            fetchDatasetDetail={fetchDatasetDetail}
                            fetchSchemaList={fetchSchemaList}
                            fetchDatabaseList={fetchDatabaseList}
                            saveDatasetId={saveDatasetId}
                            saveInceptorDataset={saveInceptorDataset}
                            switchDatasetType={switchDatasetType}
                            createDataset={createDataset}
                            editDataset={editDataset}
                        />
                    </div>
                    <div className={(datasetType==='HDFS' || datasetType==='UPLOAD FILE')?'':'none'}>
                        <HDFSUploadDetail
                            dispatch={dispatch}
                            datasetId={datasetId}
                            datasetType={datasetType}
                            dsHDFS={dsHDFS}
                            HDFSConnected={HDFSConnected}
                            isFetching={isFetching}
                            saveHDFSDataset={saveHDFSDataset}
                            fetchDBDetail={fetchDBDetail}
                            fetchHDFSDetail={fetchHDFSDetail}
                            switchHDFSConnected={switchHDFSConnected}
                            fetchDatasetDetail={fetchDatasetDetail}
                            fetchHDFSFileBrowser={fetchHDFSFileBrowser}
                            fetchHDFSConnectList={fetchHDFSConnectList}
                            fetchInceptorConnectList={fetchInceptorConnectList}
                            fetchUploadFile={fetchUploadFile}
                        />
                    </div>
                    {/*<div className={datasetType==='UPLOAD FILE'?'':'none'}>
                        <UploadDetail
                            fetchUploadFile={fetchUploadFile}
                            dispatch={dispatch}
                            datasetId={datasetId}
                            datasetType={datasetType}
                            dsUpload={dsUpload}
                            isFetching={isFetching}
                            saveUploadDataset={saveUploadDataset}
                            fetchDBDetail={fetchDBDetail}
                            fetchHDFSDetail={fetchHDFSDetail}
                            fetchDatasetDetail={fetchDatasetDetail}
                            fetchHDFSFileBrowser={fetchHDFSFileBrowser}
                            fetchHDFSConnectList={fetchHDFSConnectList}
                            fetchInceptorConnectList={fetchInceptorConnectList}
                        />
                    </div>*/}
                    <div id="showAlert" className="alert-tip"></div>
                </div>
            </div>
        );
    }
}

function mapStateToProps (state) {
    return state.subDetail;
}

function mapDispatchToProps (dispatch) {
    const {
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        editDataset,
        saveDatasetId,
        saveHDFSDataset,
        saveInceptorDataset,
        saveUploadDataset,
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser,
        fetchUploadFile,
        fetchDatasetDetail,
        fetchDBDetail,
        fetchHDFSDetail,
        clearDatasetData,
        switchDatasetType,
        switchHDFSConnected,
        } = bindActionCreators(actionCreators, dispatch);
    return {
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        editDataset,
        saveDatasetId,
        saveHDFSDataset,
        saveInceptorDataset,
        saveUploadDataset,
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser,
        fetchUploadFile,
        fetchDatasetDetail,
        fetchDBDetail,
        fetchHDFSDetail,
        clearDatasetData,
        switchDatasetType,
        switchHDFSConnected,
        dispatch
    };
}

export default connect (mapStateToProps, mapDispatchToProps) (withRouter(SubDetail));
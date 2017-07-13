import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ReactDOM, {render} from 'react-dom';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actionCreators from '../actions';
import {InceptorDetail, HDFSDetail, UploadDetail} from './details';
import {extractOpeType, getDatasetId} from '../module';

class SubDetail extends Component {

    constructor (props) {
        super(props);
        this.state = {
            datasetType: props.match.params.type
        };
    }

    componentDidMount() {
        const { saveDatasetId } = this.props;
        const opeType = extractOpeType(window.location.hash);
        if(opeType === "edit") {
            const datasetId = getDatasetId("edit", window.location.hash);
            saveDatasetId(datasetId);
        }
    }

    render () {
        const {
            dispatch,
            history,
            datasetId,
            datasetType,
            dsInceptor,
            dsHDFS,
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
            fetchDBDetail,
            fetchDatasetDetail
        } = this.props;
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
                        />
                    </div>
                    <div className={datasetType==='HDFS'?'':'none'}>
                        {/*<HDFSDetail
                            dispatch={dispatch}
                            datasetId={datasetId}
                            dsHDFS={dsHDFS}
                            isFetching={isFetching}
                        />*/}
                    </div>
                    <div className={datasetType==='UPLOAD'?'':'none'}>

                    </div>
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
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser,
        fetchUploadFile,
        fetchDatasetDetail,
        fetchDBDetail,
        fetchHDFSDetail,
        switchDatasetType,
        switchHDFSConnected
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
        fetchHDFSConnectList,
        fetchInceptorConnectList,
        fetchHDFSFileBrowser,
        fetchUploadFile,
        fetchDatasetDetail,
        fetchDBDetail,
        fetchHDFSDetail,
        switchDatasetType,
        switchHDFSConnected,
        dispatch
    };
}

export default connect (mapStateToProps, mapDispatchToProps) (withRouter(SubDetail));
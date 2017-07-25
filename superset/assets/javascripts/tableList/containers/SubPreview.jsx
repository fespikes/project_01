import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { render } from 'react-dom';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import * as actionCreators from '../actions';
import { Table, Input, Button, Icon, Select, Alert } from 'antd';
import { getTableWidth, getColumnWidth, getTbTitle, getTbContent, getTbType, getTbTitleHDFS,
    getTbTitleInceptor, extractOpeType, extractDatasetType, constructHDFSDataset, getDatasetId } from '../module';
import {renderAlertTip, renderLoadingModal} from '../../../utils/utils';

class SubPreview extends Component {

    constructor (props) {
        super(props);
        this.state = {
            tableWidth: '100%',
            dsHDFS: {
                charset: 'utf-8'
            }
        };
        //bindings
        this.charsetChange = this.charsetChange.bind(this);
        this.saveHDFSDataset = this.saveHDFSDataset.bind(this);
        this.saveHDFSFilterParam = this.saveHDFSFilterParam.bind(this);
    }

    componentDidMount() {
        const { datasetId, fetchDatasetPreviewData } = this.props;
        const me = this;
        if(datasetId) {
            fetchDatasetPreviewData(datasetId, callback);
            function callback(success, data) {
                if(success) {
                    let width = getTableWidth(data.columns.length);
                    me.setState({
                        tableWidth: width,
                        data: data
                    });
                }else {
                    console.log("error...");
                }
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        const { datasetId, fetchDatasetPreviewData, isFetching } = this.props;
        const me = this;
        if(nextProps.datasetId !== datasetId && nextProps.datasetId) {
            fetchDatasetPreviewData(nextProps.datasetId, callback);
            function callback(success, data) {
                if(success) {
                    let width = getTableWidth(data.columns.length);
                    me.setState({
                        tableWidth: width,
                        data: data
                    });
                }else {
                    console.log("error...");
                }
            }
        }
        if(isFetching !== nextProps.isFetching) {
            const loadingModal = renderLoadingModal();
            if(nextProps.isFetching) {
                loadingModal.show();
            }else {
                loadingModal.hide();
            }
        }
    }

    charsetChange(value, node) {
        let objHDFS = this.state.dsHDFS;
        objHDFS.charset = node.props.children;
        this.setState({
            dsHDFS: objHDFS
        });
    }

    saveHDFSFilterParam() {
        let objHDFS = {...this.state.dsHDFS};
        objHDFS.file_type = this.refs.fileType.value;
        objHDFS.separator = this.refs.separator.value;
        objHDFS.quote = this.refs.quote.value;
        objHDFS.skip_rows = this.refs.skipRows.value;
        objHDFS.next_as_header = this.refs.nextAsHeader.checked;
        objHDFS.skip_more_rows = this.refs.skipMoreRows.value;
        this.setState({
            dsHDFS: objHDFS
        });
    }

    saveHDFSDataset() {
        const me = this;
        const { createDataset, editDataset, saveHDFSDataset } = this.props;
        this.saveHDFSFilterParam();
        const dsHDFS = constructHDFSDataset({...this.state.dsHDFS,...this.props.dsHDFS});
        const opeType = extractOpeType(window.location.hash);
        if(opeType === 'add') {
            createDataset(dsHDFS, callback);
            function callback(success, data) {
                let response = {};
                if(true) {
                    saveHDFSDataset({});
                    let url = '/' + opeType + '/columns/HDFS';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                    renderAlertTip(response, 'showAlertPreview');
                }
            }
        }else if(opeType === 'edit') {
            let hdfsId = getDatasetId(opeType, window.location.hash);
            editDataset(dsHDFS, hdfsId, callback);
            function callback(success, data) {
                let response = {};
                if(true) {
                    saveHDFSDataset({});
                    let url = '/' + opeType + '/columns/HDFS';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                    renderAlertTip(response, 'showAlertPreview');
                }
            }
        }
    }

    previewHDFSDataset() {

    }

    render() {
        const dsHDFS = this.state.dsHDFS;
        const tableWidth = this.state.tableWidth;
        let datasetType = extractDatasetType(window.location.hash);
        let tbTitle=[], tbTitleOnly=[], tbContent=[], tbType=[], tbContentHDFS=[];
        if(this.state.data) {
            let width = getColumnWidth(this.state.data.columns.length);
            tbTitleOnly = getTbTitle(this.state.data, width);
            tbType = getTbType(this.state.data);
            tbContent = getTbContent(this.state.data);
            if(datasetType === 'INCEPTOR') {
                tbTitle = getTbTitleInceptor(JSON.parse(JSON.stringify(tbTitleOnly)));
            }else if(datasetType === 'HDFS') {
                tbTitle = getTbTitleHDFS(JSON.parse(JSON.stringify(tbTitleOnly)));
                tbContentHDFS = [{
                    key: '1'
                }];
            }
        }

        return (
            <div>
                <div style={{width:'100%', height:'30px', background:'#fff', marginTop:'-2px'}}> </div>
                <div className="preview-table">
                    <div className={datasetType==='INCEPTOR'?'table-header':'none'} style={{width: tableWidth}}>
                        <Table
                            className="data-preview"
                            columns={tbTitle}
                            dataSource={tbType}
                            size='small'
                            pagination={false}
                        />
                    </div>
                    <div className={datasetType==='HDFS'?'table-header':'none'} style={{width: tableWidth}}>
                        <Table
                            columns={tbTitle}
                            dataSource={tbContentHDFS}
                            size='small'
                            pagination={false}
                        />
                    </div>
                    <div className="table-content" style={{width: tableWidth}}>
                        <Table
                            columns={tbTitleOnly}
                            dataSource={tbContent}
                            size='small'
                            pagination={false}
                            scroll={{y: 350}}
                        />
                    </div>
                </div>
                <div className={datasetType==='INCEPTOR'?'none':'data-detail-preview'}>
                    <div className="data-detail-border">
                        <div className="data-detail-item">
                            <span>文件类型：</span>
                            <input type="text" value={dsHDFS.file_type} defaultValue="csv" ref="fileType"/>
                        </div>
                        <div className="data-detail-item">
                            <span>分隔符：</span>
                            <input type="text" value={dsHDFS.separator} defaultValue="," ref="separator"/>
                            <i className="icon infor-icon" />
                        </div>
                        <div className="data-detail-item">
                            <span>引号符：</span>
                            <input type="text" value={dsHDFS.quote} defaultValue="\" ref="quote"/>
                            <i className="icon infor-icon" />
                        </div>
                        <div className="data-detail-item">
                            <span>忽略行数：</span>
                            <input type="text" value={dsHDFS.skip_rows} defaultValue="0" ref="skipRows"/>
                        </div>
                        <div className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" ref="nextAsHeader"/>
                                <p>下一行为列名</p>
                            </div>
                        </div>
                        <div className="data-detail-item">
                            <span>再忽略行数：</span>
                            <input type="text" value={dsHDFS.skip_more_rows} defaultValue="0" ref="skipMoreRows"/>
                        </div>
                        <div className="data-detail-item">
                            <span>字符集：</span>
                            <Select
                                style={{width: 312}}
                                value={dsHDFS.charset}
                                onSelect={this.charsetChange}
                            >
                                <Option value="utf-8">utf-8</Option>
                                <Option value="gbk">gbk</Option>
                                <Option value="iso-8859-15">iso-8859-15</Option>
                            </Select>
                        </div>
                    </div>
                    <div className="sub-btn">
                        <input type="button" defaultValue="预览" onClick={this.previewHDFSDataset} style={{marginRight: 20}}/>
                        <input type="button" defaultValue="保存" onClick={this.saveHDFSDataset}/>
                    </div>
                </div>
                <div id="showAlertPreview" className="alert-tip"></div>
            </div>
        );
    }
}

function mapStateToProps (state) {
    const { subDetail } = state;
    return {
        datasetId: subDetail.datasetId,
        dsHDFS: subDetail.dsHDFS,
        isFetching: subDetail.isFetching
    };
}

function mapDispatchToProps (dispatch) {

    //filter out all necessary properties
    const {
        createDataset,
        editDataset,
        saveHDFSDataset,
        fetchDatasetPreviewData
    } = bindActionCreators(actionCreators, dispatch);

    return {
        createDataset,
        editDataset,
        saveHDFSDataset,
        fetchDatasetPreviewData
    };
}

export default connect (mapStateToProps, mapDispatchToProps)(withRouter(SubPreview));
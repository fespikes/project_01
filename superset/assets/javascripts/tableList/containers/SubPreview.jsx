import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { render } from 'react-dom';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import * as actionCreators from '../actions';
import { extractUrlType } from '../utils';
import { Table, Input, Button, Icon, Select, Alert } from 'antd';
import { getTableWidth, getColumnWidth, getTbTitle, getTbContent, getTbType, getTbTitleHDFS,
    getTbTitleInceptor, extractOpeType, constructHDFSDataset, getDatasetId } from '../module';

function showAlert(response) {
    render(
        <Alert
            style={{ width: 400 }}
            type={response.type}
            message={response.message}
            closable={true}
            showIcon
        />,
        document.getElementById('showAlert')
    );
    setTimeout(function() {
        ReactDOM.unmountComponentAtNode(document.getElementById('showAlert'));
    }, 5000);
}

class SubPreview extends Component {

    constructor (props) {
        super(props);
        this.state = {
            tableWidth: '100%',
            dsHDFS: props.dsHDFS
        };
        //bindings
        this.charsetChange = this.charsetChange.bind(this);
        this.saveHDFSDataset = this.saveHDFSDataset.bind(this);
        this.saveHDFSFilterParam = this.saveHDFSFilterParam.bind(this);
    }

    componentDidMount() {
        const me = this;
        const { datasetId, fetchDatasetPreviewData } = me.props;
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

    charsetChange(value, node) {
        let objHDFS = this.state.dsHDFS;
        objHDFS.charset = node.props.children;
        this.setState({
            dsHDFS: objHDFS
        });
    }

    saveHDFSFilterParam() {
        let objHDFS = this.state.dsHDFS;
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
        const { createDataset, editDataset } = this.props;
        this.saveHDFSFilterParam();
        const dsHDFS = constructHDFSDataset(this.state.dsHDFS);
        const opeType = extractOpeType(window.location.hash);
        if(opeType === 'add') {
            createDataset(dsHDFS, callback);
            function callback(success, data) {
                let response = {};
                if(true) {
                    response.type = 'success';
                    response.message = '创建成功';
                    let url = '/' + opeType + '/columns/HDFS';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                }
            }
        }else if(opeType === 'edit') {
            let hdfsId = getDatasetId(opeType, window.location.hash);
            editDataset(dsHDFS, hdfsId, callback);
            function callback(success, data) {
                let response = {};
                if(true) {
                    response.type = 'success';
                    response.message = '编辑成功';
                    let url = '/' + opeType + '/columns/HDFS';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                }
            }
        }
    }

    previewHDFSDataset() {

    }

    render() {
        const { dsHDFS } = this.props;
        const tableWidth = this.state.tableWidth;
        const me = this;
        let datasetType = me.props.datasetType;
        if(datasetType === '') { //for browser refresh
            datasetType = extractUrlType(window.location.hash);
        }
        let tbTitle=[], tbTitleOnly=[], tbContent=[], tbType=[], tbContentHDFS=[];
        if(me.state.data) {
            let width = getColumnWidth(me.state.data.columns.length);
            tbTitleOnly = getTbTitle(me.state.data, width);
            tbType = getTbType(me.state.data);
            tbContent = getTbContent(me.state.data);
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
                            <input type="text" defaultValue={dsHDFS.file_type} ref="fileType"/>
                        </div>
                        <div className="data-detail-item">
                            <span>分隔符：</span>
                            <input type="text" defaultValue={dsHDFS.separator} ref="separator"/>
                            <i className="icon infor-icon" />
                        </div>
                        <div className="data-detail-item">
                            <span>引号符：</span>
                            <input type="text" defaultValue={dsHDFS.quote} ref="quote"/>
                            <i className="icon infor-icon" />
                        </div>
                        <div className="data-detail-item">
                            <span>忽略行数：</span>
                            <input type="text" defaultValue={dsHDFS.skip_rows} ref="skipRows"/>
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
                            <input type="text" defaultValue={dsHDFS.skip_more_rows} ref="skipMoreRows"/>
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
                <div id="showAlert" className="alert-tip"></div>
            </div>
        );
    }
}

function mapStateToProps (state) {
    return state.subDetail;
}

function mapDispatchToProps (dispatch) {

    //filter out all necessary properties
    const {
        createDataset,
        editDataset,
        fetchDatasetPreviewData
    } = bindActionCreators(actionCreators, dispatch);

    return {
        createDataset,
        editDataset,
        fetchDatasetPreviewData
    };
}

export default connect (mapStateToProps, mapDispatchToProps)(withRouter(SubPreview));
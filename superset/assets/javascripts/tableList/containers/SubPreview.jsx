import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { render } from 'react-dom';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import * as actionCreators from '../actions';
import { datasetTypes } from '../actions';
import { Table, Input, Button, Icon, Select, Alert, message } from 'antd';
import * as datasetModule from '../module';
import { DetailType } from '../popup';
import {renderAlertTip} from '../../../utils/utils';

class SubPreview extends Component {

    constructor (props) {
        super(props);
        this.state = {
            tableWidth: '100%',
            clickPreview: false,
            columnNames: [],
            dsHDFS: datasetModule.initHDFSPreviewData(
                props.dsHDFS,
                datasetModule.extractOpeType(window.location.hash)
            )
        };
        //bindings
        this.charsetChange = this.charsetChange.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.saveHDFSDataset = this.saveHDFSDataset.bind(this);
        this.previewHDFSDataset = this.previewHDFSDataset.bind(this);
        this.onTypeSelect = this.onTypeSelect.bind(this);
        this.hdfsColumnNameChange = this.hdfsColumnNameChange.bind(this);
    }

    componentDidMount() {
        const { datasetId, inceptorPreviewData, dsHDFS } = this.props;
        const datasetType = datasetModule.extractDatasetType(window.location.hash);
        if(datasetType === datasetTypes.database) {
            if(JSON.stringify(inceptorPreviewData) === "{}") {
                if(datasetId && datasetId.toString().length > 0) {
                    this.doFetchInceptorPreviewData(datasetId);
                }
            }else {
                this.doConstructTableData(datasetType, inceptorPreviewData);
            }
        } else if(datasetType === datasetTypes.hdfs || datasetType === datasetTypes.uploadFile) {
            if(dsHDFS && dsHDFS.hdfsConnectId) {
                this.doFetchHDFSPreviewData(dsHDFS);
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        const datasetType = datasetModule.extractDatasetType(window.location.hash);
        if(nextProps.datasetId !== this.props.datasetId && nextProps.datasetId) {
            if(datasetType === datasetTypes.database) {
                this.doFetchInceptorPreviewData(nextProps.datasetId);
            } else if(datasetType === datasetTypes.hdfs || datasetType === datasetTypes.uploadFile) {
                this.doFetchHDFSPreviewData(nextProps.dsHDFS);
            }
        }
    }

    handleChange(e) {
        const target = e.currentTarget;
        const name = target.name;
        const val = target.value;
        const objHDFS = {
            ...this.state.dsHDFS,
            [name]: val
        };
        this.setState({
            dsHDFS: objHDFS
        });
    }

    hdfsColumnNameChange(e) {
        const target = e.currentTarget;
        const val = target.value;
        const key = target.name;
        const tbTitleOnly = JSON.parse(JSON.stringify(this.state.tbTitle));
        tbTitleOnly.map((column) => {
            if(column.key === key) {
                column.title = val;
                column.dataIndex = val;
            }
        });
        const tbTitle = datasetModule.getTbTitleHDFS(
            JSON.parse(JSON.stringify(tbTitleOnly)),
            this,
            this.state.tbTitle,
            false
        );
        const columnNames = this.constructColumnNames(tbTitle);
        this.setState({
            tbTitle: tbTitle,
            columnNames: columnNames
        });
    }

    doFetchInceptorPreviewData(datasetId) {
        const me = this;
        const {fetchInceptorPreviewData, saveInceptorPreviewData} = this.props;
        fetchInceptorPreviewData(datasetId, callback);
        function callback(success, data) {
            if(success) {
                let width = datasetModule.getTableWidth(data.columns.length);
                saveInceptorPreviewData(data);
                me.setState({
                    tableWidth: width,
                    data: data
                });
                me.doConstructTableData(datasetTypes.database, data);
            }else {
                message.error(data, 5);
            }
        }
    }

    doFetchHDFSPreviewData(dsHDFS) {
        const me = this;
        const {fetchHDFSPreviewData, datasetId} = this.props;
        fetchHDFSPreviewData(dsHDFS, datasetId, callback);
        function callback(success, data) {
            if(success) {
                let width = datasetModule.getTableWidth(data.columns.length);
                me.setState({
                    tableWidth: width,
                    data: data
                });
                me.doConstructTableData(datasetTypes.hdfs, data);
            }else {
                message.error(data, 5);
            }
        }
    }

    doConstructTableData(datasetType, data) {
        let tbTitle=[], tbType=[], tbContentHDFS=[], columnNames=this.state.columnNames;
        let width = datasetModule.getColumnWidth(data.columns.length);
        let tbTitleOnly = datasetModule.getTbTitle(data, width);
        let tbContent = datasetModule.getTbContent(data);
        if(datasetType === datasetTypes.database) {
            tbType = datasetModule.getTbType(data);
            tbTitle = datasetModule.getTbTitleInceptor(JSON.parse(JSON.stringify(tbTitleOnly)), width);
        }else if(datasetType === datasetTypes.hdfs || datasetType === datasetTypes.uploadFile) {
            tbTitle = datasetModule.getTbTitleHDFS(JSON.parse(JSON.stringify(tbTitleOnly)), this, data.types, true);
            tbContentHDFS = [{
                key: '1'
            }];
            if(!this.state.clickPreview) {
                columnNames = this.constructColumnNames(tbTitle);
            }
        }
        this.setState({
            tbType: tbType,
            tbTitle: tbTitle,
            tbTitleOnly: tbTitleOnly,
            tbContent: tbContent,
            tbContentHDFS: tbContentHDFS,
            columnNames: columnNames
        });
    }

    constructColumnNames(tbTitle) {
        const self = this;
        const tableWidth = this.state.tableWidth;
        const colWidth = datasetModule.getHDFSInputColumnWidth(tableWidth, tbTitle.length);
        const columnNames = tbTitle.map((column) => {
            return <input
                type="text"
                className="tp-input hdfs-column-input"
                name={column.key}
                key={column.key}
                style={{width: colWidth}}
                value={column.title}
                onChange={self.hdfsColumnNameChange}
            />
        });
        return columnNames;
    }

    charsetChange(value, node) {
        let objHDFS = {
            ...this.state.dsHDFS,
            charset: node.props.children
        };
        this.setState({
            dsHDFS: objHDFS
        });
    }

    setDataAccuracy(type, accuracy, column) {
        let tbHDFSTitle = [];
        let tbTitle = this.state.tbTitle;
        if(type.indexOf('varchar') > -1) {
            let maxLen = accuracy.maxLen;
            let varcharStr = 'varchar(' + maxLen + ')';
            tbHDFSTitle = datasetModule.setHDFSColumnType(column, tbTitle, varcharStr, this);
        }else if(type.indexOf('decimal') > -1) {
            let effectiveNum = accuracy.effectiveNum;
            let decimalNum = accuracy.decimalNum;
            let decimalStr = 'decimal(' + effectiveNum + ',' + decimalNum + ')';
            tbHDFSTitle = datasetModule.setHDFSColumnType(column, tbTitle, decimalStr, this);
        }else {
            tbHDFSTitle = datasetModule.setHDFSColumnType(column, tbTitle, type, this);
        }
        this.setState({
            tbTitle: tbHDFSTitle
        });
    }

    onTypeSelect(value, column) {
        if(value.indexOf('varchar') > -1 || value.indexOf('decimal') > -1) {
            render(
                <DetailType
                    dataType={value}
                    setDataAccuracy={(type, accuracy)=>this.setDataAccuracy(type, accuracy, column)}
                />,
                document.getElementById('popup_root')
            );
        }else {
            this.setDataAccuracy(value, '', column);
        }
    }

    saveHDFSDataset() {
        const me = this;
        const { createDataset, editDataset } = this.props;
        const dsHDFS = datasetModule.constructHDFSDataset(this.state.dsHDFS, this.state.tbTitle);
        const opeType = datasetModule.extractOpeType(window.location.hash);
        if(opeType === 'add') {
            createDataset(dsHDFS, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    let url = '/' + opeType + '/columns/HDFS/';
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                    renderAlertTip(response, 'showAlertPreview', 400);
                }
            }
        }else if(opeType === 'edit') {
            let hdfsId = datasetModule.getDatasetId(opeType, window.location.hash);
            editDataset(dsHDFS, hdfsId, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    let url = '/' + opeType + '/columns/HDFS/' + hdfsId;
                    me.props.history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                    renderAlertTip(response, 'showAlertPreview', 400);
                }
            }
        }
    }

    previewHDFSDataset() {
        const dsHDFS = this.state.dsHDFS;
        this.doFetchHDFSPreviewData(dsHDFS);
        this.setState({
            clickPreview: true
        });
    }

    render() {
        const dsHDFS = this.state.dsHDFS;
        const tableWidth = this.state.tableWidth;
        const datasetType = datasetModule.extractDatasetType(window.location.hash);
        return (
            <div id="data-preview-id">
                <div style={{width:'100%', height:'30px', background:'#fff', marginTop:'-2px'}}></div>
                <div className="preview-table">
                    <div
                        className={datasetType===datasetTypes.hdfs?'editable-table-header':'none'}
                        style={{width: tableWidth, height: 40}}
                    >
                        {this.state.columnNames}
                    </div>
                    <div className={datasetType===datasetTypes.database?'table-header':'none'}
                         style={{width: tableWidth}}>
                        <Table
                            className="data-preview"
                            columns={this.state.tbTitle}
                            dataSource={this.state.tbType}
                            size='small'
                            pagination={false}
                        />
                    </div>
                    <div className={(datasetType===datasetTypes.hdfs || datasetType===datasetTypes.uploadFile)?
                                    'table-header hdfs-table-header':'none'}
                         style={{width: tableWidth}}>
                        <Table
                            columns={this.state.tbTitle}
                            dataSource={this.state.tbContentHDFS}
                            size='small'
                            className="hdfs-data-type"
                            pagination={false}
                        />
                    </div>
                    <div className="table-content" style={{width: tableWidth}}>
                        <Table
                            columns={this.state.tbTitleOnly}
                            dataSource={this.state.tbContent}
                            size='small'
                            pagination={false}
                        />
                    </div>
                </div>
                <div className={datasetType===datasetTypes.database?'none':'data-detail-preview'}>
                    <div className="data-detail-border">
                        <div className="data-detail-item">
                            <span>文件类型：</span>
                            <input type="text" value={dsHDFS.file_type} className="tp-input"
                                   name="file_type" onChange={this.handleChange}/>
                        </div>
                        <div className="data-detail-item">
                            <span>分隔符：</span>
                            <input type="text" value={dsHDFS.separator} className="tp-input"
                                   name="separator" onChange={this.handleChange}/>
                            <i className="icon infor-icon" />
                        </div>
                        <div className="data-detail-item">
                            <span>引号符：</span>
                            <input type="text" value={dsHDFS.quote} className="tp-input"
                                   name="quote" onChange={this.handleChange}/>
                            <i className="icon infor-icon" />
                        </div>
                        <div className="data-detail-item">
                            <span>忽略行数：</span>
                            <input type="text" value={dsHDFS.skip_rows} className="tp-input"
                                   name="skip_rows" onChange={this.handleChange}/>
                        </div>
                        <div className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" checked={dsHDFS.next_as_header} className="tp-input"
                                       name="next_as_header" onChange={this.handleChange}/>
                                <p>下一行为列名</p>
                            </div>
                        </div>
                        <div className="data-detail-item">
                            <span>再忽略行数：</span>
                            <input type="text" value={dsHDFS.skip_more_rows} className="tp-input"
                                   name="skip_more_rows" onChange={this.handleChange}/>
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
                        <button onClick={this.previewHDFSDataset} style={{marginRight: 20}}>
                            预览
                        </button>
                        <button onClick={this.saveHDFSDataset}>
                            保存
                        </button>
                    </div>
                    <div id="showAlertPreview" className="alert-tip"></div>
                </div>
            </div>
        );
    }
}

function mapStateToProps (state) {
    const { subDetail } = state;
    return {
        datasetId: subDetail.datasetId,
        dsHDFS: subDetail.dsHDFS,
        dsInceptor: subDetail.dsInceptor,
        isFetching: subDetail.isFetching,
        inceptorPreviewData: subDetail.inceptorPreviewData
    };
}

function mapDispatchToProps (dispatch) {

    //filter out all necessary properties
    const {
        createDataset,
        editDataset,
        saveHDFSDataset,
        saveInceptorPreviewData,
        fetchInceptorPreviewData,
        fetchHDFSPreviewData
    } = bindActionCreators(actionCreators, dispatch);

    return {
        createDataset,
        editDataset,
        saveHDFSDataset,
        saveInceptorPreviewData,
        fetchInceptorPreviewData,
        fetchHDFSPreviewData
    };
}

export default connect (mapStateToProps, mapDispatchToProps)(withRouter(SubPreview));
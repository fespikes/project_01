import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { render } from 'react-dom';
import {bindActionCreators} from 'redux';
import * as actionCreators from '../actions';
import { extractUrlType } from '../utils';
import { Table, Input, Button, Icon, Select } from 'antd';
import { getWidthPercent, getTbTitle, getTbContent, getTbType, getTbTitleHDFS, getTbTitleInceptor } from '../module.jsx';

class SubPreview extends Component {
    state = {
        filterDropdownVisible: false,
        searchText: '',
        filtered: false
    };

    componentDidMount() {
        const me = this;
        const { datasetId, fetchDatasetPreviewData } = me.props;
        fetchDatasetPreviewData(datasetId, callback);
        function callback(success, data) {
            if(success) {
                me.setState({
                    data: data
                });
            }else {

            }
        }
    }

    charsetChange() {

    }

    render() {
        const me = this;
        let datasetType = me.props.datasetType;
        if(datasetType === '') { //for browser refresh
            datasetType = extractUrlType(window.location.hash);
        }
        let tbTitle=[], tbTitleOnly=[], tbContent=[], tbType=[], tbContentHDFS=[], tbContentInceptor=[];
        if(me.state.data) {
            let widthPercent = getWidthPercent(me.state.data.columns.length);
            tbTitleOnly = getTbTitle(me.state.data, widthPercent);
            tbType = getTbType(me.state.data, widthPercent);
            tbContent = getTbContent(me.state.data, widthPercent);
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
                <div className={datasetType==='INCEPTOR'?'table-header':'none'}>
                    <Table
                        columns={tbTitle}
                        dataSource={tbType}
                        size='small'
                        pagination={false}
                    />
                </div>
                <div className={datasetType==='HDFS'?'table-header':'none'}>
                    <Table
                        columns={tbTitle}
                        dataSource={tbContentHDFS}
                        size='small'
                        pagination={false}
                    />
                </div>
                <div className="table-content">
                    <Table
                        columns={tbTitleOnly}
                        dataSource={tbContent}
                        size='small'
                        pagination={false}
                        scroll={{ y: 350 }}
                    />
                </div>
                <div className={datasetType==='INCEPTOR'?'none':'data-detail-preview'}>
                    <div className="data-detail-border">
                        <label className="data-detail-item">
                            <span>文件类型：</span>
                            <input type="text" defaultValue="csv" />
                        </label>
                        <label className="data-detail-item">
                            <span>分隔符：</span>
                            <input type="text" defaultValue="," />
                            <i className="icon infor-icon" />
                        </label>
                        <label className="data-detail-item">
                            <span>引号符：</span>
                            <input type="text" defaultValue="'" />
                            <i className="icon infor-icon" />
                        </label>
                        <label className="data-detail-item">
                            <span>忽略行数：</span>
                            <input type="text" defaultValue="0" />
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id=""/>
                                <p>下一行为列名</p>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>再忽略行数：</span>
                            <input type="text" defaultValue="0"/>
                        </label>
                        <label className="data-detail-item">
                            <span>字符集：</span>
                            <Select
                                style={{width: 312}}
                                defaultValue={'utf-8'}
                                onChange={this.charsetChange}
                            >
                                <Option value="utf-8">utf-8</Option>
                                <Option value="gbk">gbk</Option>
                                <Option value="iso-8859-15">iso-8859-15</Option>
                            </Select>
                        </label>
                    </div>
                    <label className="sub-btn">
                        <input type="button" defaultValue="预览" style={{marginRight: 20}}/>
                        <input type="button" defaultValue="保存"/>
                    </label>
                </div>
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
        fetchDatasetPreviewData
        } = bindActionCreators(actionCreators, dispatch);

    return {
        fetchDatasetPreviewData
    };
}

export default connect (mapStateToProps, mapDispatchToProps)(SubPreview);
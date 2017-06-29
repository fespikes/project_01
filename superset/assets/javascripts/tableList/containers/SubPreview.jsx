import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { render } from 'react-dom';
import {bindActionCreators} from 'redux';
import * as actionCreators from '../actions';
import { Table, Input, Button, Icon, Select } from 'antd';
import { getWidthPercent, getTbTitle, getTbContent, getTbType } from '../utils';

class SubPreview extends Component {
    state = {
        filterDropdownVisible: false,
        searchText: '',
        filtered: false
    };
    onInputChange = (e) => {
        this.setState({ searchText: e.target.value });
    };
    onSearch = () => {
        const { searchText } = this.state;
        const reg = new RegExp(searchText, 'gi');
        this.setState({
            filterDropdownVisible: false,
            filtered: !!searchText,
            data: data.map((record) => {
                const match = record.name.match(reg);
                if (!match) {
                    return null;
                }
                return {
                    ...record,
                    name: (
                        <span>
                            {record.name.split(reg).map((text, i) => (
                                i > 0 ? [<span className="highlight">{match[0]}</span>, text] : text
                            ))}
                        </span>
                    ),
                };
            }).filter(record => !!record),
        });
    }

    componentDidMount() {
        const me = this;
        const { datasetId, fetchDatasetPreviewData } = me.props;
        fetchDatasetPreviewData(11, callback);
        function callback(success, data) {
            if(success) {
                me.setState({
                    data: data
                });
            }else {

            }
        }
    }

    render() {
        const me = this;
        const { datasetType } = me.props;
        let tbTitle = [], tbContent = [], tbType=[];
        if(me.state.data) {
            let widthPercent = getWidthPercent(me.state.data.columns.length);
            tbTitle = getTbTitle(me.state.data, widthPercent);
            tbType = getTbType(me.state.data, widthPercent);
            tbContent = getTbContent(me.state.data, widthPercent);
        }

        return (
            <div>
                <div style={{width:'100%', height:'30px', background:'#fff', marginTop:'-2px'}}> </div>
                <div className="table-header">
                    <Table
                        columns={tbTitle}
                        dataSource={tbType}
                        size='small'
                        pagination={false}
                    />
                </div>
                <div className="table-content">
                    <Table
                        columns={tbTitle}
                        dataSource={tbContent}
                        size='small'
                        pagination={false}
                        scroll={{ y: 350 }}
                    />
                </div>
                <div className={datasetType==='INCEPTOR'?'none':'data-detail-preview'}>
                    <div className="data-detail-border">
                        <label className="data-detail-item">
                            <span>type：</span>
                            <input type="text" defaultValue="Separated values(CSV,TSV,...)" />
                        </label>
                        <label className="data-detail-item">
                            <span>Quoting style：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon" />
                        </label>
                        <label className="data-detail-item">
                            <span>Separator：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon" />
                        </label>
                        <label className="data-detail-item">
                            <span>Quoting character：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon" />
                        </label>
                        <label className="data-detail-item">
                            <span>Skip first lines：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id=""/>
                                <p>Parse next line as column headers </p>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>Skip next lines：</span>
                            <input type="text" defaultValue=""/>
                        </label>
                        <label className="data-detail-item">
                            <span>Charset：</span>
                            <input type="text" defaultValue=""/>
                        </label>
                        <label className="data-detail-item">
                            <span>arrayMapFormat：</span>
                            <input type="text" defaultValue=""/>
                            <i className="icon infor-icon"/>
                        </label>
                        <label className="data-detail-item">
                            <span>arrayItemSeparator：</span>
                            <input type="text" defaultValue=""/>
                        </label>
                        <label className="data-detail-item">
                            <span>mapKeySeparator：</span>
                            <input type="text" defaultValue=""/>
                        </label>
                        <label className="data-detail-item">
                            <span>Date serialization format：</span>
                            <input type="text" defaultValue=""/>
                        </label>
                        <label className="data-detail-item">
                            <span>File Compression：</span>
                            <input type="text" defaultValue=""/>
                            <i className="icon infor-icon"/>
                        </label>
                        <label className="data-detail-item">
                            <span>Bad data type behavior (read)：</span>
                            <input type="text" defaultValue=""/>
                            <i className="icon infor-icon"/>
                        </label>
                        <label className="data-detail-item">
                            <span>Bad data type behavior (write)：</span>
                            <input type="text" defaultValue="" />
                            <i className="icon infor-icon"/>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id=""/>
                                <p>Normalize booleans Normalize all possible boolean values (0, 1, yes, no, …) to 'true' and 'false' </p>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="data-detail-checkbox">
                                <input type="checkbox" name="" id=""/>
                                <p>Normalize floats & doubles Normalize floating point values (force '42' to '42.0')</p>
                            </div>
                        </label>

                        <label className="data-detail-item">
                            <span>Add. columns behavior (read)：</span>
                            <input type="text" defaultValue=""/>
                            <i className="icon infor-icon"/>
                        </label>
                    </div>
                    <label className="sub-btn">
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
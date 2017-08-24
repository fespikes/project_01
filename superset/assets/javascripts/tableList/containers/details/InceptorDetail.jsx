import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Link, withRouter } from 'react-router-dom';
import { Select, Tooltip, TreeSelect, Alert, Popconfirm } from 'antd';
import { Confirm, CreateHDFSConnect, CreateInceptorConnect } from '../../popup';
import { fetchSchemaList } from '../../actions';
import { constructInceptorDataset, initDatasetData, extractOpeType, getDatasetId, extractDatasetType } from '../../module';
import { appendTreeData, constructTreeData } from '../../../../utils/common2';
import { renderLoadingModal, renderAlertTip } from '../../../../utils/utils';

const $ = window.$ = require('jquery');

class InceptorDetail extends Component {

    constructor (props) {
        super(props);
        this.state = {
            dsInceptor: props.dsInceptor,
            disabled: 'disabled'
        };
        //bindings
        this.onSave = this.onSave.bind(this);
        this.onSelectTable = this.onSelectTable.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
        this.onConnectChange = this.onConnectChange.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.callbackRefresh = this.callbackRefresh.bind(this);
        this.checkIfSubmit = this.checkIfSubmit.bind(this);
        this.createInceptorConnect = this.createInceptorConnect.bind(this);
    }

    handleChange(e) {
        const target = e.currentTarget;
        const name = target.name;
        const val = target.value;
        const objInceptor = {
            ...this.state.dsInceptor,
            [name]: val
        };
        this.setState({
            dsInceptor: objInceptor
        });
    }

    onConnectChange(dbId, node) {
        const me = this;
        const {fetchSchemaList} = this.props;
        fetchSchemaList(dbId, callback);
        function callback(success, data) {
            if(success) {
                let treeData = constructTreeData(data, false, 'folder');
                let objInceptor = {...me.state.dsInceptor};
                objInceptor.database_id = dbId;
                objInceptor.db_name = node.props.children;
                objInceptor.treeData = treeData;
                me.setState({
                    dsInceptor: objInceptor
                });
            }else {
                console.log("error...");
            }
        }
    }

    onSelectTable(value, node) {
        if(node.props.isLeaf) {
            let dsInceptor = {
                ...this.state.dsInceptor,
                table_name: value
            };
            this.setState({
                dsInceptor: dsInceptor
            });
        }
    }

    createInceptorConnect() {
        const { dispatch } = this.props;
        render(
            <CreateInceptorConnect
                dispatch={dispatch}
                callbackRefresh={this.callbackRefresh}
            />,
            document.getElementById('popup_root')
        );
    }

    callbackRefresh() {
        this.doFetchDatabaseList();
    }

    onLoadData(node) {
        const me = this;
        const schema = node.props.value;
        const { fetchTableList } = me.props;
        return fetchTableList(me.state.dsInceptor.database_id, schema, callback);

        function callback(success, data) {
            if(success) {
                let treeData = appendTreeData(
                    schema,
                    data,
                    JSON.parse(JSON.stringify(me.state.dsInceptor.treeData))
                );
                let dsInceptor = {...me.state.dsInceptor};
                dsInceptor.schema = schema;
                dsInceptor.treeData = treeData;
                me.setState({
                    dsInceptor: dsInceptor
                });
            }else {
                console.log("error...");
            }
        }
    }

    onSave() {
        const {history, datasetType, createDataset, saveDatasetId, editDataset, saveInceptorDataset} = this.props;
        const opeType = extractOpeType(window.location.hash);
        const datasetId = getDatasetId(opeType, window.location.hash);
        const dsInceptor = constructInceptorDataset(this.state.dsInceptor);
        saveInceptorDataset(this.state.dsInceptor);
        if(window.location.hash.indexOf('/edit') > 0) {
            editDataset(dsInceptor, datasetId, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    const url = '/' + opeType + '/preview/' + datasetType + '/' + datasetId;
                    history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                    renderAlertTip(response, 'showAlertDetail');
                }
            }
        }else {
            createDataset(dsInceptor, callback);
            function callback(success, data) {
                let response = {};
                if(success) {
                    saveDatasetId(data.object_id);
                    const url = '/' + opeType + '/preview/' + datasetType + '/';
                    history.push(url);
                }else {
                    response.type = 'error';
                    response.message = data;
                    renderAlertTip(response, 'showAlertDetail');
                }
            }
        }
    }

    checkIfSubmit() {
        var fields = $(".inceptor-detail input[required]");
        let disabled = null;

        fields.each((idx, obj) => {
            if (obj.value === '') {
                disabled = 'disabled';
                return;
            }
        });
        if(disabled === this.state.disabled) {
            return;
        }
        this.setState({
            disabled: disabled
        });
    }

    componentDidMount() {
        const datasetType = extractDatasetType(window.location.hash);
        if(datasetType === "INCEPTOR") {
            this.doFetchDatabaseList();
            if(window.location.hash.indexOf('/edit') > 0) {
                this.doDatasetEdit();
            }
        }
    }

    doFetchDatabaseList() {
        const { fetchDatabaseList } = this.props;
        const me = this;
        fetchDatabaseList(callback);
        function callback(success, data) {
            if(success) {
                let objInceptor = {
                    ...me.state.dsInceptor,
                    databases: data
                };
                me.setState({
                    dsInceptor: objInceptor
                });
            }
        }
    }

    doDatasetEdit() {
        const me = this;
        const {fetchDatasetDetail, fetchDBDetail, fetchSchemaList} = me.props;
        const datasetId = getDatasetId("edit", window.location.hash);
        fetchDatasetDetail(datasetId, callback);
        function callback(success, data) {
            if(success) {
                fetchDBDetail(data.database_id, callbackDBName);
                fetchSchemaList(data.database_id, callbackSchemaList);
                function callbackDBName(success, db) {
                    if(success) {
                        let objIncpetor = {
                            ...me.state.dsInceptor,
                            db_name: db.database_name
                        };
                        me.setState({
                            dsInceptor: initDatasetData('INCEPTOR', data, objIncpetor)
                        });
                    }
                }
                function callbackSchemaList(success, data) {
                    if(success) {
                        let treeData = constructTreeData(data, false, 'folder');
                        let objIncpetor = {
                            ...me.state.dsInceptor,
                            treeData: treeData
                        };
                        me.setState({
                            dsInceptor: objIncpetor
                        });
                    }
                }
            }
        }
    }

    componentDidUpdate() {
        this.checkIfSubmit();
    }

    componentWillReceiveProps(nextProps) {
        const { isFetching } = this.props;
        if(isFetching !== nextProps.isFetching) {
            const loadingModal = renderLoadingModal();
            if(nextProps.isFetching) {
                loadingModal.show();
            }else {
                loadingModal.hide();
            }
        }
    };

    render () {
        const dsInceptor = this.state.dsInceptor;
        const Option = Select.Option;
        let dbOptions=[];
        if(this.state.dsInceptor.databases) {
            dbOptions = this.state.dsInceptor.databases.map(database => {
                return <Option key={database.id}>{database.database_name}</Option>
            });
        }
        return (
            <div className="inceptor-detail">
                <div className="data-detail-item">
                    <span>数据集名称：</span>
                    <input type="text" name="dataset_name" className="tp-input" value={dsInceptor.dataset_name}
                          required="required" onChange={this.handleChange}/>
                </div>
                <div className="data-detail-item">
                    <span>描述：</span>
                    <textarea name="description" className="tp-textarea" value={dsInceptor.description}
                          required="required" onChange={this.handleChange}/>
                </div>
                <div className="data-detail-item">
                    <span>选择连接：</span>
                    <Select
                        style={{ width: 230 }}
                        value={dsInceptor.db_name}
                        onSelect={this.onConnectChange}
                    >
                        {dbOptions}
                    </Select>
                    <div className="connect-success">
                        &nbsp;<button onClick={this.createInceptorConnect}>新建连接</button>
                    </div>
                    <input type="hidden" required="required" value={dsInceptor.db_name}/>
                </div>
                <div className="data-detail-item">
                    <span>选择表：</span>
                    <TreeSelect
                        showSearch
                        value={dsInceptor.table_name}
                        style={{ width: 782 }}
                        placeholder="Please select"
                        treeData={dsInceptor.treeData}
                        loadData={this.onLoadData}
                        onSelect={this.onSelectTable}
                        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                    >
                    </TreeSelect>
                    <Tooltip title="选择表">
                        <i className="icon icon-info"/>
                    </Tooltip>
                    <input type="hidden" required="required" value={dsInceptor.table_name}/>
                </div>
                <div className="data-detail-item">
                    <span>SQL：</span>
                    <textarea className="tp-textarea" cols="30" rows="10" value={dsInceptor.sql}
                              name="sql" onChange={this.handleChange}/>
                    <a href={ window.location.origin + '/p/sqllab' } target="_blank">
                        切换至SQL LAB编辑
                    </a>
                </div>
                <div className="sub-btn">
                    <button onClick={this.onSave} disabled={this.state.disabled}>
                        保存
                    </button>
                </div>
            </div>
        );
    }
}

export default InceptorDetail;
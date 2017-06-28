import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import {bindActionCreators} from 'redux';
import { Select, Tooltip, TreeSelect, Alert } from 'antd';
import * as actionCreators from '../actions';
import { appendTreeData, constructTreeData } from '../../../utils/common2';

class SubDetail extends Component {

    constructor (props) {
        super(props);
        this.state = {
            databases: [],
            dataset: {
                dataset_type: props.match.params.type,
                dataset_name: '',
                table_name: '',
                schema: '',
                database_id: '',
                sql: '',
                description: ''
            },
            treeData: [],
        };

        this.onSave = this.onSave.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
        this.onConnectChange = this.onConnectChange.bind(this);
        this.handleSQLChange = this.handleSQLChange.bind(this);
        this.handleDatasetChange = this.handleDatasetChange.bind(this);
        this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    }

    handleDatasetChange(e) {
        this.state.dataset.dataset_name = e.currentTarget.value;
        this.setState({
            dataset: this.state.dataset
        });
    }

    handleDescriptionChange(e) {
        this.state.dataset.description = e.currentTarget.value;
        this.setState({
            dataset: this.state.dataset
        });
    }

    handleSQLChange(e) {
        this.state.dataset.sql = e.currentTarget.value;
        this.setState({
            dataset: this.state.dataset
        });
    }

    onConnectChange(dbId) {
        const me = this;
        const { dispatch, fetchSchemaList } = me.props;
        dispatch(fetchSchemaList(dbId, callback));
        function callback(success, data) {
            if(success) {
                let treeData = constructTreeData(data, false, 'folder');
                me.state.dataset.database_id = dbId;
                me.setState({
                    dataset: me.state.dataset,
                    treeData: treeData
                });
            }else {

            }
        }
    }

    onSelect(value, node) {
        if(node.props.category === 'file') {
            this.state.dataset.table_name = value;
            this.setState({
                dataset: this.state.dataset
            });
        }
    }

    onLoadData(node) {
        const me = this;
        const schema = node.props.value;
        const { dispatch, fetchTableList } = me.props;
        dispatch(fetchTableList(me.state.dataset.database_id, schema, callback));

        function callback(success, data) {
            if(success) {
                let treeData = appendTreeData(
                    schema,
                    data,
                    JSON.parse(JSON.stringify(me.state.treeData))
                );
                me.state.dataset.schema = schema;
                me.setState({
                    treeData: treeData,
                    dataset: me.state.dataset
                });
            }else {

            }
        }
    }

    onSave() {
        const me = this;
        const { dispatch, createDataset, saveDatasetId } = this.props;
        dispatch(createDataset(me.state.dataset, callback));
        function callback(success, data) {
            let response = {};
            if(success) {
                response.type = 'success';
                response.message = '创建成功';
                dispatch(saveDatasetId(data.object_id));
            }else {
                response.type = 'error';
                response.message = data;
            }
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
    }

    componentDidMount() {
        const me = this;
        const { dispatch, fetchDatabaseList } = me.props;
        if(this.state.dataset.dataset_type === 'INCEPTOR') {
            dispatch(fetchDatabaseList(callback));
            function callback(success, data) {
                if(success) {
                    me.setState({
                        databases: data
                    });
                }else {

                }
            }
        }
    }

    render () {
        const me = this;
        const { datasetType, operationType, HDFSConnected } = this.props;

        const Option = Select.Option;
        const dbOptions = me.state.databases.map(database => {
            return <Option key={database.id}>{database.database_name}</Option>
        });

        return (
            <div className="data-detail-centent shallow">
                <div className="data-detail-border">
                    {/* inceptor corresponding dom*/}
                    <div className={datasetType==='INCEPTOR'?'':'none'}>
                        <label className="data-detail-item">
                            <span>数据集名称：</span>
                            <input type="text" onChange={this.handleDatasetChange} />
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                            <textarea onChange={this.handleDescriptionChange}/>
                        </label>
                        <label className="data-detail-item">
                            <span>选择连接：</span>
                            <Select
                                style={{ width: 230 }}
                                onChange={this.onConnectChange}
                            >
                                {dbOptions}
                            </Select>
                            <div className="connect-success">
                                &nbsp;<button>新建连接</button>
                            </div>
                        </label>
                        <div className={operationType==='table'?'':'none'}>
                            <label className="data-detail-item">
                                <span>选择表：</span>
                                <TreeSelect
                                    showSearch
                                    value={this.state.dataset.table_name}
                                    style={{ width: 782 }}
                                    placeholder="Please select"
                                    treeData={this.state.treeData}
                                    loadData={this.onLoadData}
                                    onSelect={this.onSelect}
                                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                >
                                </TreeSelect>
                                <Tooltip title="选择表">
                                    <i className="icon icon-info"/>
                                </Tooltip>
                            </label>
                        </div>

                        <div>
                            <label className="data-detail-item">
                                <span>SQL：</span>
                                <textarea name="" id="" cols="30" rows="10" onChange={this.handleSQLChange}/>
                                <a href={ window.location.origin + '/pilot/sqllab' } target="_blank">
                                    切换至SQL LAB编辑
                                </a>
                            </label>
                        </div>
                        <label className="sub-btn">
                            <input type="button" defaultValue="保存" onClick={this.onSave}/>
                        </label>
                        <div id="showAlert" className="alert-tip"></div>
                    </div>

                    {/* HDFS corresponding dom*/}
                    <div className={datasetType==='HDFS'?'':'none'} >
                        <div className={HDFSConnected===true?'':'none'}>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="file-show">
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold-active">
                                        <i className="icon"/>
                                        <span>AD</span>
                                        <div className="file-fold">
                                            <i className="icon"/>
                                            <span>DEV</span>
                                        </div>
                                        <div className="file-fold">
                                            <i className="icon"/>
                                            <span className="active">DEV</span>
                                        </div>
                                        <div className="file-fold">
                                            <i className="icon"/>
                                            <span>DEV</span>
                                        </div>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span>DEV</span>
                                    </div>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="connect-success">
                                    <span>连接成功</span>&nbsp;&nbsp;
                                    <button>配置&gt;</button>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10"/>
                            </label>
                        </div>
                        <div className={HDFSConnected===true?'none':''}>
                            <label className="data-detail-item">
                                <span></span>
                                <div className="data-connect-status">
                                    <span>尚未建立HDFS连接</span>
                                    <button>建立HDFS连接</button>
                                </div>
                            </label>
                            <label className="data-detail-item">
                                <span>描述：</span>
                                <textarea name="" id="" cols="30" rows="10"/>
                            </label>
                        </div>
                    </div>

                    {/* upload file corresponding dom*/}
                    <div className={datasetType==='UPLOAD'?'':'none'} >
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-show">
                                <div className="file-fold">
                                    <i className="icon"/>
                                    <span>DEV</span>
                                </div>
                                <div className="file-fold-active">
                                    <i className="icon"/>
                                    <span>AD</span>
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span>DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span className="active">DEV</span>
                                    </div>
                                    <div className="file-fold">
                                        <i className="icon"/>
                                        <span>DEV</span>
                                    </div>
                                </div>
                                <div className="file-fold">
                                    <i className="icon"/>
                                    <span>DEV</span>
                                </div>
                                <div className="file-fold">
                                    <i className="icon"/>
                                    <span>DEV</span>
                                </div>
                                <div className="file-fold">
                                    <i className="icon"/>
                                    <span>DEV</span>
                                </div>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>路径：</span>
                            <input type="text" defaultValue="" />
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <button className="uploading-btn">上传文件</button>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-uploading">
                                <i className="icon"/>
                                <span>package.json</span>
                                <div className="progress"></div>
                            </div>

                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="file-uploaded">
                                <i className="icon"/>
                                <span>package.json</span>
                                <div className="finish"></div>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span></span>
                            <div className="connect-success">
                                <span>连接成功</span>&nbsp;&nbsp;
                                <button>配置></button>
                            </div>
                        </label>
                        <label className="data-detail-item">
                            <span>描述：</span>
                            <textarea name="" id="" cols="30" rows="10"/>
                        </label>
                    </div>
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
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        saveDatasetId,
    } = bindActionCreators(actionCreators, dispatch);

    return {
        fetchDatabaseList,
        fetchTableList,
        fetchSchemaList,
        createDataset,
        saveDatasetId,
        dispatch
    };
}
export default connect (mapStateToProps, mapDispatchToProps ) (SubDetail);
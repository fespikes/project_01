import React from 'react';
import ReactDOM from 'react-dom';
import {Select, TreeSelect, message} from 'antd';
import PropTypes from 'prop-types';
import {appendTreeData, constructTreeData} from '../../../utils/common2';
import {
    renderLoadingModal,
    renderAlertTip,
    getAjaxErrorMsg,
    renderGlobalErrorMsg,
    fetchDatabaseList,
    PILOT_PREFIX
} from '../../../utils/utils';

class DisplayOriginalTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            databaseNames: [],
            treeData: [],
            currentDbId: '',
            currentSchema: '',
            databaseId: props.databaseId,
            tableName: props.tableName,
            value: ''
        };
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
        this.onConnectionChange = this.onConnectionChange.bind(this);
    };

    onSelect(value, node) {
        let {sliceId, vizType} = this.props;
        const vizTypeEl = document.getElementById('viz-type-id');
        if(vizType === '' || vizType === 'None') {
            vizType = vizTypeEl.value;
        }
        if(node.props.isLeaf) {
            this.setState({
                tableName: value
            });
            localStorage.setItem('explore:firstEntry', 'false');
            window.location = window.location.origin + PILOT_PREFIX + 'explore/table/0/?database_id=' + this.state.currentDbId +
                '&full_tb_name=' + this.state.currentSchema + '.' + value + '&slice_id=' + sliceId + '&viz_type=' + vizType;
        }
    }

    onLoadData(node) {
        const self = this;
        const schema = node.props.value;
        const url = window.location.origin + '/table/tables/' + this.state.currentDbId + '/' + schema;
        const loadingModal = renderLoadingModal();
        loadingModal.show();
        return $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                let treeData = appendTreeData(
                    schema,
                    response.data,
                    JSON.parse(JSON.stringify(self.state.treeData))
                );
                self.setState({
                    treeData: treeData,
                    currentSchema: schema
                });
            },
            error: error => {
                const errorMsg = getAjaxErrorMsg(error);
                renderGlobalErrorMsg(errorMsg);
            },
            complete: () => {
                loadingModal.hide();
            }
        });
    }

    onConnectionChange(databaseId, isFirst) {
        const self = this;
        self.setState({
            currentDbId: databaseId,
        });
        if(!isFirst) {
            self.setState({
                tableName: '',
            });
        }
        this.getSchemas(databaseId);
        this.getDatabaseName(databaseId);
    }

    getSchemas(databaseId) {
        const self = this;
        let url = window.location.origin + '/table/schemas/' + databaseId;
        $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                let treeData = constructTreeData(response.data, false, 'folder');
                self.setState({
                    treeData: treeData
                });
            },
            error: error => {
                const errorMsg = getAjaxErrorMsg(error);
                renderGlobalErrorMsg(errorMsg);
            }
        });
    }

    getDatabaseName(databaseId) {
        const self = this;
        let url_databaseName = window.location.origin + '/database/show/' + databaseId;
        $.ajax({
            url: url_databaseName,
            type: 'GET',
            success: response => {
                response = response.data;
                self.setState({
                    databaseName: response.database_name
                });
            },
            error: error => {
                const errorMsg = getAjaxErrorMsg(error);
                renderGlobalErrorMsg(errorMsg);
            }
        });
    }

    getDatabaseList() {
        const self = this;
        fetchDatabaseList(callback);
        function callback(success, response) {
            if(success) {
                self.setState({
                    databaseNames: response.data
                });
            }else {
                renderGlobalErrorMsg(response);
            }
        }
    }

    componentDidMount() {
        const {databaseId} = this.props;
        this.getDatabaseList();
        if(databaseId && databaseId !== "") {
            this.getDatabaseName(databaseId);
            this.onConnectionChange(databaseId, true);
        }
    }

    render() {
        const self = this;
        const Option = Select.Option;
        const conOptions = self.state.databaseNames.map(
            database => {
                return <Option key={database.id}>{database.database_name}</Option>
            }
        );
        return (
            <div className="originalTable">
                <Select
                    allowClear
                    value={this.state.databaseName}
                    style={{ width: '100%' }}
                    placeholder="Please select"
                    onChange={this.onConnectionChange}
                >
                    {conOptions}
                </Select>
                <div className="slice-detail" id="slice-detail-tree-select">
                    <TreeSelect
                        showSearch
                        value={this.state.tableName}
                        style={{ width: '100%' }}
                        placeholder="Please select"
                        treeData={this.state.treeData}
                        loadData={this.onLoadData}
                        onSelect={this.onSelect}
                        getPopupContainer={() => document.getElementById('slice-detail-tree-select')}
                        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                    >
                    </TreeSelect>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

DisplayOriginalTable.propTypes = propTypes;
DisplayOriginalTable.defaultProps = defaultProps;

export default DisplayOriginalTable;
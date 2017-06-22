import React from 'react';
import ReactDOM from 'react-dom';
import { Select, TreeSelect } from 'antd';
import PropTypes from 'prop-types';

function constructTreeData(entities, isLeaf, category) {
    let nodeData = [];
    entities.map(entity => {
        var node = {};
        node.label = entity;
        node.value = entity;
        node.key = entity;
        node.isLeaf = isLeaf;
        node.category = category;
        nodeData.push(node);
    });
    return nodeData;
}

function appendTreeData(schemaAppended, tables, treeData) {
    treeData.map(schema => {
        if(schema.value === schemaAppended) {
            schema.children = constructTreeData(tables, true, 'file');
        }
    });
    return treeData;
}

class DisplayOriginalTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            databaseNames: [],
            treeData: [],
            currentDbId: '',
            currentSchema: '',
            value: ''
        };
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
        this.onConnectionChange = this.onConnectionChange.bind(this);
    };

    onSelect(value, node, extra) {
        const {sliceId, vizType} = this.props;
        if(node.props.category === 'file') {
            this.setState({
                value: value
            });
            window.location = window.location.origin + '/pilot/explore/table/0?database_id=' + this.state.currentDbId +
                '&full_tb_name=' + this.state.currentSchema + '.' + value + '&slice_id=' + sliceId + '&viz_type=' + vizType;
        }else if(node.props.category === 'folder') {
            return;
        }
    }

    onLoadData(node) {
        const self = this;
        const schema = node.props.value;
        const url = window.location.origin + '/table/tables/' + this.state.currentDbId + '/' + schema;
        return $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                response = JSON.parse(response);
                let treeData = appendTreeData(schema, response, JSON.parse(JSON.stringify(self.state.treeData)));
                self.setState({
                    treeData: treeData,
                    currentSchema: schema
                });
            },
            error: error => {

            }
        });
    }

    onConnectionChange(databaseId) {

        const self = this;
        self.setState({
            currentDbId: databaseId
        });
        let url = window.location.origin + '/table/schemas/' + databaseId;
        console.log("url=", url);
        $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                response = JSON.parse(response);
                let treeData = constructTreeData(response, false, 'folder');
                self.setState({
                    treeData: treeData
                });
            },
            error: error => {

            }
        });
    }

    componentDidMount() {

        const self = this;
        let url = window.location.origin + '/table/databases';
        $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                response = JSON.parse(response);
                self.setState({
                    databaseNames: response
                });
            },
            error: error => {

            }
        });
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
                    style={{ width: '100%' }}
                    placeholder="Please select"
                    onChange={this.onConnectionChange}
                >
                    {conOptions}
                </Select>
                <TreeSelect
                    showSearch
                    value={this.state.value}
                    style={{ width: '100%' }}
                    placeholder="Please select"
                    treeData={this.state.treeData}
                    loadData={this.onLoadData}
                    onSelect={this.onSelect}
                    dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                >
                </TreeSelect>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

DisplayOriginalTable.propTypes = propTypes;
DisplayOriginalTable.defaultProps = defaultProps;

export default DisplayOriginalTable;
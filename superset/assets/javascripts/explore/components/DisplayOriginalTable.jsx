import React from 'react';
import ReactDOM from 'react-dom';
import { Select, TreeSelect } from 'antd';
import PropTypes from 'prop-types';

function constructTreeData(entities) {
    let nodeData = [];
    entities.map(entity => {
        var node = {};
        node.label = entity;
        node.value = entity;
        node.key = entity;
        nodeData.push(node);
    });
    return nodeData;
}

function appendTreeData(schemaAppended, tables, treeData) {
    treeData.map(schema => {
        if(schema.value === schemaAppended) {
            schema.children = constructTreeData(tables);
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
            currentDbId: ''
        };
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
        this.onSearch = this.onSearch.bind(this);
        this.onConnectionChange = this.onConnectionChange.bind(this);
    };

    onChange(value, label, extra) {

    }

    onSelect(value, node, extra) {

    }

    onSearch(value) {
        console.log("onSearch=", value);
    }

    onLoadData(node) {
        const self = this;
        const schema = node.props.value;
        const url = window.location.origin + '/table/tables/' + this.state.currentDbId + '/' + schema;
        return $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                setTimeout(() => {
                    response = JSON.parse(response);
                    console.log(response);
                    let treeData = appendTreeData(schema, response, self.state.treeData);
                    self.setState({
                        treeData: treeData
                    });
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
                console.log(response);
                let treeData = constructTreeData(response);
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
        console.log("self.state.treeData=", self.state.treeData);
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
                    labelInValue
                    style={{ width: '100%' }}
                    placeholder="Please select"
                    treeData={this.state.treeData}
                    loadData={this.onLoadData}
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
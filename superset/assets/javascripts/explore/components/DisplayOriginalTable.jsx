import React from 'react';
import ReactDOM from 'react-dom';
import { Select, TreeSelect } from 'antd';
import PropTypes from 'prop-types';
import { appendTreeData, constructTreeData } from '../../../utils/common2';
import { renderLoadingModal, renderAlertTip} from '../../../utils/utils';

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
        let {sliceId, vizType} = this.props;
        const vizTypeEl = document.getElementById('viz-type-id');
        if(vizType === '' || vizType === 'None') {
            vizType = vizTypeEl.value;
        }
        if(node.props.isLeaf) {
            this.setState({
                value: value
            });
            window.location = window.location.origin + '/pilot/explore/table/0?database_id=' + this.state.currentDbId +
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
                response = JSON.parse(response);
                let treeData = appendTreeData(
                    schema,
                    response,
                    JSON.parse(JSON.stringify(self.state.treeData))
                );
                self.setState({
                    treeData: treeData,
                    currentSchema: schema
                });
            },
            error: error => {
                console.log(error);
            },
            complete: () => {
                loadingModal.hide();
            }
        });
    }

    onConnectionChange(databaseId) {

        const self = this;
        self.setState({
            currentDbId: databaseId
        });
        let url = window.location.origin + '/table/schemas/' + databaseId;
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
                <div className="slice-detail" id="slice-detail-tree-select">
                    <TreeSelect
                        showSearch
                        value={this.state.value}
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
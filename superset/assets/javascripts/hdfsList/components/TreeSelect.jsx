import React, { Component } from 'react';
import { TreeSelect } from 'antd';
import PropTypes from 'prop-types';
const TreeNode = TreeSelect.TreeNode;

import '../style/treeSelect.scss';

// import { render, unmountComponentAtNode } from 'react-dom';
// import { Tooltip, Alert } from 'antd';

class TreeSelector extends Component {

    constructor(props, context) {
        super(props);
        this.dispatch = context.dispatch;
        this.onSelect = this.onSelect.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
    }

    onSelect(value, node)  {
        const { setPopupNormalParam } = this.props;
        const dispatch = this.dispatch;
        dispatch(setPopupNormalParam({
            dest_path: node.props.hdfs_path
        }));
        this.setState({
            ...this.state,
            value: value
        });
    }

    onLoadData(node) {
        const { fetchHDFSList } = this.props;
        const hdfsPath = node.props.hdfs_path;
        return fetchHDFSList(hdfsPath, false);
    }

    render() {

        const {treeData} = this.props;
        return (
            <TreeSelect
                allowClear
                showSearch
                style={{
                    width: 420
                }}
                dropdownStyle={{
                    maxHeight: 300,
                    overflow: 'auto'
                }}
                treeData={treeData}
                onSelect={this.onSelect}
                loadData={this.onLoadData}
                placeholder="please select dest-path"
                getPopupContainer={() => document.getElementById('hdfs-tree-select')}
            />
        );
    }
}

TreeSelector.contextTypes = {
    dispatch: PropTypes.func.isRequired
};

export default TreeSelector;
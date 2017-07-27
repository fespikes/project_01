import React, { Component } from 'react';
import { TreeSelect } from 'antd';
import PropTypes from 'prop-types';

const TreeNode = TreeSelect.TreeNode;

import '../style/treeSelect.scss';

// import { render, unmountComponentAtNode } from 'react-dom';
// import { Tooltip, Alert } from 'antd';

// import PropTypes from 'prop-types';
const treeData = [{
    label: 'Node1',
    value: '0-0',
    key: '0-0',
    children: [{
        label: 'Child Node1',
        value: '0-0-1',
        key: '0-0-1',
    }, {
        label: 'Child Node2',
        value: '0-0-2',
        key: '0-0-2',
    }],
}, {
    label: 'Node2',
    value: '0-1',
    key: '0-1',
}];

const dataMapping = ag => {
    if (!ag || !ag.length) return;
    ag.map((obj, index) => {

    })
}

class TreeSelector extends Component {

    constructor(props, context) {
        super(props);
        this.dispatch = context.dispatch;
    }

    state = {
        value: undefined,
    }

    componentDidMount() {

        console.log(this.props.condition);
        const path = this.props.condition.path;

        let arr = path.split('/');
        let a = [];
        let l;
        for (l = arr.length; l--;) {
            if (l === 0) {
                a.push('/')
            } else {
                a.push(arr.join('/'));
            }
            arr.pop();
        }
        //TODO: send the request;
        console.log(a);

        //related to arr here;
        const func = (arr) => {
            let condition = {};
            while (arr.length) {
                condition = {
                    path: arr[arr.length - 1]
                }
                this.dispatch(fetchLeafData(condition));
                arr.pop();
            }
        };
        func(arr);
    }

    onLoadData(node) {
        const me = this;
        const hdfsPath = node.props.hdfs_path;
        const {fetchHDFSFileBrowser} = me.props;
        return fetchHDFSFileBrowser(node.props.hdfs_path, callback);
        function callback(success, data) {
            if (success) {
                let treeData = appendTreeChildren(
                    hdfsPath,
                    data,
                    JSON.parse(JSON.stringify(me.state.dsHDFS.fileBrowserData))
                );
                let objHDFS = {
                    ...me.state.dsHDFS,
                    fileBrowserData: treeData
                };
                me.setState({
                    dsHDFS: objHDFS
                });
            }
        }
    }

    onChange = (value) => {
        console.log(arguments);
        this.setState({
            value
        });
    }

    render() {

        console.log(this.props.response);

        return (
            <TreeSelect
            style={{
                width: '100%'
            }}
            value={this.state.value}
            dropdownStyle={{
                maxHeight: 400,
                overflow: 'auto'
            }}
            treeData={treeData}
            treeDefaultExpandAll
            onChange={this.onChange}
            showSearch
            allowClear
            placeholder="please select dest-path"
            showCheckedStrategy={TreeSelect.SHOW_PARENT}
            treeDefaultExpandAll
            loadData={this.onLoadData}

            />
        );
    }
}

TreeSelector.contextTypes = {
    dispatch: PropTypes.func.isRequired
};

export default TreeSelector;
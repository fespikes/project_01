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
        this.treeDataReady = this.treeDataReady.bind(this);
        this.loadTreeData = this.loadTreeData.bind(this);
    }

    state = {
        value: 'please select path',
        treeData: []
    }

    componentDidMount() {
        this.loadTreeData();
    }

    componentWillReceiveProps() {}

    //when clock on tree parent node 
    loadData(node) {
        console.log(node);
    }

    loadTreeData() {
        const me = this;
        const {condition, popupNormalParam, //
            fetchLeafData, setPopupNormalParams} = this.props;
        const dispatch = this.dispatch;

        if (condition.selectedRows.length === 0) return;
        const selectedRow = condition.selectedRows[0];

        const path = selectedRow.path;
        setPopupNormalParams({
            ...popupNormalParam,
            path: path
        });

        let arr = path.split('/');
        // let a = [];
        let ar = [];
        let pathString;
        let deep = 1;

        for (let i = 1; i <= arr.length; i++) {
            ar.push(arr[i - 1]);
            pathString = ar.join('/');

            let param = {
                pathString: pathString || '/',
                deep: i,
                pathArray: ar
            }
            fetchLeafData(param, me.treeDataReady.bind(me));
        }
    }

    treeDataReady(treeData) {
        console.log(treeData);
    /*        this.setState({
                treeData: treeData
            })*/
    }

    onSelect = (value) => {
        let {popupNormalParam, checkIfSubmit} = this.props;
        let dest_path = value;

        this.props.setPopupNormalParams({
            ...popupNormalParam,
            dest_path: dest_path
        });
        this.setState({
            value
        });
    }

    render() {

        let {treeData} = this.props;
        console.log('into TreeSelect component:', treeData);

        return (
            <TreeSelect
            allowClear
            dropdownStyle={{
                maxHeight: 300,
                overflow: 'auto'
            }}
            getPopupContainer={() => document.getElementById('tree-select-box')}
            onSelect={this.onSelect}
            placeholder="please select dest-path"
            showSearch
            showCheckedStrategy={TreeSelect.SHOW_ALL}
            style={{
                width: 420
            }}
            treeData={treeData}
            treeDefaultExpandAll
            value={this.state.value}
            />
        );
    }
}

TreeSelector.contextTypes = {
    dispatch: PropTypes.func.isRequired
};

export default TreeSelector;
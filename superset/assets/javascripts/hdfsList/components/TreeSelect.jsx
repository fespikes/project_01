import React, { Component } from 'react';
import { TreeSelect } from 'antd';
import PropTypes from 'prop-types';

const TreeNode = TreeSelect.TreeNode;

// import '../style/treeSelect.scss';

// import { render, unmountComponentAtNode } from 'react-dom';
// import { Tooltip, Alert } from 'antd';

// import PropTypes from 'prop-types';
const treeData = [{
    label: 'Node1',
    value: '0-0',
    key: '0-0',

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

        //TODO: only arr.length >1, then can move or copy

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

    //related to arr here;
    /*        const func = (arr, spiit) => {
                let condition = {};
                let deep = 1;
                while (arr.length) {
                    condition = {
                        path: arr[arr.length - 1],
                        deep: deep
                    }
                    fetchLeafData(condition, me.treeDataReady.bind(me));
                    arr.pop();
                    deep++;
                }
            };
            func(a, arr);*/
    }

    treeDataReady(treeData) {
        console.log(treeData);
    /*        this.setState({
                treeData: treeData
            })*/
    }

    onSelect = (value) => {
        let popupNormalParam = this.props.popupNormalParam;
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
            loadData={this.loadData}
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
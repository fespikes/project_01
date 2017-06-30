import React from 'react';
import { render } from 'react-dom';
import { Link }  from 'react-router-dom';
import { Select } from 'antd';
import { switchDatasetType, fetchTypeList } from '../actions';
import PropTypes from 'prop-types';
import {
    selectType,
    search
} from '../actions';

import { TableDelete } from '../popup';

class SliceOperate extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            datasetTypes: []
        };

        this.onChange = this.onChange.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onSearch = this.onSearch.bind(this);
        this.selectChange = this.selectChange.bind(this);
        this.handleSelectChange = this.handleSelectChange.bind(this);
    }

    onChange () {
        const { dispatch } = this.props;
        if( this.refs.searchField.value ){
            this.refs.searchIcon.removeAttribute('disabled');
        } else {
            this.refs.searchIcon.setAttribute('disabled', 'disabled');
        }
    }

    onDelete () {//TODO:
        const { dispatch, selectedRowNames } = this.props;
        let deleteType = 'multiple';
        let deleteTips = '确定删除' + selectedRowNames + '?';
        if(selectedRowNames.length === 0) {
            deleteType = 'none';
            deleteTips = '没有选择任何将要删除的记录，请选择！';
        }
        let deleteTablePopup = render(
            <TableDelete
                dispatch={dispatch}
                deleteType={deleteType}
                deleteTips={deleteTips} />,
            document.getElementById('popup_root'));
        if(deleteTablePopup) {
            deleteTablePopup.showDialog();
        }
    }

    selectChange(value) {
        const { dispatch } = this.props;
        dispatch(switchDatasetType(value));
    }

    handleSelectChange (argus) {
        this.props.dispatch(selectType(argus));
    }

    onSearch () {
        const filter = this.refs.searchField.value;
        this.props.dispatch(search(filter));
        //TODO: not sure that componentWillReceiveProps be triggered
    }

    componentDidMount() {
        const self = this;
        const { dispatch } = self.props;
        dispatch(fetchTypeList(callback));
        function callback(success, data) {
            if(success) {
                self.setState({
                    datasetTypes: data
                });
            }else {

            }
        }
    }

    render() {

        const Option = Select.Option;
        const addOptions = this.state.datasetTypes.map(dataset => {
            return <Option key={dataset} value={dataset}>
                <Link to={`/add/${dataset}`}>{dataset}</Link>
            </Option>
        });
        let datasetTypes = JSON.parse(JSON.stringify(this.state.datasetTypes));
        datasetTypes.splice(0, 0, 'all');
        const filterOptions = datasetTypes.map(dataset => {
            return <Option key={dataset} value={dataset}>{dataset}</Option>
        });
        return (
            <div className="operations">
                <ul className="icon-list">
                    <li style={{ width: '130px', textAlign: 'left' }}>
                        <i className="icon icon-plus"/>
                        <Select
                            style={{ width: '100px' }}
                            placeholder="新建连接"
                            showText="新建连接"
                            onChange={this.selectChange}
                        >
                            {addOptions}
                        </Select>
                    </li>
                    <li onClick={this.onDelete}>
                        <i className="icon icon-trash" />
                    </li>
                </ul>
                <div className="tab-btn">
                    <Select
                        ref="tableType"
                        defaultValue={datasetTypes[0]}
                        style={{ width: 120 }}
                        onChange={this.handleSelectChange}
                    >
                        {filterOptions}
                    </Select>
                </div>
                <div className="search-input">
                    <input onChange={this.onChange} ref="searchField" placeholder="search..." />
                    <i className="icon icon-search" onClick={this.onSearch} ref="searchIcon" />

                </div>
            </div>
        );
    }
}

SliceOperate.propTypes = {};

export default SliceOperate;
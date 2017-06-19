import React from 'react';
import { render } from 'react-dom';
import { Select } from 'antd';

import PropTypes from 'prop-types';
import {
    selectType,
    search
} from '../actions';
import { SliceDelete } from '../../components/popup';
//TODO:

class SliceOperate extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.onChange = this.onChange.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onSearch = this.onSearch.bind(this);
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
        let deleteSlicePopup = render(
            <SliceDelete
                dispatch={dispatch}
                deleteType={deleteType}
                deleteTips={deleteTips} />,
            document.getElementById('popup_root'));
        if(deleteSlicePopup) {
            deleteSlicePopup.showDialog();
        }
    }

    handleSelectChange (argus) {
        this.props.dispatch(selectType(argus));
    }

    onSearch () {
        const filter = this.refs.searchField.value;
        this.props.dispatch(search(filter));
        //TODO: not sure that componentWillReceiveProps be triggered
    }

    render() {

        const { tableType } = this.props;
        return (
            <div className="operations">
                <ul className="icon-list">
                    <li><a href="/slice/add"><i className="icon icon-plus"></i></a></li>
                    <li onClick={this.onDelete}><i className="icon icon-trash"></i></li>
                </ul>
                <div className="tab-btn">
                    {/*<button className={typeName === SHOW_ALL ? 'active' : ''} onClick={()=>this.onFilter(SHOW_ALL)}>全部</button>
                    <button className={typeName === SHOW_FAVORITE ? 'active' : ''} onClick={()=>this.onFilter(SHOW_FAVORITE)}>
                        <i className="icon"></i>收藏</button>*/}
                    <Select ref="tableType" defaultValue={tableType} style={{ width: 120 }} onChange={this.handleSelectChange}>
                        <Option value="all">all types</Option>
                        <Option value="database">database</Option>
                        <Option value="hdfs">hdfs</Option>
                        <Option value="upload">upload</Option>
                    </Select>
                </div>
                <div className="search-input">
                    <input onChange={this.onChange} ref="searchField" placeholder="search..." />
                    <i className="icon icon-search" onClick={this.onSearch} ref="searchIcon"></i>

                </div>
            </div>
        );
    }
}

SliceOperate.propTypes = {};

export default SliceOperate;
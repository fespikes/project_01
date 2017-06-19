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

    upload () {
        alert('upload');
    }

    onDelete () {
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
                    <li
                        className="bolder-right li-setting"
                    >
                        &nbsp;&nbsp;<i className="icon icon-setting ps"></i>操作&nbsp;&nbsp;
                    </li>
                    <li
                        className="bolder-right li-upload"
                        onClick={this.upload}
                    >
                        &nbsp;&nbsp;<i className="icon icon-upload ps"></i>上传&nbsp;&nbsp;
                    </li>
                    <li
                        className="li-plus bolder-right"
                    >
                        &nbsp;&nbsp;<i className="icon icon-plus ps"></i>新建&nbsp;&nbsp;
                    </li>
                    <li
                        className="li-trash"
                        onClick={this.onDelete}
                    >
                        &nbsp;&nbsp;<i className="icon icon-trash ps"></i>删除&nbsp;&nbsp;
                    </li>
                </ul>
                <div className="icon-list">
                    <li
                        className="li-icons bolder-right"
                    >
                        &nbsp;&nbsp;<i className="icon icon-flow-refresh "></i>&nbsp;&nbsp;
                    </li>
                    <li>
                        &nbsp;&nbsp;<i className="icon icon-clock ps"></i>
                    </li>
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
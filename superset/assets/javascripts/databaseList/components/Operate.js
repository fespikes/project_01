import React from 'react';
import { render } from 'react-dom';
import { Select } from 'antd';
import { Link }  from 'react-router-dom';

import PropTypes from 'prop-types';
import {
    selectType,
    search,

    setPopupParam,
    applyDelete,
    showPopup
} from '../actions';

class Operate extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {};

        this.onChange = this.onChange.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onAdd = this.onAdd.bind(this);
        this.onSearch = this.onSearch.bind(this);
        this.timer = null;
        this.dispatch = context.dispatch;
    }

    onChange () {
        const dispatch = this.dispatch;
        if( this.refs.searchField.value ){
            this.refs.searchIcon.removeAttribute('disabled');
        } else {
            this.refs.searchIcon.setAttribute('disabled', 'disabled');
            this.timer && clearTimeout(this.timer);
            this.timer = setTimeout(function(){
                dispatch(search(''));
            }, 300);
        }
    }

    onAdd () {
        const dispatch = this.dispatch;
        dispatch(fetchAvailableSlices(callback));
        function callback(success, data) {
            if(success) {
                var dashboard = {dashboard_title: '', description: ''};
                var addSlicePopup = render(
                    <DashboardAdd
                        dispatch={dispatch}
                        dashboard={dashboard}
                        availableSlices={data.data.available_slices}
                        enableConfirm={false}/>,
                    document.getElementById('popup_root'));
                if(addSlicePopup) {
                    addSlicePopup.showDialog();
                }
            }
        }
    }

    //multi delete
    onDelete () {
        const { selectedRowNames } = this.props;
        const me = this;
        let deleteType = 'multiple';
        let deleteTips = '确定删除' + selectedRowNames + '?';
        if(selectedRowNames.length === 0) {
            deleteType = 'none';
            deleteTips = '没有选择任何将要删除的记录，请选择！';
        }

        me.dispatch(setPopupParam({
            title: '删除数据库连接',
            deleteTips: deleteTips,
            confirm: function(callback) {
                if (selectedRowNames.length===0) {
                    return;
                }
                me.dispatch(applyDelete(callback));
            },
            closeDialog: function(argus) {
                alert('on confirm')
            },
            showDialog:function(argus) {
                alert('on confirm');
            },

            popupContainer: 'popup',

            deleteType: deleteType
        }));
        me.dispatch(showPopup());
//        deletePopup.showDialog();

    }

    onSearch () {
        const filter = this.refs.searchField.value;
        const me = this;
        me.dispatch(search(filter));
        //TODO: not sure that componentWillReceiveProps be triggered
    }

    render() {

        return (
            <div className="operations">
                <ul className="icon-list">
                    {/*<li onClick={this.onAdd}>*/}
                    <li>
                        <Link to="/add"><i className="icon"></i>新建连接</Link></li>
                    <li onClick={this.onDelete}><i className="icon"></i></li>
                </ul>
                <div className="search-input">
                    <input onChange={this.onChange} ref="searchField" placeholder="search..." />
                    <i className="icon" onClick={this.onSearch} ref="searchIcon"></i>

                </div>
            </div>
        );
    }
}

Operate.propTypes = {};
Operate.contextTypes = {
    dispatch: PropTypes.func.isRequired
};
export default Operate;
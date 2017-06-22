import React from 'react';
import { render } from 'react-dom';
import { Select } from 'antd';
import { Link }  from 'react-router-dom';
import { ConnectionDelete } from '../../components/popup';

import PropTypes from 'prop-types';
import {
    selectType,
    search,

    applyAdd,
    testConnection,

    setPopupParam,
    applyDelete,
    popupActions
} from '../actions';

class Operate extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {};

        this.onChange = this.onChange.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onAdd = this.onAdd.bind(this);
        this.onSearch = this.onSearch.bind(this);

        this.dispatch = context.dispatch;
        this.timer = null;
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
/*        dispatch(fetchAvailableSlices(callback));
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
        }*/

        let popupParam = {
            popupTitle: '新建连接',
            submit: (callback) => {
                dispatch(applyAdd(callback));
            },
            testConnection: (argus) => {
                console.log(argus);
                dispatch(testConnection(argus));
            }
        };

        dispatch(popupActions.showPopup(popupParam));
    }

    //multi delete
    onDelete () {
        const { dispatch, selectedRowNames } = this.props;
        let deleteType = 'multiple';
        let deleteTips = '确定删除' + selectedRowNames + '?';
        if(selectedRowNames.length === 0) {
            deleteType = 'none';
            deleteTips = '没有选择任何将要删除的记录，请选择！';
        }
        let deleteConnectionPopup = render(
            <ConnectionDelete
                dispatch={dispatch}
                deleteType={deleteType}
                deleteTips={deleteTips} />,
            document.getElementById('popup_root'));
        if(deleteConnectionPopup) {
            deleteConnectionPopup.showDialog();
        }
    }

    onSearch () {
        const filter = this.refs.searchField.value;
        const me = this;
        me.dispatch(search(filter));
        //TODO: not sure that componentWillReceiveProps be triggered
    }

    render () {

        return (
            <div className="operations">
                <ul className="icon-list">
                    {/*<li onClick={this.onAdd}>*/}
                    <li onClick={argus => this.onAdd(argus)}>
                        <i className="icon icon-plus"></i>
                    </li>
                    <li onClick={this.onDelete}><i className="icon icon-trash"></i></li>
                </ul>
                <div className="search-input">
                    <input onChange={this.onChange} ref="searchField" placeholder="search..." />
                    <i className="icon icon-search" onClick={this.onSearch} ref="searchIcon"></i>

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
import React from 'react';
import { render } from 'react-dom';

import { Link }  from 'react-router-dom';
import { ConnectionDelete } from '../popup';

import PropTypes from 'prop-types';
import {
    selectType,
    search,

    applyAdd,
    testConnection,
    fetchTypes,

    setPopupParam,
    applyDelete,
    popupActions
} from '../actions';

import { Select, ComponentSelect }  from './';
import { transformObjectToArray } from '../utils';

class Operate extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {
            DBTypes: []
        };

        this.onChange = this.onChange.bind(this);
        this.onEnterSearch = this.onEnterSearch.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onAdd = this.onAdd.bind(this);
        this.onSearch = this.onSearch.bind(this);

        this.dispatch = context.dispatch;
        this.timer = null;
    }

    componentDidMount () {
        this.fetchTypes();
    }

    fetchTypes () {
        const me = this;
        const callback = data =>
            me.setState({
                DBTypes: data
            });

        me.dispatch(fetchTypes(callback));
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

    onAdd (type) {
        const dispatch = this.dispatch;
        let popupParam = {
            popupTitle: `新建 ${type} 连接`,
            datasetType: type,

            submit: (callback) => {
                dispatch(applyAdd(callback));
            },
            testConnection: (argus) => {
                const callback = (argus) => {
                    console.log('inside callback:', argus );
                }
                dispatch(testConnection(callback));
            }
        };
        dispatch(popupActions.showPopup(popupParam));
    }

    //multi delete
    onDelete () {
        const { selectedRowNames } = this.props;
        let deleteType;
        let deleteTips = '确定删除: ' + selectedRowNames + '?';
        if(selectedRowNames.length === 0) {
            deleteType = 'none';
            deleteTips = '没有选择任何将要删除的记录，请选择！';
        }
        let deleteConnectionPopup = render(
            <ConnectionDelete
                dispatch={this.dispatch}
                deleteTips={deleteTips}
                deleteType={deleteType}
            />,
            document.getElementById('popup_root'));
    }

    onSearch () {
        const filter = this.refs.searchField.value;
        this.dispatch(search(filter));
    }

    onEnterSearch(event) {
        if(event.keyCode === 13) {
            this.onSearch();
        }
    }

    render () {
        const DBTypes = this.state.DBTypes;
        const typeArray = transformObjectToArray(DBTypes, 'label');
        return (
            <div className="operations">
                <ul className="icon-list">
                    <li
                        style={{width:'130px', textAlign:'left'}}
                    >
                        <ComponentSelect
                            opeType='addDataset'
                            options={typeArray}
                            selectChange={(argus)=>this.onAdd(argus)}
                        >
                        </ComponentSelect>
                    </li>
                    <li onClick={this.onDelete}>
                        <i className="icon icon-trash"/>
                    </li>
                </ul>
                <div className="search-input">
                    <input  onKeyUp={this.onEnterSearch} onChange={this.onChange} ref="searchField" placeholder="search..." />
                    <i className="icon icon-search" onClick={this.onSearch} ref="searchIcon"/>

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
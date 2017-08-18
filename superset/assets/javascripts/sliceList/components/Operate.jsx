import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { fetchLists, switchFavorite, setKeyword, navigateTo,  } from '../actions';
import { SliceDelete } from '../popup';

const SHOW_ALL = "showAll";
const SHOW_FAVORITE = "showFavorite";

class SliceOperate extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.onChange = this.onChange.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onEnterSearch = this.onEnterSearch.bind(this);
        this.onSearch = this.onSearch.bind(this);
        this.onFilter = this.onFilter.bind(this);
    }

    onChange() {
        const { dispatch } = this.props;
        dispatch(setKeyword(this.refs.searchField.value));
        if( this.refs.searchField.value ){
            this.refs.searchIcon.removeAttribute('disabled');
        } else {
            this.refs.searchIcon.setAttribute('disabled', 'disabled');
        }
        if(this.refs.searchField.value === "") {
            this.onSearch();
        }
    }

    onDelete() {
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

    onEnterSearch(event) {
        if(event.keyCode === 13) {
            this.onSearch();
        }
    }

    onSearch() {
        const { dispatch } = this.props;
        dispatch(fetchLists());
        dispatch(navigateTo(1));
    }

    onFilter(type) {
        const { dispatch } = this.props;
        dispatch(switchFavorite(type));
        dispatch(fetchLists());
    }

    render() {

        const { typeName } = this.props;
        return (
            <div className="operations">
                <ul className="icon-list">
                    <li><a href="/slice/add"><i className="icon icon-plus"/></a></li>
                    <li onClick={this.onDelete}><i className="icon icon-trash"/></li>
                </ul>
                <div className="tab-btn">
                    <button className={typeName === SHOW_ALL ? 'active' : ''} onClick={()=>this.onFilter(SHOW_ALL)}>全部</button>
                    <button className={typeName === SHOW_FAVORITE ? 'active' : ''} onClick={()=>this.onFilter(SHOW_FAVORITE)}>
                        <i className={typeName === SHOW_FAVORITE ? 'icon icon-star-active' : 'icon icon-star'}/>收藏
                    </button>
                </div>
                <div className="search-input">
                    <input onKeyUp={this.onEnterSearch} onChange={this.onChange} className="tp-input" ref="searchField" placeholder="search..." />
                    <i className="icon icon-search" onClick={this.onSearch} ref="searchIcon"/>
                </div>
            </div>
        );
    }
}

SliceOperate.propTypes = {};

export default SliceOperate;
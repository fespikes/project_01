import React from 'react';
import { render } from 'react-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';
import * as actions from '../actions';
import { CONSTANT } from '../actions';

import { Select, PopupNormal, PopupDelete } from './';
import { getPermData, updatePermMode } from '../module';

class Operate extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {};
        this.dispatch = context.dispatch;

        this.onChange = this.onChange.bind(this);
        this.onRemove = this.onRemove.bind(this);
        this.onSearch = this.onSearch.bind(this);
        this.upload = this.upload.bind(this);
        this.handleSelectChange = this.handleSelectChange.bind(this);
    }

    manipulate(ag) {
        /*            the ag only determine the type,
                TODO: get the data from the table row;
                TODO: set params before dispatch;

                TODO: dispatch fetchOperation.
                if (ag.key===CONSTANT.move) {
                    setPopupNormalParams({path:mkdirPath, dirName, connectionID, popupType});
                } else if (ag.key===CONSTANT.move) {
                    setPopupNormalParams({path:uploadPath, hdfsFile, connectionID, popupType});
                }*/
        const popupType = ag.key;
        const {fetchOperation, popupNormalParam, setPopupNormalParams, setPermData, setPermMode, setHDFSPath, condition} = this.props;
        const normalPopupParam = {
            ...popupNormalParam,
            popupType: popupType,
            submit: fetchOperation,
            status: 'flex'
        };
        setPopupNormalParams(normalPopupParam);
        if(popupType === "auth") {
            const permData = getPermData(condition.selectedRows);
            const permMode = updatePermMode(permData);
            setPermData(permData);
            setPermMode(permMode);
            setHDFSPath(condition.selectedRows[0].path);
        }
    }

    onChange() {
        if (this.refs.searchField.value) {
            this.refs.searchIcon.removeAttribute('disabled');
        } else {
            this.refs.searchIcon.setAttribute('disabled', 'disabled');
        }
    }

    upload() {
        const {fetchOperation, popupNormalParam, setPopupNormalParams, condition} = this.props;
        let normalPopupParam = {};
        if (condition.selectedRows.length === 0) {
            normalPopupParam = {
                ...popupNormalParam,
                popupType: CONSTANT.noSelect,
                submit: fetchOperation,
                status: 'flex'
            };
        } else {
            normalPopupParam = {
                ...popupNormalParam,
                popupType: CONSTANT.upload,
                submit: fetchOperation,
                status: 'flex',
                dest_path: condition.selectedRows[0].path
            };
        }
        setPopupNormalParams(normalPopupParam);
    }

    onRemove() {
        const {dispatch, selectedRowNames} = this.props;
        let deleteType = 'multiple';
        let deleteTips = '确定删除' + selectedRowNames + '?';
        if (selectedRowNames.length === 0) {
            deleteType = 'none';
            deleteTips = '没有选择任何将要删除的记录，请选择！';
        }
        let deleteSlicePopup = render(
            <PopupDelete
            dispatch={dispatch}
            deleteType={deleteType}
            deleteTips={deleteTips} />,
            document.getElementById('popup_root'));
        if (deleteSlicePopup) {
            deleteSlicePopup.showDialog();
        }

    }

    handleSelectChange(argus) {
        this.dispatch(selectType(argus));
    }

    onSearch() {
        const filter = this.refs.searchField.value;
        this.props.search(filter);
    }

    render() {

        const {tableType, selectType, search, fetchOperation} = this.props;

        const manipulateOptions = [
                {
                    id: CONSTANT.move,
                    name: '移动'
                },
                {
                    id: CONSTANT.copy,
                    name: '复制'
                },
                {
                    id: CONSTANT.auth,
                    name: '更改权限'
                }
            ],
            createOptions = [
                {
                    id: CONSTANT.mkdir,
                    name: '目录'
                }
            ];

        return (
            <div className="operations">
                <div className="popupContainer">
                    <PopupNormal />
                </div>

                <ul className="icon-list">
                    <li
            className="bolder-right li-setting"
            >
                         <i className="icon icon-setting ps"></i>
                        <Select
            ref="manipulate"
            options={manipulateOptions}
            theValue={'操作'}
            width={65}
            handleSelect={(argus) => this.manipulate(argus)}
            />  
                    </li>
                    <li
            className="bolder-right li-upload"
            onClick={this.upload}
            >
                          <i className="icon icon-upload ps"></i>上传  
                    </li>
                    <li
            className="li-plus bolder-right"
            >
                          <i className="icon icon-plus ps"></i>
                        <Select
            ref="create"
            options={createOptions}
            theValue={'新建'}
            width={60}
            handleSelect={(argus) => this.manipulate(argus)}
            />  
                    </li>
                    <li
            className="li-trash"
            onClick={this.onRemove}
            >
                          <i className="icon icon-trash ps"></i>删除  
                    </li>
                </ul>
{ /*                <div className="icon-list">
                    <li
                        className="li-icons bolder-right"
                    >
                        &nbsp;&nbsp;<i className="icon icon-flow-refresh "></i>&nbsp;&nbsp;
                    </li>
                    <li>
                        &nbsp;&nbsp;<i className="icon icon-clock ps"></i>
                    </li>
                </div>*/ }
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

function mapStateToProps(state, pros) {
    const {condition, popupNormalParam} = state;

    return {
        condition,
        popupNormalParam
    };
}

const mapDispatchToProps = function(dispatch, props) {
    const {selectType, search, fetchOperation, setPopupNormalParams, popupNormalChangeStatus} = bindActionCreators(actions, dispatch);
    return {
        selectType,
        search,
        fetchOperation,

        setPopupNormalParams,
        popupNormalChangeStatus,
        dispatch
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Operate);
import React from 'react';
import { render } from 'react-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';
import * as actions from '../actions';
import { CONSTANT } from '../actions';

import { Select, PopupNormal } from './';
import { getPermData, updatePermMode } from '../module';

class Operate extends React.Component {
    constructor(props, context) {
        super(props);
        this.state = {};
        this.dispatch = context.dispatch;

        this.searchOnChange = this.searchOnChange.bind(this);
        this.onRemove = this.onRemove.bind(this);
        this.onSearch = this.onSearch.bind(this);
        this.upload = this.upload.bind(this);
        this.handleSelectChange = this.handleSelectChange.bind(this);
    }

    cleanNormalParamState(popupNormalParam) {
        let obj = {
            ...popupNormalParam
        };
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                obj[key] = '';
            }
        }
        obj['alertStatus'] = 'none';
        obj['treeData'] = [];
        obj['permData'] = [];
        obj['recursivePerm'] = false;
        obj['showAlert'] = false;
        obj['disabled'] = 'disabled';
        return obj;
    }

    manipulate(ag) {
        const popupType = ag.key;
        const {fetchOperation, popupNormalParam, setPopupNormalParams, setPermData, setPermMode, setHDFSPath, fetchHDFSList, condition, } = this.props;

        let obj = this.cleanNormalParamState(popupNormalParam);

        let normalPopupParam = {};
        if (condition.selectedRows.length === 0) {
            normalPopupParam = {
                ...obj,
                popupType: CONSTANT.noSelect,
                submit: fetchOperation,
                status: 'flex'
            };
            setPopupNormalParams(normalPopupParam);
        } else {
            normalPopupParam = {
                ...obj,
                popupType: popupType,
                submit: fetchOperation,
                status: 'flex'
            };
            setPopupNormalParams(normalPopupParam);
            if (popupType === CONSTANT.auth) {
                const permData = getPermData(condition.selectedRows);
                const permMode = updatePermMode(permData);
                setPermData(permData);
                setPermMode(permMode);
                setHDFSPath(condition.selectedRows[0].path);
            } else if (popupType === CONSTANT.copy || popupType === CONSTANT.move) {
                fetchHDFSList('/', true);
            }
        }
    }

    searchTimer=0;

    searchOnChange() {
        const me = this;
        const dispatch = me.dispatch;
        const {emitFetch, swapResponse, returnResponse} = me.props;
        const {response, heap} = emitFetch;
        let value = me.refs.searchField.value;
        let data = {
            ...heap
        };

        if (this.refs.searchField.value) {
            this.refs.searchIcon.removeAttribute('disabled');
            //TODO: get the data from heap
            data.files = data.files.filter((element, index, array) => {
                let bu = element.name.indexOf(value) >= 0;
                return bu;
            });
            dispatch(swapResponse({
                response: data
            }));
        } else {
            this.refs.searchIcon.setAttribute('disabled', 'disabled');
            dispatch(swapResponse({
                response: heap
            }));
        }

    }

    upload() {
        const {fetchOperation, popupNormalParam, setPopupNormalParams, condition} = this.props;
        let normalPopupParam = {};

        let obj = this.cleanNormalParamState(popupNormalParam);
        if (condition.selectedRows.length === 0) {
            normalPopupParam = {
                ...obj,
                popupType: CONSTANT.noSelect,
                submit: fetchOperation,
                status: 'flex'
            };
        } else {
            normalPopupParam = {
                ...obj,
                popupType: CONSTANT.upload,
                submit: fetchOperation,
                status: 'flex',
                dest_path: condition.selectedRows[0].path
            };
        }
        setPopupNormalParams(normalPopupParam);
    }

    onRemove() {
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
            let deleteTips = deleteTips = '确定删除' + condition.selectedRowNames.join(' ') + '?';
            normalPopupParam = {
                ...popupNormalParam,
                popupType: CONSTANT.remove,
                submit: fetchOperation,
                status: 'flex',
                deleteTips: deleteTips
            };
        }
        setPopupNormalParams(normalPopupParam);
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
                        className="li-setting"
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
                        className="li-upload"
                        onClick={this.upload}
                    >
                        <i className="icon icon-upload ps"></i>上传
                    </li>
                    <li
                        className="li-plus"
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
                        className="li-trash  bolder-right-none"
                        onClick={this.onRemove}
                    >
                        <i className="icon icon-trash ps"></i>删除
                    </li>
                </ul>
                <div className="search-input" style={{marginRight: 0}}>
                    <input
                        onChange={this.searchOnChange}
                        ref="searchField"
                        placeholder="search file name" />
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
    const {condition, popupNormalParam, emitFetch} = state;

    return {
        condition,
        popupNormalParam,
        emitFetch
    };
}

export default connect(mapStateToProps, actions)(Operate);
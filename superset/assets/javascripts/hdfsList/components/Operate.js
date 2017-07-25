import React from 'react';
import { render } from 'react-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';
import { selectType, search, CONSTANT, fetchOperation, setPopupNormalParams, popupNormalChangeStatus } from '../actions';

import { Select, PopupNormal } from './';

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
        const {fetchOperation, setPopupNormalParams} = this.props;
        const normalPopupParam = {
            popupType: popupType,
            submit: fetchOperation,
            status: 'flex'
        }
        setPopupNormalParams(normalPopupParam);
    }

    onChange() {
        if (this.refs.searchField.value) {
            this.refs.searchIcon.removeAttribute('disabled');
        } else {
            this.refs.searchIcon.setAttribute('disabled', 'disabled');
        }
    }

    upload(ag) {
        console.log(ag, 'in upload');
        const {fetchOperation, setPopupNormalParams} = this.props;
        const normalPopupParam = {
            popupType: CONSTANT.upload,
            submit: fetchOperation,
            status: 'flex'
        }
        setPopupNormalParams(normalPopupParam);
    }

    onRemove() {
        console.log('onRemove');
        const {selectedRowKeys, selectedRowNames} = this.props;

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

        const openPopup = (ag) => {
            const normalPopupParam = {
                popupType: ag.key,
                submit: fetchOperation,
                status: 'flex'
            }
            this.props.setPopupNormalParams(normalPopupParam);
        //            this.props.popupNormalChangeStatus('flex');
        };

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
            handleSelect={(argus) => openPopup(argus)}
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
    const {condition} = state;

    return {
        condition
    };
}

const mapDispatchToProps = function(dispatch, props) {
    return bindActionCreators({
        selectType,
        search,
        fetchOperation,

        setPopupNormalParams,
        popupNormalChangeStatus
    }, dispatch);
}

export default connect(null, mapDispatchToProps)(Operate);
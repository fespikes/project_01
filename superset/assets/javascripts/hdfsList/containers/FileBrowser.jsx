import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as actions from '../actions';

import { CONSTANT } from '../actions';

import '../style/file-browser.scss';

class FileBrowser extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.props.fetchPreview();
    }

    download(ag) {
        this.props.fetchDownload();
    }

    refresh(ag) {
        this.props.fetchPreview();
    }

    render() {
        const {fileReducer, changePath, fetchDownload, //
            condition} = this.props;
        const {path, mtime, size, user, group, mode, preview} = fileReducer;
        const linkToPath = (ag) => {
            this.setState({
                ...ag
            });
            changePath(ag);
        }
        return (
            <div className="file-browse">
                <div className="title-bar">
                    <i className="icon icon-edit-slice edit-slice-ps"></i>
                    <span>文件浏览器</span>
                </div>
                <div className="content">
                    <div className="item-left fleft">
                        <div className="item-left-module operate">
                            <h3>操作</h3>
                            <ul className="module-list">
                                { /*<li><span>以文本格式查看</span><i className="icon icon-text-hover"></i></li>*/ }
                                <li onClick={(_ => this.download(_))} >
                                    <span>下载</span>
                                    <a>
                                        <i className="icon icon-download-hover"></i>
                                    </a>
                                </li>
                                { /*<li><span>查看文件位置</span><i className="icon icon-file-hover"></i></li>*/ }
                                <li onClick={(_ => this.refresh(_))} >
                                    <span>刷新</span>
                                    <i className="icon icon-refresh-hover"></i>
                                </li>
                            </ul>
                        </div>
                        <div className="item-left-module infor">
                            <h3>信息</h3>
                            <ul className="module-list">
                                <li><span><i className="icon icon-time-default"></i>上次修改</span><em>{mtime}</em></li>
                                <li><span><i className="icon icon-user-default"></i>用户</span><em>{user}</em></li>
                                <li><span><i className="icon icon-group-default"></i>组</span><em>{group}</em></li>
                                <li><span><i className="icon icon-storage－default"></i>大小</span><em>{size}</em></li>
                                <li><span><i className="icon icon-pattern-default"></i>模式</span><em>{mode}</em></li>
                            </ul>
                        </div>
                    </div>

                    <div className="item-right">
                        <div className="bread-crumb sec-class"
            style={{ }}
            >
                            <span className="f16">
                                <Link to="/">《返回</Link>
                            </span>
                            <textarea rows="1"
            className={'f16 path'}
            name="pathName"
            value={path}
            >
                            </textarea>
                        </div>

                        <div className="tableWrapper">
                        {preview}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

FileBrowser.propTypes = {};

function mapStateToProps(state) {
    const {fileReducer, condition} = state;

    return {
        fileReducer,
        condition
    };
}

function mapDispatchToProps(dispatch) {

    const {fetchPreview, changePath, fetchDownload} = bindActionCreators(actions, dispatch);

    return {
        fetchPreview,
        changePath,
        fetchDownload
    };

}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FileBrowser);

import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {FileBrowserTable} from '../components';
import '../style/file-browser.scss';

class FileBrowser extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const {dispatch, response, condition} = this.props;
        const count = response.count;

        return (
            <div className="file-browse">
                <div className="title-bar">
                    <i className="icon icon-browser-ps icon-text-hover"></i>
                    <span>文件浏览器</span>
                </div>
                <div className="content">
                    <div className="item-left fleft">
                        <div className="item-left-module operate">
                            <h3>操作</h3>
                            <ul className="module-list">
                                <li><span>以文本格式查看</span><i className="icon icon-text-hover"></i></li>
                                <li><span>下载</span><i className="icon icon-download-hover"></i></li>
                                <li><span>查看文件位置</span><i className="icon icon-file-hover"></i></li>
                                <li><span>刷新</span><i className="icon icon-refresh-hover"></i></li>
                            </ul>
                        </div>
                        <div className="item-left-module infor">
                            <h3>信息</h3>
                            <ul className="module-list">
                                <li><span><i className="icon icon-time-default"></i>上次修改</span><em>十一月23、2016 4：50a.m</em></li>
                                <li><span><i className="icon icon-user-default"></i>用户</span><em>hive</em></li>
                                <li><span><i className="icon icon-group-default"></i>组</span><em>hive</em></li>
                                <li><span><i className="icon icon-storage－default"></i>大小</span><em>10.0MB</em></li>
                                <li><span><i className="icon icon-pattern-default"></i>模式</span><em>10644</em></li>
                            </ul>
                        </div>
                    </div>
                    <div className="item-right">
                        <div className="bread-crumb">
                            <span className="fleft bread-crumb-box">
                                <span className="slash">/</span>
                                <span className="text">user</span>
                                <span className="slash">/</span>
                                <span className="text">hive</span>
                                <span className="slash">/</span>
                                <span className="text">sparkstaging</span>
                                <span className="slash">/</span>
                                <span className="text">recommend</span>
                            </span>
                            <i className="icon icon-pattern-ps icon-pattern-default"></i>
                        </div>
                        <div className="tableWrapper">
                            <FileBrowserTable />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

FileBrowser.propTypes = {};

function mapStateToProps(state) {
    const { condition, requestByCondition } = state;

    const {
        isFetching,
        response        ///
    } = requestByCondition[condition.tableType]||{
        isFetching: true,
        response: {}
    }
    return {
        condition,
        response,
        isFetching
    };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  };
}

export default connect(
    mapStateToProps
)(FileBrowser);


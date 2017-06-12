import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default function SubDetail (){
    return (
        <div className="data-detail-centent shallow">
            <div className="data-detail-border">
                <label className="data-detail-item">
                    <span>数据集名称：</span>
                    <input type="text" defaultValue="Heatmap" />
                </label>
                <label className="data-detail-item">
                    <span>数据集类型：</span>
                    <dl>
                        <dt><dd className="radio-glugin-active radio-glugin"></dd></dt>
                        <dd className="active">inceptor</dd>
                    </dl>
                    <dl>
                        <dt><dd className="radio-glugin"></dd></dt>
                        <dd>HDFS</dd>
                    </dl>
                    <dl>
                        <dt><dd className="radio-glugin"></dd></dt>
                        <dd>上传文件</dd>
                    </dl>
                </label>

                <label className="data-detail-item">
                    <span></span>
                    <div className="file-show">
                        <div className="file-fold">
                            <i className="icon"></i>
                            <span>DEV</span>
                        </div>
                        <div className="file-fold-active">
                            <i className="icon"></i>
                            <span>AD</span>
                            <div className="file-fold">
                                <i className="icon"></i>
                                <span>DEV</span>
                            </div>
                            <div className="file-fold">
                                <i className="icon"></i>
                                <span className="active">DEV</span>
                            </div>
                            <div className="file-fold">
                                <i className="icon"></i>
                                <span>DEV</span>
                            </div>
                        </div>
                        <div className="file-fold">
                            <i className="icon"></i>
                            <span>DEV</span>
                        </div>
                        <div className="file-fold">
                            <i className="icon"></i>
                            <span>DEV</span>
                        </div>
                        <div className="file-fold">
                            <i className="icon"></i>
                            <span>DEV</span>
                        </div>
                    </div>
                </label>
                <label className="data-detail-item">
                    <span>路径：</span>
                    <input type="text" value="" />
                </label>
                <label className="data-detail-item">
                    <span></span>
                    <button className="uploading-btn">上传文件</button>
                </label>
                <label className="data-detail-item">
                    <span></span>
                    <div className="file-uploading">
                        <i className="icon"></i>
                        <span>package.json</span>
                        <div className="progress"></div>
                    </div>

                </label>
                <label className="data-detail-item">
                    <span></span>
                    <div className="file-uploaded">
                        <i className="icon"></i>
                        <span>package.json</span>
                        <div className="finish"></div>
                    </div>
                </label>
                <label className="data-detail-item">
                    <span></span>
                    <div className="connect-success">
                        <span>连接成功</span>
                        <button>配置></button>
                    </div>
                </label>
                <label className="data-detail-item">
                    <span>描述：</span>
                    <textarea name="" id="" cols="30" rows="10"></textarea>
                </label>
                <div className="data-detail-wrap-item">
                    <label className="data-detail-item data-detail-item-time">
                        <span>主列时间：</span>
                        <input type="text"/>
                    </label>
                    <label className="data-detail-item data-detail-item-time">
                        <span>缓存时间：</span>
                        <input type="text" />
                    </label>
                </div>

            </div>
            <label className="sub-btn">
                <input type="button" defaultValue="保存" />
            </label>
        </div>
    );
}
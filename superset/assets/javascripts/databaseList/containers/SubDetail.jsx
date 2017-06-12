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
                    <p>inceptor</p>
                </label>
                <label className="data-detail-item">
                    <span>连接：</span>
                    <p>inceptor</p>
                </label>
                <label className="data-detail-item">
                    <span>数据库：</span>
                    <p>inceptor</p>
                </label>
                <label className="data-detail-item">
                    <span>表：</span>
                    <p>inceptor</p>
                </label>
                <label className="data-detail-item">
                    <span>描述：</span>
                    <textarea name="" id="" cols="30" rows="10"></textarea>
                </label>
                <div className="data-detail-wrap-item">
                    <label className="data-detail-item">
                        <span>主列时间：</span>
                        <input type="text"/>
                    </label>
                    <label className="data-detail-item">
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
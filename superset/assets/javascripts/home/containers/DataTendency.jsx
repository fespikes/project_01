import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {connect} from "react-redux";
import { createSelector } from 'reselect';
import  { Line } from "../components";
import { changeCatagory } from "../actions";


const _ = require('lodash');

class DataTendency extends Component {

    constructor(props) {
        super();
    }

    render() {
        let counts = this.props.ChartCounts || {
            dashboard: "",
            connection: "",
            slice: "",
            dataset: ""
        };

        let lineChart = {};
        lineChart.statistic = {};
        lineChart.statistic.chart = this.props.lineData || {
            catagories: [],
            series: []
        };

        const { onChangeCatagory, catagory } = this.props;
        let chartTitle = "";
        switch(catagory) {
            case "dashboard":
                chartTitle = "仪表板"
                break;
            case "connection":
                chartTitle = "连接";
                break;
            case "dataset":
                chartTitle = "数据集";
                break;
            case "slice":
                chartTitle = "工作表";
                break;
            default:
                chartTitle = "仪表板";
        }

        return (
            <div>
                <aside className="data-tendency white-bg-and-border-radius">
                    <hgroup className="data-title">
                        <h2 className={catagory === 'dashboard' ? 'selected' : ''}>
                            <dl onClick={ () => {onChangeCatagory('dashboard')}}>
                                <dt className="margin-left-20px">
                                    <i className="icon dashboard-icon"/>
                                </dt>
                                <dd>
                                    <div className="count">{counts.dashboard ? counts.dashboard : 0}</div>
                                    <div className={catagory === 'dashboard' ? 'current name' : 'name'}>仪表盘</div>
                                </dd>
                            </dl>
                        </h2>
                        <h2 className={catagory === 'slice' ? 'selected' : ''}>
                            <dl onClick={ () => {onChangeCatagory('slice')}}>
                                <dt>
                                    <i className="icon slice-icon"/>
                                </dt>
                                <dd>
                                    <div className="count">{counts.slice ? counts.slice : 0}</div>
                                    <div className={catagory === 'slice' ? 'current name' : 'name'}>工作表</div>
                                </dd>

                            </dl>
                        </h2>
                        <h2 className={catagory === 'connection' ? 'selected' : ''}>
                            <dl onClick={ () => {onChangeCatagory('connection')}}>
                                <dt>
                                    <i className="icon connection-icon"/>
                                </dt>
                                <dd>
                                    <div className="count">{counts.connection ? counts.connection : 0}</div>
                                    <div className={catagory === 'connection' ? 'current name' : 'name'}>连接</div>
                                </dd>
                            </dl>
                        </h2>
                        <h2 className={catagory === 'dataset' ? 'selected' : ''}>
                            <dl onClick={ () => {onChangeCatagory('dataset')}}>
                                <dt>
                                    <i className="icon dataset-icon"/>
                                </dt>
                                <dd>
                                    <div className="count">{counts.dataset ? counts.dataset : 0}</div>
                                    <div className={catagory === 'dataset' ? 'current name' : 'name'}>数据集</div>
                                </dd>
                            </dl>
                        </h2>
                    </hgroup>
                    <div className="dashboard-linechart" style={{background:'transparent'}}>
                        <Line title={chartTitle} {...lineChart}/>
                    </div>
                </aside>
            </div>
        );
    }


}

const getLineChartData = createSelector(
    state => state.posts.param.trends,
    state => state.switcher.tendencyCatagory,
    (data, catagory) => {
        if (!data) {
            return "";
        }

        let lineData = {};
        let chart = {};
        let dataArr = [];
        _.forEach(data, (arr, key) => {
            lineData[key] = {
                catagories: [],
                series: [],
                catagoriesWithOutYear: []
            };

            chart = lineData[key];
            dataArr = [];

            _.forEach(arr, (obj, key) => {
                chart.catagories.push(obj.date);
                chart.catagoriesWithOutYear.push(obj.date.substr(5));
                dataArr.push(obj.count);
            });
            chart.series.push({
                name: key,
                data: dataArr
            });

            /***
            here the chart is like:
            {
                categories: []   //x
                series: [{
                    data: []    //y
                    name: ''    //line name
                }]
            }
            */
            lineData[key] = chart;
        });

        return lineData[catagory];
    }
);

DataTendency.propTypes = {
    ChartCounts: PropTypes.any.isRequired,
    lineData: PropTypes.any.isRequired,
}

const mapStateToProps = (state, pros) => {
    const { posts, switcher } = state;
    return {
        ChartCounts: posts.param.counts　|| {},
        lineData: getLineChartData(state),
        catagory: switcher.tendencyCatagory
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        onChangeCatagory: (catagory) => {
            dispatch(changeCatagory(catagory));
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DataTendency);
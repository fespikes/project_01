import React from 'react';
import ReactHighcharts from 'react-highcharts';
import Highcharts from 'highcharts';
import PropTypes from 'prop-types';
import HighchartsNoData from 'highcharts-no-data-to-display';
const _ = require('lodash');

HighchartsNoData(Highcharts);

function makeDummy(data, max) {
     var dummy = [];
    _.forEach(data, function(point, i) {
         dummy.push(max - point);
    });
    return dummy;
}

function Bar(props) {
    if (!props.barData) {
        return <p>数据异常</p>;
    }

    const { catagories, series } = props.barData || {
        catagories: [],
        series: {
            name: "",
            data: []
        }
    };

    let height = 40 * catagories.length + 30;

    let maxs = [];
    maxs.push(Math.max.apply(null, series.data));
    let max = Math.round(Math.max.apply(null, maxs) * 1.1);
    let dummyData =  makeDummy(series.data, max);

    const config = {
        chart: {
            type: 'bar',
            height: height
        },
        title: {
            text: ''
        },
        lang: {
            noData: "暂无数据"
        },
        xAxis: {
            categories: catagories,
            title: {
                text: null
            },
            lineWidth: 0,
            minorGridLineWidth: 0,
            lineColor: 'transparent',
            minorTickLength: 0,
            tickLength: 0,
            labels: {
                style: {
                    color: '#7c8ca5',
                    fontSize: 14,
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    textOverflow: 'none'
                }
            }
        },
        yAxis: {
            min: 0,
            max: max,
            title: {
                text: '',
                align: 'high'
            },
            visible: false
        },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    align: 'right',
                    color: '#FFFFFF',
                    x: -10
                },
                groupPadding: 0,
                stacking:'normal',
                borderRadius: 4,
                pointWidth: 26
            }
        },
        tooltip: {
            valueSuffix: '',
            enabled: false
        },
        legend: {
            enabled: false
        },
        credits: {
            enabled: false
        },
        noData: {
            style: {
                fontWeight: 'bold',
                fontSize: '15px',
                color: '#303030'
            }
        },
        series: [
            {
                stack: 'a',
                showInLegend: false,
                enableMouseTracking: false,
                name: 'Fill Series',
                color: '#f5f8fa',
                data: dummyData,
                pointWidth: 26,
                dataLabels: {
                     enabled: false
                }
            },
            {
                stack:'a',
                name: series.name,
                data: series.data,
                pointWidth: 26,
                color: '#2ea1f8'
            }
        ]
    };


    return (
        <ReactHighcharts config={config}></ReactHighcharts>
    );
}

Bar.propTypes = {
    barData: PropTypes.object
};

export default Bar;
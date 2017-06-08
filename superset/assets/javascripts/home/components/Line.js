import React from 'react';
import ReactHighcharts from 'react-highcharts';
import PropTypes from 'prop-types';

function Line(props) {

    if (!props.statistic) return <p>数据异常</p>;

    const {catagories, series, catagoriesWithOutYear} = props.statistic.chart || {
        catagories: [],
        series: []
    };
    const title = props.title;

    const config = {
        chart: {
            type: 'area',
            height: '240'
        },
        credits: {
            enabled: false
        },
        title: {
            text: title + '数量变化趋势',
            align: "left"
        },
        yAxis: {
            title: {
                text: ''
            }
        },
        tooltip: {
            valueSuffix: '',
            backgroundColor: '#222c3c',
            style: {
                "color": "#d9dfe8"
            },
            borderWidth: 0,
            borderRadius: 8,
            useHTML: true,
            headerFormat: '<div style="text-align:center">{point.key}</div>',
            formatter: function() {
                var result = '<div class="line-tooltip">';
                result += '<div class="tooltip-header" style="text-align:center">' + this.key + '</div>';
                result += '<div class="tooltip-body">'
                if (this.point.index > 0) {
                    result += '<div class="yesterday"><span class="key">昨日变动</span><span class="value">' + this.series.data[this.point.index - 1].y + "</span></div>";
                }
                result += '<div class="today"><span class="key">今日变动</span><span class="value">' + this.series.data[this.point.index].y + "</span></div>";
                result += '</div>';
                return result;
            }
        },
        legend: {
            enabled: false
        },
        xAxis: {
            categories: catagories,
            labels: {
                formatter: function() {
                    var result = this.value.substr(5);
                    return result;
                }
            }
        },
        series
    };

    return (
        <ReactHighcharts config={config} />
    );
}

Line.propTypes = {
  statistic: PropTypes.any
};

export default Line;

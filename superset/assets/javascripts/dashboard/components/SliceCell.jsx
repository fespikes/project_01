import React, { PropTypes } from 'react';
import { Tooltip } from 'antd';

const propTypes = {
    slice: PropTypes.object.isRequired,
    removeSlice: PropTypes.func.isRequired,
    expandedSlices: PropTypes.object,
};

function SliceCell({ expandedSlices, removeSlice, slice }) {
    return (
        <div className="slice-cell" id={`${slice.token}-cell`}>
            <div className="chart-header">
                <div className="row">
                    <div className="col-md-12 header">
                        <span>{slice.slice_name}</span>
                    </div>
                    <div className="col-md-12 chart-controls">
                        <div className="pull-right">
                            <Tooltip title="Move chart" placement="top">
                                <a>
                                    <i className="fa fa-arrows drag" />
                                </a>
                            </Tooltip>
                            <Tooltip title="Force refresh data" placement="top">
                                <a>
                                    <i className="fa fa-repeat" />
                                </a>
                            </Tooltip>
                            {slice.description &&
                            <Tooltip title={slice.description} placement="top">
                                <a>
                                    <i
                                        className="fa fa-info-circle slice_info"
                                    />
                                </a>
                            </Tooltip>
                            }
                            <Tooltip title="Edit chart" placement="top">
                                <a href={slice.edit_url}>
                                    <i className="fa fa-pencil" />
                                </a>
                            </Tooltip>
                            <Tooltip title="Explore chart" placement="top">
                                <a href={slice.slice_url}>
                                    <i className="fa fa-share" />
                                </a>
                            </Tooltip>
                            <Tooltip title="Remove chart from dashboard" placement="top">
                                <a className="remove-chart">
                                    <i
                                        className="fa fa-close"
                                        onClick={() => { removeSlice(slice.slice_id); }}
                                    />
                                </a>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className="slice_description bs-callout bs-callout-default"
                style={
          expandedSlices &&
          expandedSlices[String(slice.slice_id)] ? {} : { display: 'none' }
        }
                dangerouslySetInnerHTML={{ __html: slice.description_markeddown }}
            >

            </div>
            <div className="row chart-container">
                <input type="hidden" value="false" />
                <div id={slice.token} className="token col-md-12">
                    <img
                        src="/static/assets/images/loading.gif"
                        className="loading"
                        alt="loading"
                    />
                    <div className="slice_container" id={slice.token + '_con'}></div>
                </div>
            </div>
        </div>
    );
}

SliceCell.propTypes = propTypes;

export default SliceCell;

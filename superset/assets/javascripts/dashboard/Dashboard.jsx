const $ = window.$ = require('jquery');
const jQuery = window.jQuery = require('jquery'); // eslint-disable-line
const px = require('../modules/superset');
const d3 = require('d3');
const urlLib = require('url');
const utils = require('../modules/utils');
const { Alert } = require('react-bootstrap');

import React from 'react';
import { render } from 'react-dom';
import GridLayout from './components/GridLayout';
import Header from './components/Header';
import { getNewDashboard } from '../../utils/common2';
import { PILOT_PREFIX, renderLoadingModal} from '../../utils/utils';
import domtoimage from 'dom-to-image';
import { ConfirmModal } from '../common/components';

require('bootstrap');
require('../../stylesheets/dashboard.css');
require('../superset-select2.js');

export function getInitialState(dashboardData, context) {
    const dashboard = Object.assign({ context }, utils.controllerInterface, dashboardData);
    dashboard.firstLoad = true;

    dashboard.posDict = {};
    if (dashboard.position_json) {
        dashboard.position_json.forEach(position => {
            dashboard.posDict[position.slice_id] = position;
        });
    }
    dashboard.curUserId = dashboard.context.user_id;
    dashboard.refreshTimer = null;

    const state = {
        dashboard,
    };
    return state;
}

function unload() {
    const message = 'You have unsaved changes.';
    window.event.returnValue = message; // Gecko + IE
    return message; // Gecko + Webkit, Safari, Chrome etc.
}

function onBeforeUnload(hasChanged) {
    if (hasChanged) {
        window.addEventListener('beforeunload', unload);
    } else {
        window.removeEventListener('beforeunload', unload);
    }
}

function renderAlert() {
    render(
        <div className="container-fluid">
            <Alert bsStyle="warning">
                <strong>You have unsaved changes.</strong> Click the&nbsp;
                <i className="fa fa-save" />&nbsp;
                button on the top right to save your changes.
            </Alert>
        </div>,
        document.getElementById('alert-container')
    );
}

function renderErrorAlert(errorMsg) {
    render(
        <ConfirmModal
            needCallback={false}
            confirmMessage={errorMsg}
        />,
        document.getElementById('popup_root')
    );
}

function initDashboardView(dashboard) {
    render(
        <Header dashboard={dashboard} />,
        document.getElementById('dashboard-header')
    );
    // eslint-disable-next-line no-param-reassign
    dashboard.reactGridLayout = render(
        <GridLayout dashboard={dashboard} />,
        document.getElementById('grid-container')
    );

    $('div.grid-container').css('visibility', 'visible');

    $('.select2').select2({
        dropdownAutoWidth: true,
    });
    $('div.widget').click(function (e) {
        const $this = $(this);
        const $target = $(e.target);

        if ($target.hasClass('slice_info')) {
            return;
            //$this.find('.slice_description').slideToggle(0, function () {
            //    $this.find('.refresh').click();
            //});
        } else if ($target.hasClass('controls-toggle')) {
            $this.find('.chart-controls').toggle();
        }
    });
    px.initFavStars();
    $('[data-toggle="tooltip"]').tooltip({ container: 'body' });
}

export function dashboardContainer(dashboard) {
    return Object.assign({}, dashboard, {
        type: 'dashboard',
        filters: {},
        init() {
            this.sliceObjects = [];
            this.renderCount = 0;
            dashboard.slices.forEach((data) => {
                if (data.error) {
                    const html = '<div class="alert alert-danger">' + data.error + '</div>';
                    $('#slice_' + data.slice_id).find('.token').html(html);
                } else {
                    const slice = px.Slice(data, this, 'dashboard');
                    $('#slice_' + data.slice_id).find('a.refresh').click(() => {
                        slice.render(true);
                    });
                    this.sliceObjects.push(slice);
                }
            });
            this.loadPreSelectFilters();
            this.startPeriodicRender(0);
            this.bindResizeToWindowResize();
        },
        onChange() {
            onBeforeUnload(true);
            renderAlert();
        },
        onSave() {
            onBeforeUnload(false);
            $('#alert-container').html('');
        },
        loadPreSelectFilters() {
            try {
                const filters = JSON.parse(px.getParam('preselect_filters') || '{}');
                for (const sliceId in filters) {
                    for (const col in filters[sliceId]) {
                        this.setFilter(sliceId, col, filters[sliceId][col], false, false);
                    }
                }
            } catch (e) {
                // console.error(e);
            }
        },
        setFilter(sliceId, col, vals, refresh) {
            this.addFilter(sliceId, col, vals, false, refresh);
        },
        done(slice) {
            const refresh = slice.getWidgetHeader().find('.refresh');
            const data = slice.data;
            if (data !== undefined && data.is_cached) {
                refresh
                    .addClass('danger');
                    //.attr('title',
                    //    'Served from data cached at ' + data.cached_dttm +
                    //    '. Click to force refresh')
                    //.tooltip('fixTitle');
            } else {
                refresh
                    .removeClass('danger')
                    //.attr('title', '点击强制刷新')
                    .tooltip('fixTitle');
            }
            this.renderCount++;
            if (dashboard.context.need_capture && this.renderCount === this.sliceObjects.length && this.sliceObjects.length > 0) {
                this.screenShot();
            }
        },
        screenShot() {
            const container = document.getElementById('grid-container');
            const getAjaxErrorMsg = this.getAjaxErrorMsg;
            setTimeout(() => {
                try {
                    const scale = 1.29;
                    domtoimage.toPng(container, { width: container.clientWidth, height: container.clientWidth / scale })
                        .then(function (image) {
                            const url = `/dashboard/upload_image/${dashboard.id}/`;
                            const formData = new FormData();
                            if (image) {
                                formData.append('image', image);
                                $.ajax({
                                    type: "POST",
                                    url: url,
                                    data: formData,
                                    success: (data) => {
                                        console.log('capture successfully', data);
                                    },
                                    error(error) {
                                        //the operation should be invisible for user
                                    },
                                    processData: false,
                                    contentType: false,
                                });
                            }
                        });
                } catch (error) {
                    console.log(error);
                }
            }, 500);
        },
        effectiveExtraFilters(sliceId) {
            // Summarized filter, not defined by sliceId
            // returns k=field, v=array of values
            const f = {};
            const immuneSlices = this.metadata.filter_immune_slices || [];
            if (sliceId && immuneSlices.includes(sliceId)) {
                // The slice is immune to dashboard fiterls
                return f;
            }

            // Building a list of fields the slice is immune to filters on
            let immuneToFields = [];
            if (
                sliceId &&
                this.metadata.filter_immune_slice_fields &&
                this.metadata.filter_immune_slice_fields[sliceId]) {
                immuneToFields = this.metadata.filter_immune_slice_fields[sliceId];
            }
            for (const filteringSliceId in this.filters) {
                for (const field in this.filters[filteringSliceId]) {
                    if (!immuneToFields.includes(field)) {
                        f[field] = this.filters[filteringSliceId][field];
                    }
                }
            }
            return f;
        },
        addFilter(sliceId, col, vals, merge = true, refresh = true) {
            if (!(sliceId in this.filters)) {
                this.filters[sliceId] = {};
            }
            if (!(col in this.filters[sliceId]) || !merge) {
                this.filters[sliceId][col] = vals;
            } else {
                this.filters[sliceId][col] = d3.merge([this.filters[sliceId][col], vals]);
            }
            if (refresh) {
                this.refreshExcept(sliceId);
            }
            this.updateFilterParamsInUrl();
        },
        readFilters() {
            // Returns a list of human readable active filters
            return JSON.stringify(this.filters, null, '  ');
        },
        updateFilterParamsInUrl() {
            const urlObj = urlLib.parse(location.href, true);
            urlObj.query = urlObj.query || {};
            urlObj.query.preselect_filters = this.readFilters();
            urlObj.search = null;
            history.pushState(urlObj.query, window.title, urlLib.format(urlObj));
        },
        bindResizeToWindowResize() {
            let resizeTimer;
            const dash = this;
            $(window).on('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    dash.sliceObjects.forEach((slice) => {
                        slice.resize();
                    });
                }, 500);
            });
        },
        stopPeriodicRender() {
            if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }
        },
        startPeriodicRender(interval) {
            this.stopPeriodicRender();
            const dash = this;
            const maxRandomDelay = Math.max(interval * 0.2, 5000);
            const refreshAll = () => {
                dash.sliceObjects.forEach(slice => {
                    const force = !dash.firstLoad;
                    setTimeout(() => {
                            slice.render(force);
                        },
                        // Randomize to prevent all widgets refreshing at the same time
                        maxRandomDelay * Math.random());
                });
                dash.firstLoad = false;
            };

            const fetchAndRender = function () {
                refreshAll();
                if (interval > 0) {
                    dash.refreshTimer = setTimeout(function () {
                        fetchAndRender();
                    }, interval);
                }
            };
            fetchAndRender();
        },
        refreshExcept(sliceId) {
            const immune = this.metadata.filter_immune_slices || [];
            this.sliceObjects.forEach(slice => {
                if (slice.data.slice_id !== sliceId && immune.indexOf(slice.data.slice_id) === -1) {
                    slice.render();
                    const sliceSeletor = $(`#${slice.data.token}-cell`);
                    sliceSeletor.addClass('slice-cell-highlight');
                    setTimeout(function () {
                        sliceSeletor.removeClass('slice-cell-highlight');
                    }, 1200);
                }
            });
        },
        clearFilters(sliceId) {
            delete this.filters[sliceId];
            this.refreshExcept(sliceId);
            this.updateFilterParamsInUrl();
        },
        removeFilter(sliceId, col, vals) {
            if (sliceId in this.filters) {
                if (col in this.filters[sliceId]) {
                    const a = [];
                    this.filters[sliceId][col].forEach(function (v) {
                        if (vals.indexOf(v) < 0) {
                            a.push(v);
                        }
                    });
                    this.filters[sliceId][col] = a;
                }
            }
            this.refreshExcept(sliceId);
            this.updateFilterParamsInUrl();
        },
        getSlice(sliceId) {
            const id = parseInt(sliceId, 10);
            let i = 0;
            let slice = null;
            while (i < this.sliceObjects.length) {
                // when the slice is found, assign to slice and break;
                if (this.sliceObjects[i].data.slice_id === id) {
                    slice = this.sliceObjects[i];
                    break;
                }
                i++;
            }
            return slice;
        },
        getAjaxErrorMsg(error) {
            const respJSON = error.responseJSON;
            return (respJSON && respJSON.message) ? respJSON.message :
                error.responseText;
        },
        addSlicesToDashboard(sliceIds) {
            const getAjaxErrorMsg = this.getAjaxErrorMsg;
            const url = PILOT_PREFIX + `add_slices/${dashboard.id}/`;
            const loadingModal = renderLoadingModal();
            loadingModal.show();
            $.ajax({
                type: 'POST',
                url: url,
                data: {
                    data: JSON.stringify({ slice_ids: sliceIds }),
                },
                success() {
                    loadingModal.hide();
                    // Refresh page to allow for slices to re-render
                    window.location.reload();
                },
                error(error) {
                    loadingModal.hide();
                    const errorMsg = getAjaxErrorMsg(error);
                    renderErrorAlert(errorMsg);
                },
            });
        },
        editDashboard(dashboard, selectedSlices) {
            const getAjaxErrorMsg = this.getAjaxErrorMsg;
            const loadingModal = renderLoadingModal();
            loadingModal.show();
            $.ajax({
                type: 'POST',
                url: '/dashboard/edit/' + dashboard.id,
                contentType: 'application/json',
                data: JSON.stringify(getNewDashboard(dashboard, selectedSlices, dashboard.available_slices)),
                success() {
                    loadingModal.hide();
                    window.location.reload();
                },
                error(error) {
                    loadingModal.hide();
                    const errorMsg = getAjaxErrorMsg(error);
                    renderErrorAlert(errorMsg);
                }
            });
        },
    });
}

$(document).ready(() => {
    // Getting bootstrapped data from the DOM
    let dashboardData = $('.dashboard').data('dashboard');
    dashboardData.description = $('.dashboard').data('dashboard-description');
    const contextData = $('.dashboard').data('context');

    const state = getInitialState(dashboardData, contextData);
    const dashboard = dashboardContainer(state.dashboard);
    initDashboardView(dashboard);
    dashboard.init();
    $('.nav > li:nth-child(2)').addClass('active');
});

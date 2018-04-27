// Javascript for the explorer page
// Init explorer view -> load vis dependencies -> read data (from dynamic html) -> render slice
// nb: to add a new vis, you must also add a Python fn in viz.py
//
// js
const $ = window.$ = require('jquery');
const px = require('./../modules/superset.js');
const utils = require('./../modules/utils.js');
const jQuery = window.jQuery = require('jquery'); // eslint-disable-line

import React from 'react';
import ReactDOM from 'react-dom';
import QueryAndSaveBtns from './components/QueryAndSaveBtns.jsx';
import ExploreActionButtons from './components/ExploreActionButtons.jsx';
import DisplayOriginalTable from './components/DisplayOriginalTable.jsx';
import { Radio, Table } from 'antd';
import { renderLoadingModal, getUrlParam, getAjaxErrorMsg, loadIntlResources } from '../../utils/utils';
import { getTableWidth } from '../tableList/module';
import { ConfirmModal } from '../common/components';
import { renderConfirmModal } from '../../utils/utils';
import intl from 'react-intl-universal';

require('jquery-ui');
$.widget.bridge('uitooltip', $.ui.tooltip); // Shutting down jq-ui tooltips
require('bootstrap');

require('./../superset-select2.js');

// css
require('../../vendor/pygments.css');
require('../../stylesheets/explore.css');
const _ = require('lodash');
const viewTypes = {
    graph: 'graph',
    original: 'original',
    result: 'result'
};
let slice;
let currentViewType;
let operationType;

const getPanelClass = function (fieldPrefix) {
    return (fieldPrefix === 'flt' ? 'filter' : 'having') + '_panel';
};

let sliceResultData = {};

function prepForm() {
    // Assigning the right id to form elements in filters
    const fixId = function ($filter, fieldPrefix, i) {
        $filter.attr('id', function () {
            return fieldPrefix + '_' + i;
        });

        ['col', 'op', 'eq'].forEach(function (fieldMiddle) {
            const fieldName = fieldPrefix + '_' + fieldMiddle;
            $filter.find('[id^=' + fieldName + '_]')
                .attr('id', function () {
                    return fieldName + '_' + i;
                })
                .attr('name', function () {
                    return fieldName + '_' + i;
                });
        });
    };

    ['flt', 'having'].forEach(function (fieldPrefix) {
        let i = 1;
        $('#' + getPanelClass(fieldPrefix) + ' #filters > div').each(function () {
            fixId($(this), fieldPrefix, i);
            i++;
        });
    });
}

function query(forceUpdate, pushState) {
    let force = forceUpdate;
    if (force === undefined) {
        force = false;
    }
    $('.query-and-save button').attr('disabled', 'disabled');
    if (force) {  // Don't hide the alert message when the page is just loaded
        $('div.alert').remove();
    }
    $('#is_cached').hide();
    prepForm();

    if (pushState !== false) {
        // update the url after prepForm() fix the field ids
        history.pushState({}, document.title, slice.querystring());
    }
    slice.container.html('');
    slice.render(force);
}

function saveSlice() {
    const action = $('input[name=rdo_save]:checked').val();
    if (action === 'saveas') {
        const sliceName = $('input[name=new_slice_name]').val();
        if (sliceName === '') {
            renderConfirmModal(intl.get('SLICE.PICK_NAME_FOR_NEW_SLICE'));
            return;
        }
        document.getElementById('slice_name').value = sliceName;
    }
    const addToDash = $('input[name=add_to_dash]:checked').val();
    if (addToDash === 'existing' && $('#save_to_dashboard_id').val() === '') {
        renderConfirmModal(intl.get('SLICE.PICK_EXISTING_DASHBOARD'));
        return;
    } else if (addToDash === 'new' && $('input[name=new_dashboard_name]').val() === '') {
        renderConfirmModal(intl.get('SLICE.ENTER_NAME_FOR_NEW_DASHBOARD'));
        return;
    }
    $('#action').val(action);
    prepForm();
    $('#query').submit();
}

function initExploreView() {
    function getCollapsedFieldsets() {
        let collapsedFieldsets = $('#collapsedFieldsets').val();

        if (collapsedFieldsets !== undefined && collapsedFieldsets !== '') {
            collapsedFieldsets = collapsedFieldsets.split('||');
        } else {
            collapsedFieldsets = [];
        }
        return collapsedFieldsets;
    }

    function toggleFieldset(legend, animation) {
        const parent = legend.parent();
        const fieldset = parent.find('.legend_label').text();
        const collapsedFieldsets = getCollapsedFieldsets();
        let index;

        if (parent.hasClass('collapsed')) {
            if (animation) {
                parent.find('.panel-body').slideDown();
            } else {
                parent.find('.panel-body').show();
            }
            parent.removeClass('collapsed');
            parent.find('span.collapser').text('[-]');

            // removing from array, js is overcomplicated
            index = collapsedFieldsets.indexOf(fieldset);
            if (index !== -1) {
                collapsedFieldsets.splice(index, 1);
            }
        } else { // not collapsed
            if (animation) {
                parent.find('.panel-body').slideUp();
            } else {
                parent.find('.panel-body').hide();
            }

            parent.addClass('collapsed');
            parent.find('span.collapser').text('[+]');
            index = collapsedFieldsets.indexOf(fieldset);
            if (index === -1 && fieldset !== '' && fieldset !== undefined) {
                collapsedFieldsets.push(fieldset);
            }
        }

        $('#collapsedFieldsets').val(collapsedFieldsets.join('||'));
    }

    const url = window.location.href;
    const sliceId = getUrlParam('slice_id', url);
    if(sliceId && sliceId !== '') {
        px.initFavStars();
    }

    $('#viz_type').change(function () {
        localStorage.setItem('explore:firstEntry', 'false');
        $('#query').submit();
    });

    $('#datasource_id').change(function (opt) {
        localStorage.setItem('explore:firstEntry', 'false');
        let datasource_type;
        if(getUrlParam('viz_type', window.location.href) === '') {
            datasource_type = 'table';
        }else {
            datasource_type = getUrlParam('viz_type', window.location.href);
        }
        const sliceId = document.getElementById('slice-title-name').getAttribute('sliceId');
        let url = $(this).find('option:selected').attr('url');
        url = url.split('&')[0] + '&viz_type=' + datasource_type;
        if(sliceId && sliceId !== '') {
            url += '&slice_id=' + sliceId;
        }
        window.location = url;
    });

    const collapsedFieldsets = getCollapsedFieldsets();
    for (let i = 0; i < collapsedFieldsets.length; i++) {
        toggleFieldset($('legend:contains("' + collapsedFieldsets[i] + '")'), false);
    }
    function formatViz(viz) {
        const url = `/static/assets/images/viz_thumbnails/${viz.id}.png`;
        const noImg = '/static/assets/images/noimg.png';
        return $(
            `<img class="viz-thumb-option" src="${url}" onerror="this.src='${noImg}';">` +
            `<span>${viz.text}</span>`
        );
    }

    $('.select2').select2({
        dropdownAutoWidth: true,
    });
    $('.select2Sortable').select2({
        dropdownAutoWidth: true,
    });
    $('.select2-with-images').select2({
        dropdownAutoWidth: true,
        dropdownCssClass: 'bigdrop',
        formatResult: formatViz,
    });
    $('.select2Sortable').select2Sortable({
        bindOrder: 'sortableStop',
    });
    $('form').show();
    $('[data-toggle="tooltip"]').tooltip({ container: 'body' });
    $('.ui-helper-hidden-accessible').remove(); // jQuery-ui 1.11+ creates a div for every tooltip

    function addFilter(i, fieldPrefix) {
        const cp = $('#' + fieldPrefix + '0').clone();
        $(cp).appendTo('#' + getPanelClass(fieldPrefix) + ' #filters');
        $(cp).show();
        if (i !== undefined) {
            $(cp).find('#' + fieldPrefix + '_eq_0').val(px.getParam(fieldPrefix + '_eq_' + i));
            $(cp).find('#' + fieldPrefix + '_op_0').val(px.getParam(fieldPrefix + '_op_' + i));
            $(cp).find('#' + fieldPrefix + '_col_0').val(px.getParam(fieldPrefix + '_col_' + i));
        }
        $(cp).find('select').select2();
        $(cp).find('.remove').click(function () {
            $(this)
                .parent()
                .parent()
                .remove();
        });
    }

    function setFilters() {
        ['flt', 'having'].forEach(function (prefix) {
            for (let i = 1; i < 10; i++) {
                const col = px.getParam(prefix + '_col_' + i);
                if (col !== '') {
                    addFilter(i, prefix);
                }
            }
        });
    }
    setFilters();

    $(window).bind('popstate', function () {
        // Browser back button
        const returnLocation = history.location || document.location;
        // Could do something more lightweight here, but we're not optimizing
        // for the use of the back button anyways
        returnLocation.reload();
    });

    $('#filter_panel #plus').click(function () {
        addFilter(undefined, 'flt');
    });
    $('#having_panel #plus').click(function () {
        addFilter(undefined, 'having');
    });
    $('input:radio').change(function() {
        if(this.value === "datasource") {
            $('#existed_data_source').css('display', 'block');
            $('#original_table').css('display', 'none');
        }else if(this.value === "sourcetable") {
            $('#existed_data_source').css('display', 'none');
            $('#original_table').css('display', 'block');
        }
    });

    function createChoices(term, data) {
        const filtered = $(data).filter(function () {
            return this.text.localeCompare(term) === 0;
        });
        if (filtered.length === 0) {
            return {
                id: term,
                text: term,
            };
        }
        return {};
    }

    function initSelectionToValue(element, callback) {
        callback({
            id: element.val(),
            text: element.val(),
        });
    }

    $('.select2_freeform').each(function () {
        const parent = $(this).parent();
        const name = $(this).attr('name');
        const l = [];
        let selected = '';
        for (let i = 0; i < this.options.length; i++) {
            l.push({
                id: this.options[i].value,
                text: this.options[i].text,
            });
            if (this.options[i].selected) {
                selected = this.options[i].value;
            }
        }
        parent.append(
            `<input class="${$(this).attr('class')}" ` +
            `name="${name}" type="text" value="${selected}">`
        );
        $(`input[name='${name}']`).select2({
            createSearchChoice: createChoices,
            initSelection: initSelectionToValue,
            dropdownAutoWidth: true,
            multiple: false,
            data: l,
        });
        $(this).remove();
    });

    function prepSaveDialog() {
        const setButtonsState = function () {
            const addToDash = $('input[name=add_to_dash]:checked').val();
            if (addToDash === 'existing' || addToDash === 'new') {
                $('.gotodash').removeAttr('disabled');
            } else {
                $('.gotodash').prop('disabled', true);
            }
        };
        const url = '/dashboard/listdata?page_size=1000';
        $.get(url, function (respose) {
            const choices = [];
            const data = respose.data;
            for (let i = 0; i < data.data.length; i++) {
                choices.push({ id: data.data[i].id, text: data.data[i].name });
            }
            $('#save_to_dashboard_id').select2({
                data: choices,
                dropdownAutoWidth: true,
            }).on('select2-selecting', function () {
                $('#add_to_dash_existing').prop('checked', true);
                setButtonsState();
            });
        });

        $('input[name=add_to_dash]').change(setButtonsState);
        $("input[name='new_dashboard_name']").on('focus', function () {
            $('#add_to_new_dash').prop('checked', true);
            setButtonsState();
        });
        $("input[name='new_slice_name']").on('focus', function () {
            $('#save_as_new').prop('checked', true);
            setButtonsState();
        });

        $('#btn_modal_save').on('click', () => saveSlice());

        $('#btn_modal_save_goto_dash').click(() => {
            document.getElementById('goto_dash').value = 'true';
            console.log('save goto dash');
            console.log(document.getElementById('goto_dash').value);
            saveSlice();
        });
    }
    prepSaveDialog();
}

function renderOriginalTable(databaseId, tableName) {
    const originalTableEl = document.getElementById('original_table');
    ReactDOM.render(
        <DisplayOriginalTable
            sliceId={originalTableEl.getAttribute('sliceId')}
            vizType={originalTableEl.getAttribute('vizType')}
            databaseId={databaseId}
            tableName={tableName}
        />,
        originalTableEl
    );
}

function renderExploreActions(queryString) {
    const exploreActionsEl = document.getElementById('js-explore-actions');
    ReactDOM.render(
        <ExploreActionButtons
            canDownload={exploreActionsEl.getAttribute('data-can-download')}
            slice={slice}
            sliceId={exploreActionsEl.getAttribute('sliceId')}
            query={queryString}
        />,
        exploreActionsEl
    );
}

function generateTableView(previewData) {
    if (!previewData) {
        return <span>暂无数据</span>;
    }
    if(typeof(previewData) === "string") {
        previewData = JSON.parse(previewData);
    }
    let columns = [], dataSource = [];
    let columnItem = {}, dataItem = {};

    _.forEach(previewData.columns, (column, key) => {
        columnItem = {
            title: column,
            dataIndex: column,
            key: column
        };
        columns.push(columnItem);
    });
    _.forEach(previewData.records, (record, key) => {
        dataItem = {};
        for(var item in record) {
            dataItem[item] = record[item];
        }
        dataItem.key = key + 1;
        dataSource.push(dataItem);
    });

    let width = 'auto';
    if(previewData && previewData.columns) {
        width = getTableWidth(previewData.columns.length);
    }
    return <div style={{width: width}}>
               <Table
                   columns={columns}
                   dataSource={dataSource}
                   className="slice-detail-table"
               />
           </div>;
}


function renderViewTab() {
    const viewTabEl = document.getElementById('view-tab-container');
    const RadioButton = Radio.Button;
    const RadioGroup = Radio.Group;
    function onChange(event) {
        if(event.target.value === viewTypes.graph) {
            currentViewType = viewTypes.graph;
            $('.graph-view').css('display', 'block');
            $('.result-view').css('display', 'none');
            $('.original-view').css('display', 'none');
        }else if(event.target.value === viewTypes.original) {
            currentViewType = viewTypes.original;
            const datasourceId = viewTabEl.getAttribute('datasourceId');
            const databaseId = getUrlParam('database_id', slice.data.json_endpoint);
            const fullTbName = getUrlParam('full_tb_name', slice.data.json_endpoint);

            if (datasourceId===localStorage.getItem('explore:datasourceId') && databaseId===localStorage.getItem('explore:databaseId')
                && fullTbName===localStorage.getItem('explore:fullTbName')){
                renderPreviewOriginalData(JSON.parse(localStorage.getItem('explore:previewData')));
            } else {
                const url = window.location.origin + "/table/preview_data?dataset_id=" + datasourceId +
                    '&database_id=' + databaseId + '&full_tb_name=' + fullTbName;
                const loadingModal = renderLoadingModal();
                loadingModal.show();
                $.ajax({
                    url: url,
                    type: 'GET',
                    success: response => {
                        let previewData = response.data;
                        localStorage.setItem('explore:datasourceId', datasourceId);
                        localStorage.setItem('explore:databaseId', databaseId);
                        localStorage.setItem('explore:fullTbName', fullTbName);
                        localStorage.setItem('explore:previewData', JSON.stringify(previewData));
                        renderPreviewOriginalData(previewData);
                    },
                    error: error => {
                        console.log(error);
                    },
                    complete: () => {
                        loadingModal.hide();
                    }
                });
            }
        }else if(event.target.value === viewTypes.result) {
            currentViewType = viewTypes.result;
            renderPreviewResultData(sliceResultData);
        }
    }
    ReactDOM.render(
        <div>
            <RadioGroup onChange={onChange} defaultValue="graph">
                <RadioButton value="graph">{intl.get('SLICE.CHART')}</RadioButton>
                <RadioButton value="result">{intl.get('SLICE.RESULT_COLLECTION')}</RadioButton>
                <RadioButton value="original">{intl.get('SLICE.SOURCE_DATA')}</RadioButton>
            </RadioGroup>
        </div>, viewTabEl
    );
}

function refreshPreviewData(slice) {
    if(slice.data && slice.data.dataframe) {
        sliceResultData = slice.data.dataframe;
    }else {
        sliceResultData = {};
    }
    if(currentViewType === viewTypes.result) {
        renderPreviewResultData(sliceResultData);
    }
}

function renderPreviewResultData(data) {
    const table = generateTableView(data);
    $('.graph-view').css('display', 'none');
    $('.result-view').css('display', 'block');
    $('.original-view').css('display', 'none');
    ReactDOM.render(table, document.getElementById('table-view-result'));
}

function renderPreviewOriginalData(data) {
    const table = generateTableView(data);
    $('.graph-view').css('display', 'none');
    $('.result-view').css('display', 'none');
    $('.original-view').css('display', 'block');
    ReactDOM.render(table, document.getElementById('table-view-original'));
}

function initComponents() {
    const queryAndSaveBtnsEl = document.getElementById('js-query-and-save-btns');
    ReactDOM.render(
        <QueryAndSaveBtns
            canAdd={queryAndSaveBtnsEl.getAttribute('data-can-add')}
            onQuery={() => query(true)}
            intl={intl}
        />,
        queryAndSaveBtnsEl
    );
    renderExploreActions();
    renderViewTab();
}

function initTitle() {
    const titleEl = document.getElementById('slice-title-name');
    const sliceId = titleEl.getAttribute('sliceId');
    if(sliceId !== '') {
        titleEl.value = intl.get('SLICE.EDIT_SLICE');
        operationType = 'editSlice';
    }else {
        titleEl.value = intl.get('SLICE.ADD_SLICE');
        operationType = 'addSlice';
    }
}

function initDatasourceState() {
    const url = window.location.href;
    const databaseId = getUrlParam('database_id', url);
    const fullTbName = getUrlParam('full_tb_name', url);

    if(typeof databaseId === 'string' && databaseId.length >0 && typeof fullTbName === 'string' && fullTbName.length > 0) {
        document.getElementById('existed_dataset_radio').checked = false;
        document.getElementById('original_table_radio').checked = true;
        document.getElementById('existed_data_source').style.display = 'none';
        document.getElementById('original_table').style.display = 'block';

        document.getElementById('select2-chosen-1').innerHTML = '';
    }else {
        document.getElementById('existed_dataset_radio').checked = true;
        document.getElementById('original_table_radio').checked = false;
        document.getElementById('existed_data_source').style.display='block';
        document.getElementById('original_table').style.display='none';
    }
    renderOriginalTable(databaseId, fullTbName);
}

let exploreController = {
    type: 'slice',
    done: (sliceObj) => {
        slice = sliceObj;
        refreshPreviewData(slice);
        renderExploreActions(slice.viewSqlQuery);
        const cachedSelector = $('#is_cached');
        if (slice.data !== undefined && slice.data.is_cached) {
            cachedSelector
                .attr(
                    'title',
                    `Served from data cached at ${slice.data.cached_dttm}. Click [Query] to force refresh`)
                .show()
                .tooltip('fixTitle');
        } else {
            cachedSelector.hide();
        }
    },
    error: (sliceObj) => {
        slice = sliceObj;
        renderExploreActions(slice.viewSqlQuery);
    },
};
exploreController = Object.assign({}, utils.controllerInterface, exploreController);


$(document).ready(function () {
    loadIntlResources(callback, 'slice');

    function callback() {
        const data = $('.slice').data('slice');

        initExploreView();

        slice = px.Slice(data, exploreController, 'slice');
        slice.bindResizeToWindowResize();

        initComponents();
        initTitle();
        initDatasourceState();

        // call vis render method, which issues ajax
        // calls render on the slice for the first time
        if(operationType==='editSlice' && localStorage.getItem('explore:firstEntry') === 'true') {
            location.search!=='' && query(false, false);
        }else {
            document.getElementById('slice-loading-img').style.display = 'none';
        }
    }

    $('.nav > li:nth-child(3)').addClass('active');
});

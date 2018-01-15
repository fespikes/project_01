import ReactDOM, {render} from 'react-dom';
import React from 'react';
import {Alert, message} from 'antd';
import {LoadingModal} from '../javascripts/common/components';
import {MESSAGE_DURATION, always, json, callbackHandler} from '../javascripts/global.jsx';
import fetch from 'isomorphic-fetch';

import intl from "react-intl-universal";
import http from "axios";
import _ from "lodash";
import SUPPOER_LOCALES from '../javascripts/support_locales';

export const PILOT_PREFIX = '/p/';

export const OBJECT_TYPE = {
    DASHBOARD: 'dashboard',
    SLICE: 'slice',
    DATABASE: 'database',
    DATASET: 'dataset',
    HDFSCONNECTION: 'hdfsconnection'
};

export function renderLoadingModal() {
    const loadingModal = render(
        <LoadingModal />,
        document.getElementById('loading_root'));

    return loadingModal;
}

export function renderAlertTip(response, mountId, width='100%') {
    render(
        <Alert
            style={{ width: width }}
            type={response.type}
            message={response.message}
            closable={true}
            showIcon
        />,
        document.getElementById(mountId)
    );
    setTimeout(function() {
        if(document.getElementById(mountId)) {
            ReactDOM.unmountComponentAtNode(document.getElementById(mountId));
        }
    }, 5000);
}

export function renderAlertErrorInfo(description, mountId, width='100%', _this) {
    render(
        <Alert
            style={{width: width}}
            type='error'
            message={description}
            onClose={_this.closeAlert(mountId)}
            closable={true}
            showIcon
        />,
        document.getElementById(mountId)
    );
}

export function renderGlobalErrorMsg(errorMsg) {
    message.error(errorMsg, MESSAGE_DURATION);
}

export function getEleOffsetLeft(element) {
    if(element === null || element === undefined) {
        return 0;
    }
    var actualLeft = element.offsetLeft;
    var current = element.offsetParent;
    while (current !== null){
        actualLeft += current.offsetLeft;
        current = current.offsetParent;
    }
    return actualLeft;
}

export function getEleOffsetTop(element) {
    if(element === null || element === undefined) {
        return 0;
    }
    var actualTop = element.offsetTop;
    var current = element.offsetParent;
    while (current !== null){
        actualTop += current.offsetTop;
        current = current.offsetParent;
    }
    return actualTop;
}

export function getUrlParam(name, url) {
    let reg = new RegExp("[^\?&]?" + encodeURI(name) + "=[^&]+");
    let str = url.match(reg);
    if(str&&str.length > 0) {
        return str[0].substring(str[0].indexOf('=') + 1);
    }else {
        return '';
    }
}

export function getAjaxErrorMsg(error) {
    const respJSON = error.responseJSON;
    return (respJSON && respJSON.message) ? respJSON.message :
        error.responseText;
}

export function sortByInitials(a, b) {//add null check
    if((!a && !b) || (a && !b)) {
        return -1;
    } else if (!a && b) {
        return 1;
    }else {
        return a.charCodeAt(0) - b.charCodeAt(0);
    }
}

export function fetchDatabaseList(callback) {
    const url = window.location.origin + '/database/listdata/?page_size=1000';
    return fetch(url, {
        credentials: "same-origin"
    }).then(always).then(json).then(
        response => {
            callbackHandler(response, callback);
        }
    );
}

export function viewObjectDetail(url, callback) {
    return fetch(url, {
        credentials: "same-origin"
    })
    .then(res => res.json())
    .catch(error => {
        console.log('Error:', error);
    })
    .then(response => {
        if(!response) {
            callbackHandler({status: 200}, callback);
        }else {
            callbackHandler(response, callback);
        }
    });
}

//load intl resources at the very beginning or from cache
export function loadIntlResources(callback, path = `/static/assets/locales/`) {
    let currentLocale = intl.determineLocale({
        urlLocaleKey: "lang",
        cookieLocaleKey: "lang"
    });

    if (!_.find(SUPPOER_LOCALES, { value: currentLocale })) {
        currentLocale = "en-US";
    }

    //because in the project setting , front end source are only located under assets folder
    http.get(path + `${currentLocale}.json`)
        .then(res => {
            return intl.init({
                currentLocale,
                locales: {
                    [currentLocale]: res.data
                }
            });
        })
        .then(() => {
            // After loading CLDR locale data, start to render
            callback && callback();
        });
}
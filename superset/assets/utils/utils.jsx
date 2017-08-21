import ReactDOM, { render } from 'react-dom';
import React from 'react';
import { Alert } from 'antd';
import { LoadingModal } from '../javascripts/common/components';

export function renderLoadingModal() {
    const loadingModal = render(
        <LoadingModal />,
        document.getElementById('loading_root'));

    return loadingModal;
}

export function renderAlertTip(response, mountId) {
    render(
        <Alert
            style={{ width: 400 }}
            type={response.type}
            message={response.message}
            closable={true}
            showIcon
        />,
        document.getElementById(mountId)
    );
    setTimeout(function() {
        ReactDOM.unmountComponentAtNode(document.getElementById(mountId));
    }, 5000);
}

export function getDatabaseDefaultParams() {
    const defaultParams = {
        "connect_args": {
            "framed": 0,
            "hive": "Hive Server 2",
            "mech": "LDAP"
        }
    };
    return defaultParams;
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

export function getOnOfflineInfoUrl(id, moudleType, published) {
    let url = window.location.origin + '/' + moudleType;
    if(published) {
        url += '/offline_info/' + id;
    }else {
        url += '/online_info/' + id;
    }
    return url;
}
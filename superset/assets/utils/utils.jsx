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

export function addBodyClass(className) {
    let bodyEl = document.getElementById('pilot_body');
    bodyEl.setAttribute('class', className);
}

export function removeBodyClass(className) {
    let bodyEl = document.getElementById('pilot_body');
    bodyEl.removeAttribute('class', className);
}
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

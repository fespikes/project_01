import fetch from 'isomorphic-fetch';
import {always, json, callbackHandler} from '../global.jsx';

const prefix = window.location.origin + '/guardian/';

export function getGuardianUsers(callback) {
    const url = prefix + 'users/';
    return fetch(url, {
        credentials: "same-origin"
    }).then(always).then(json).then(
        response => {
            callbackHandler(response, callback);
        }
    );
}

export function getPermTypes(callback) {
    const url = prefix + 'permission/types/';
    return fetch(url, {
        credentials: "same-origin"
    }).then(always).then(json).then(
        response => {
            callbackHandler(response, callback);
        }
    );
}

export function searchPermissions(data, callback) {
    const url = prefix + 'permission/search/';
    return fetch(url, {
        credentials: "same-origin",
        method: "POST",
        body: JSON.stringify(data)
    }).then(always).then(json).then(
        response => {
            callbackHandler(response, callback);
        }
    );
}

export function grantPermission(data, callback) {
    const url = prefix + 'permission/grant/';
    return fetch(url, {
        credentials: "same-origin",
        method: "POST",
        body: JSON.stringify(data)
    }).then(always).then(json).then(
        response => {
            callbackHandler(response, callback);
        }
    );
}

export function revokePermission(data, callback) {
    const url = prefix + 'permission/revoke/';
    return fetch(url, {
        credentials: "same-origin",
        method: "POST",
        body: JSON.stringify(data)
    }).then(always).then(json).then(
        response => {
            callbackHandler(response, callback);
        }
    );
}



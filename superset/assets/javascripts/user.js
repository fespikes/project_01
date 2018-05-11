import React from 'react';
import { render } from 'react-dom';
import intl from "react-intl-universal";

const jQuery = window.jQuery = require('jquery'); // eslint-disable-line
import { renderLoadingModal, loadIntlResources } from '../utils/utils';
require('bootstrap');

import fetch from 'isomorphic-fetch';
import { replaceAppName } from '../utils/utils.jsx';
replaceAppName();
const _ = require('lodash');

class App extends React.Component {

    state = {
        username: '',
        login_count: '',
        last_login: '',
        initDone: false
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const me = this;
        const url = location.origin + '/present_user/show/';

        loadIntlResources(_ => this.setState({
            initDone: true
        }), 'profile');

        return fetch(url, {
            credentials: 'include',
            method: 'GET'
        })
            .then(response => response.json())
            .then(json => {

                if (json && json.data) {
                    const user = json.data;
                    me.setState({
                        username: user.username,
                        login_count: user.login_count,
                        last_login: user.last_login
                    })
                } else {
                    throw 'fetch user information failure!';
                }
            });
    }

    render() {

        const {username, login_count, last_login} = this.state;


        return (
            <div
            className="panel-group"
            style={{
            }}>
                <div className="panel panel-default">
                    <div className="panel-heading">
                        <h4 className="panel-title" style={{
                marginTop: '50px'
            }}>
                            {
            intl.get('INFORMATION')
            }<span className="caret"></span>
                        </h4>
                    </div>
                    
                    <div id="1_href" className="panel-collapse collapse in">
                        <div className="panel-body">
                            <div className="table-responsive">
                                <table className="table table-bordered"
            style={{
                margin: '20px auto',
                fontSize: '12px'
            }}>
                                    <tbody>
                                        <tr>
                                            <th className="col-lg-2 col-md-2 col-sm-2">{intl.get('USER_NAME')}</th>
                                            <td><span style={{
                whiteSpace: 'pre-line'
            }}>{username}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="col-lg-2 col-md-2 col-sm-2">{intl.get('LOGIN_TIMES')}</th>
                                            <td><span style={{
                whiteSpace: 'pre-line'
            }}>{login_count}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="col-lg-2 col-md-2 col-sm-2">{intl.get('LAST_TIME')}</th>
                                            <td><span style={{
                whiteSpace: 'pre-line'
            }}>{last_login}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel-group" id="2">
                    <div className="well well-sm">
                        <a href="/back" className="btn btn-sm btn-primary" data-toggle="tooltip" rel="tooltip" title="" data-original-title="{intl.get('GO_BACK')}">

                            <i className="fa fa-arrow-left"></i>
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}

render(<App />, document.getElementById('userInfo'));

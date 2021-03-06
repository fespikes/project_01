const $ = window.$ = require('jquery');
import React from 'react';
import { Button } from 'react-bootstrap';
import Select from 'react-select';
import intl from 'react-intl-universal';

import QueryTable from './QueryTable';
import { now, epochTimeXHoursAgo,
    epochTimeXDaysAgo, epochTimeXYearsAgo } from '../../modules/dates';
import { STATUS_OPTIONS, TIME_OPTIONS } from '../constants';
import AsyncSelect from '../../components/AsyncSelect';
import {PILOT_PREFIX} from '../../../utils/utils';

const propTypes = {
    actions: React.PropTypes.object.isRequired,
};

class QuerySearch extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            userLoading: false,
            userOptions: [],
            databaseId: null,
            userId: null,
            searchText: null,
            from: null,
            to: null,
            status: 'success',
            queriesArray: [],
            queriesLoading: true,
        };
    }
    componentDidMount() {
        this.refreshQueries();
    }
    onUserClicked(userId) {
        this.setState({ userId }, () => { this.refreshQueries(); });
    }
    onDbClicked(dbId) {
        this.setState({ databaseId: dbId }, () => { this.refreshQueries(); });
    }
    onChange(db) {
        const val = (db) ? db.value : null;
        this.setState({ databaseId: val });
    }
    getTimeFromSelection(selection) {
        switch (selection) {
            case 'now':
                return now();
            case '1 hour ago':
                return epochTimeXHoursAgo(1);
            case '1 day ago':
                return epochTimeXDaysAgo(1);
            case '7 days ago':
                return epochTimeXDaysAgo(7);
            case '28 days ago':
                return epochTimeXDaysAgo(28);
            case '90 days ago':
                return epochTimeXDaysAgo(90);
            case '1 year ago':
                return epochTimeXYearsAgo(1);
            default:
                return null;
        }
    }
    changeFrom(user) {
        const val = (user) ? user.value : null;
        this.setState({ from: val });
    }
    changeTo(status) {
        const val = (status) ? status.value : null;
        this.setState({ to: val });
    }
    changeUser(user) {
        const val = (user) ? user.value : null;
        this.setState({ userId: val });
    }
    insertParams(baseUrl, params) {
        const validParams = params.filter(
            function (p) { return p !== ''; }
        );
        return baseUrl + '?' + validParams.join('&');
    }
    changeStatus(status) {
        const val = (status) ? status.value : null;
        this.setState({ status: val });
    }
    changeSearch(event) {
        this.setState({ searchText: event.target.value });
    }
    userMutator(data) {
        const options = [];
        for (let i = 0; i < data.pks.length; i++) {
            options.push({ value: data.pks[i], label: data.result[i].username });
        }
        return options;
    }
    dbMutator(response) {
        try {
            const data = response.data.data;
            const options = data.map((db) => ({ value: db.id, label: db.database_name }));
            this.props.actions.setDatabases(data);
            if (data.length === 0) {
                this.props.actions.addAlert({
                    bsStyle: 'danger',
                    msg: intl.get('no_usable_db_connection'),
                });
            }
            return options;
        }catch (e) {
            console.log(e);
        }
    }
    refreshQueries() {
        this.setState({ queriesLoading: true });
        const params = [
            this.state.userId ? `user_id=${this.state.userId}` : '',
            this.state.databaseId ? `database_id=${this.state.databaseId}` : '',
            this.state.searchText ? `search_text=${this.state.searchText}` : '',
            this.state.status ? `status=${this.state.status}` : '',
            this.state.from ? `from=${this.getTimeFromSelection(this.state.from)}` : '',
            this.state.to ? `to=${this.getTimeFromSelection(this.state.to)}` : '',
        ];

        const url = this.insertParams(PILOT_PREFIX + 'search_queries', params);
        $.getJSON(url, (data, status) => {
            if (status === 'success') {
                this.setState({ queriesArray: data.data, queriesLoading: false });
            }
        });
    }
    render() {
        return (
            <div className="query-search-page">
                <div id="search-header">
                    <div className="page-title">
                        <span>{intl.get('execute_record')}</span>
                    </div>
                    <div className="select-user">
                        <AsyncSelect
                            dataEndpoint="/users/api/read"
                            mutator={this.userMutator}
                            value={this.state.userId}
                            onChange={this.changeUser.bind(this)}
                        />
                    </div>
                    <div className="select-database">
                        <AsyncSelect
                            onChange={this.onChange.bind(this)}
                            dataEndpoint="/database/listdata/?page_size=1000"
                            value={this.state.databaseId}
                            mutator={this.dbMutator.bind(this)}
                        />
                    </div>
                    <div className="search-result">
                        <input
                            type="text"
                            onChange={this.changeSearch.bind(this)}
                            className="form-control input-sm"
                            placeholder="Search Results"
                        />
                    </div>
                    <div className="select-from">
                        <Select
                            name="select-from"
                            placeholder="[From]-"
                            options={TIME_OPTIONS.slice(1, TIME_OPTIONS.length).map((t) => ({ value: t, label: t }))}
                            value={this.state.from}
                            autosize={false}
                            onChange={this.changeFrom.bind(this)}
                        />
                    </div>
                    <div className="select-to">
                        <Select
                            name="select-to"
                            placeholder="[To]-"
                            options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                            value={this.state.to}
                            autosize={false}
                            onChange={this.changeTo.bind(this)}
                        />
                    </div>
                    <div className="select-status">
                        <Select
                            name="select-status"
                            placeholder="[Query Status]"
                            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                            value={this.state.status}
                            isLoading={false}
                            autosize={false}
                            onChange={this.changeStatus.bind(this)}
                        />
                    </div>
                    <Button className="search-button" bsSize="small" bsStyle="primary" onClick={this.refreshQueries.bind(this)}>
                        <i className="fa fa-search" aria-hidden="true"></i>{intl.get('search')}
                    </Button>
                </div>
                {this.state.queriesLoading ?
                    (<img className="loading" alt="Loading..." src="/static/assets/images/loading.gif" />)
                    :
                    (
                        <div
                            style={{ height: this.props.height }}
                            className="scrollbar-container"
                        >
                            <div className="scrollbar-content">
                                <QueryTable
                                    columns={[
                                        intl.get('condition'), intl.get('connection'), 
                                        intl.get('users'), intl.get('start_time'),
                                        intl.get('progress'), intl.get('line_amount'), 
                                        'sql', intl.get('search_link')
                                    ]}
                                    onUserClicked={this.onUserClicked.bind(this)}
                                    onDbClicked={this.onDbClicked.bind(this)}
                                    queries={this.state.queriesArray}
                                    actions={this.props.actions}
                                />
                            </div>
                        </div>
                    )
                }
            </div>
        );
    }
}
QuerySearch.propTypes = propTypes;
export default QuerySearch;

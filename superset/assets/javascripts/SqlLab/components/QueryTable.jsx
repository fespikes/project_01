import React from 'react';
import intl from 'react-intl-universal';

import moment from 'moment';
import { Table } from 'reactable';
import { Label, ProgressBar, Well } from 'react-bootstrap';
import Link from './Link';
import VisualizeModal from './VisualizeModal';
import ResultSet from './ResultSet';
import ModalTrigger from '../../components/ModalTrigger';
import HighlightedSql from './HighlightedSql';
import { STATE_BSSTYLE_MAP } from '../constants';
import { fDuration } from '../../modules/dates';
import { getLink } from '../../../utils/common';

const propTypes = {
    columns: React.PropTypes.array,
    actions: React.PropTypes.object,
    queries: React.PropTypes.array,
    onUserClicked: React.PropTypes.func,
    onDbClicked: React.PropTypes.func,
};
const defaultProps = {
    columns: [intl.get('started'), intl.get('duration'), intl.get('line_amount')],
    queries: [],
    onUserClicked: () => {},
    onDbClicked: () => {},
};


class QueryTable extends React.PureComponent {
    constructor(props) {
        super(props);
        const uri = window.location.toString();
        const cleanUri = uri.substring(0, uri.indexOf('#'));
        this.state = {
            cleanUri,
            showVisualizeModal: false,
            activeQuery: null,
        };
    }
    componentDidMount() {
        $ = window.$;
        $('tbody.reactable-pagination tr td').addClass('custom-pagination');
    }
    getQueryLink(dbId, sql) {
        const params = ['dbid=' + dbId, 'sql=' + sql, 'title=Untitled Query'];
        const link = getLink(this.state.cleanUri, params);
        return encodeURI(link);
    }
    hideVisualizeModal() {
        this.setState({ showVisualizeModal: false });
    }
    showVisualizeModal(query) {
        this.setState({ activeQuery: query, showVisualizeModal: true });
    }
    restoreSql(query) {
        this.props.actions.queryEditorSetSql({ id: query.sqlEditorId }, query.sql);
    }

    openQueryInNewTab(query) {
        this.props.actions.cloneQueryToNewTab(query);
    }
    openAsyncResults(query) {
        this.props.actions.fetchQueryResults(query);
    }
    clearQueryResults(query) {
        this.props.actions.clearQueryResults(query);
    }
    removeQuery(query) {
        this.props.actions.removeQuery(query);
    }
    render() {
        const data = this.props.queries.map((query) => {
            const q = Object.assign({}, query);
            if (q.endDttm) {
                q.用时 = fDuration(q.startDttm, q.endDttm);
            }
            const time = moment(q.startDttm).format().split('T');
            q.开始时间 = (
                <div>
                  <span>
                    {time[0]} <br /> {time[1]}
                  </span>
                </div>
            );
            q.用户 = (
                <span>{q.user}</span>
            );
            q.连接 = (
                <span>{q.db}</span>
            );
            q.开始 = moment(q.startDttm).format('HH:mm:ss');
            q.查询链接 = (
                <div style={{ width: '100px' }}>
                    <a
                        href={this.getQueryLink(q.dbId, q.sql)}
                        className="btn btn-primary btn-xs"
                    >
                        <i className="fa fa-external-link" />用SQL编辑器打开
                    </a>
                </div>
            );
            q.sql = (
                <Well>
                    <HighlightedSql sql={q.sql} rawSql={q.executedSql} shrink maxWidth={60} />
                </Well>
            );
            q.行数 = q.rows || 0;
            if (q.resultsKey) {
                q.数据库 = (
                    <ModalTrigger
                        bsSize="large"
                        className="ResultsModal"
                        triggerNode={(
                          <Label
                            bsStyle="info"
                            style={{ cursor: 'pointer' }}
                          >
                            view results
                          </Label>
                        )}
                        modalTitle={'Data preview'}
                        beforeOpen={this.openAsyncResults.bind(this, query)}
                        onExit={this.clearQueryResults.bind(this, query)}
                        modalBody={<ResultSet showSql query={query} actions={this.props.actions} />}
                    />
                );
            } else {
                // if query was run using ctas and force_ctas_schema was set
                // tempTable will have the schema
                const schemaUsed = q.ctas && q.tempTable.includes('.') ? '' : q.schema;
                q.数据库 = [schemaUsed, q.tempTable].filter((v) => (v)).join('.');
            }
            q.进度 = (
                <ProgressBar
                    style={{ width: '75px' }}
                    striped
                    now={q.progress}
                    label={`${q.progress}%`}
                />
            );
            let errorTooltip;
            if (q.errorMessage) {
                errorTooltip = (
                    <Link tooltip={q.errorMessage}>
                        <i className="fa fa-exclamation-circle text-danger" />
                    </Link>
                );
            }
            q.状态 = (
                <div>
                  <span className={'m-r-3 label label-' + STATE_BSSTYLE_MAP[q.state]}>
                    {q.state}
                  </span>
                  {errorTooltip}
                </div>
            );
            q.操作 = (
                <div style={{ width: '75px' }}>
                    <Link
                        className="fa fa-bar-chart m-r-3"
                        tooltip="可视化本次查询的数据"
                        onClick={this.showVisualizeModal.bind(this, query)}
                    />
                    <Link
                        className="fa fa-plus m-r-3"
                        onClick={this.openQueryInNewTab.bind(this, query)}
                        tooltip="在新的标签中执行查询"
                        placement="top"
                    />
                    <Link
                        className="fa fa-pencil-square-o m-r-3"
                        onClick={this.restoreSql.bind(this, query)}
                        tooltip="用该查询sql覆盖编辑框中的sql"
                        placement="top"
                    />
                    <Link
                        className="fa fa-trash m-r-3"
                        tooltip="从日志中移除本次查询"
                        onClick={this.removeQuery.bind(this, query)}
                    />
                </div>
            );
            return q;
        }).reverse();
        return (
            <div className="QueryTable">
                <VisualizeModal
                    show={this.state.showVisualizeModal}
                    query={this.state.activeQuery}
                    onHide={this.hideVisualizeModal.bind(this)}
                />
                <Table
                    columns={this.props.columns}
                    className="table table-condensed"
                    data={data}
                    itemsPerPage={30}
                    pageButtonLimit={6}
                />
            </div>
        );
    }
}
QueryTable.propTypes = propTypes;
QueryTable.defaultProps = defaultProps;

export default QueryTable;

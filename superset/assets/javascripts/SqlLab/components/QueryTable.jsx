import React from 'react';

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
  columns: ['started', 'duration', 'rows'],
  queries: [],
  onUserClicked: () => {},
  onDbClicked: () => {},
};


class QueryTable extends React.PureComponent {
  constructor(props) {
    super(props);

    this.clearQueryResults = this.clearQueryResults.bind(this);
    this.props.onUserClicked = this.props.onUserClicked.bind(this);
    this.props.onDbClicked = this.props.onDbClicked.bind(this);
    this.openAsyncResults = this.openAsyncResults.bind(this);
    this.showVisualizeModal = this.showVisualizeModal.bind(this);
    this.openQueryInNewTab = this.openQueryInNewTab.bind(this);
    this.restoreSql = this.restoreSql.bind(this);
    this.removeQuery = this.removeQuery.bind(this);
    this.hideVisualizeModal = this.hideVisualizeModal.bind(this);

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
        q.duration = fDuration(q.startDttm, q.endDttm);
      }
      const time = moment(q.startDttm).format().split('T');
      q.time = (
        <div>
          <span>
            {time[0]} <br /> {time[1]}
          </span>
        </div>
      );
      q.user = (
        <button
          className="btn btn-link btn-xs"
          onClick={this.props.onUserClicked(q.userId)}
        >
          {q.user}
        </button>
      );
      q.db = (
        <button
          className="btn btn-link btn-xs"
          onClick={this.props.onDbClicked(q.dbId)}
        >
          {q.db}
        </button>
      );
      q.started = moment(q.startDttm).format('HH:mm:ss');
      q.querylink = (
        <div style={{ width: '100px' }}>
          <a
            href={this.getQueryLink(q.dbId, q.sql)}
            className="btn btn-primary btn-xs"
          >
            <i className="fa fa-external-link" />Open in SQL Editor
          </a>
        </div>
      );
      q.sql = (
        <Well>
          <HighlightedSql sql={q.sql} rawSql={q.executedSql} shrink maxWidth={60} />
        </Well>
      );
      if (q.resultsKey) {
        q.output = (
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
            beforeOpen={(query) => this.openAsyncResults(query)}
            onExit={(query) => this.clearQueryResults(query)}
            modalBody={<ResultSet showSql query={query} actions={this.props.actions} />}
          />
        );
      } else {
        // if query was run using ctas and force_ctas_schema was set
        // tempTable will have the schema
        const schemaUsed = q.ctas && q.tempTable.includes('.') ? '' : q.schema;
        q.output = [schemaUsed, q.tempTable].filter((v) => (v)).join('.');
      }
      q.progress = (
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
      q.state = (
        <div>
          <span className={'m-r-3 label label-' + STATE_BSSTYLE_MAP[q.state]}>
            {q.state.substr(0, 1).toUpperCase() + q.state.substr(1)}
          </span>
          {errorTooltip}
        </div>
      );
      q.actions = (
        <div>
          <Link
            className="fa fa-bar-chart m-r-3"
            tooltip="Visualize the data out of this query"
            onClick={(query) => this.showVisualizeModal(query)}
          />
          <Link
            className="fa fa-plus m-r-3"
            onClick={(query) => this.openQueryInNewTab(query)}
            tooltip="Run query in a new tab"
            placement="top"
          />
          <Link
            className="fa fa-pencil-square-o m-r-3"
            onClick={(query) => this.restoreSql(query)}
            tooltip="Overwrite text in editor with a query on this table"
            placement="top"
          />
          <Link
            className="fa fa-trash m-r-3"
            tooltip="Remove query from log"
            onClick={(query) => this.removeQuery(query)}
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
          onHide={this.hideVisualizeModal}
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

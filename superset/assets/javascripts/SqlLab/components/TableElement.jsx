import React from 'react';

import { ButtonGroup, Collapse, Well } from 'react-bootstrap';
import shortid from 'shortid';

import CopyToClipboard from '../../components/CopyToClipboard';
import Link from './Link';
import ColumnElement from './ColumnElement';
import ModalTrigger from '../../components/ModalTrigger';

const propTypes = {
  table: React.PropTypes.object,
  actions: React.PropTypes.object,
  timeout: React.PropTypes.number,  // used for tests
};

const defaultProps = {
  actions: {},
  table: null,
  timeout: 500,
};

class TableElement extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      sortColumns: false,
      expanded: true,
    };
  }

  popSelectStar() {
    const qe = {
      id: shortid.generate(),
      title: this.props.table.name,
      dbId: this.props.table.dbId,
      autorun: true,
      sql: this.props.table.selectStar,
    };
    this.props.actions.addQueryEditor(qe);
  }

  toggleTable(e) {
    e.preventDefault();
    if (this.props.table.expanded) {
      this.props.actions.collapseTable(this.props.table);
    } else {
      this.props.actions.expandTable(this.props.table);
    }
  }

  removeTable() {
    this.setState({ expanded: false });
    this.props.actions.removeDataPreview(this.props.table);
  }
  toggleSortColumns() {
    this.setState({ sortColumns: !this.state.sortColumns });
  }

  renderHeader() {
    const table = this.props.table;
    let header;
    if (table.partitions) {
      let partitionQuery;
      let partitionClipBoard;
      if (table.partitions.partitionQuery) {
        partitionQuery = table.partitions.partitionQuery;
        const tt = '复制到粘贴板';
        partitionClipBoard = (
          <CopyToClipboard
            text={partitionQuery}
            shouldShowText={false}
            tooltipText={tt}
            copyNode={<i className="fa fa-clipboard" />}
          />
        );
      }
      let latest = [];
      for (const k in table.partitions.latest) {
        latest.push(`${k}=${table.partitions.latest[k]}`);
      }
      latest = latest.join('/');
      header = (
        <Well bsSize="small">
          <div>
            <small>
              latest partition: {latest}
            </small> {partitionClipBoard}
          </div>
        </Well>
      );
    }
    return header;
  }
  renderMetadata() {
    const table = this.props.table;
    let cols;
    if (table.columns) {
      cols = table.columns.slice();
      if (this.state.sortColumns) {
        cols.sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase());
      }
    }
    const metadata = (
      <Collapse
        in={table.expanded}
        timeout={this.props.timeout}
      >
        <div>
          {this.renderHeader()}
          <div className="table-columns">
            {cols && cols.map(col => (
              <ColumnElement column={col} key={col.name} />
            ))}
            <hr />
          </div>
        </div>
      </Collapse>
    );
    return metadata;
  }
  removeFromStore() {
    this.props.actions.removeTable(this.props.table);
  }

  render() {
    const table = this.props.table;
    let keyLink;
    const tbIndexed = table.indexes && table.indexes.length > 0;
    if (tbIndexed) {
      keyLink = (
        <ModalTrigger
          modalTitle={
            <div>
              表 <strong>{table.name}</strong> 的主键
            </div>
          }
          modalBody={table.indexes.map((ix, i) => (
            <pre key={i}>{JSON.stringify(ix, null, '  ')}</pre>
          ))}
          triggerNode={
            <Link
              className="fa fa-key pull-left m-l-2"
              tooltip={`查看主键长度 (${table.indexes.length})`}
            />
          }
        />
      );
    }
    return (
      <Collapse
        in={this.state.expanded}
        timeout={this.props.timeout}
        transitionAppear
        onExited={this.removeFromStore.bind(this)}
      >
        <div className="TableElement">
          <div className="table-element-title">
            <div className="table-name-title">
              <a
                href="#"
                className="table-name"
                onClick={(e) => { this.toggleTable(e); }}
              >
                <strong>{table.name}</strong>
                <small className="m-l-5">
                  <i className={`fa fa-chevron-${table.expanded ? 'up' : 'down'}`} />
                </small>
              </a>
            </div>
            <div
                className="operation-bar"
                style={{minWidth: tbIndexed?114:86}}
            >
              <ButtonGroup className="ws-el-controls">
                {keyLink}
                <Link
                  className={
                    `fa fa-sort-${!this.state.sortColumns ? 'alpha' : 'numeric'}-asc ` +
                    'pull-left sort-cols m-l-2'}
                  onClick={this.toggleSortColumns.bind(this)}
                  tooltip={"排序"}
                  href="#"
                />
                {table.selectStar &&
                  <CopyToClipboard
                    copyNode={
                      <a className="fa fa-clipboard pull-left m-l-2" />
                    }
                    text={table.selectStar}
                    shouldShowText={false}
                    tooltipText="复制到粘贴板"
                  />
                }
                <Link
                  className="fa fa-trash table-remove pull-left m-l-2"
                  onClick={this.removeTable.bind(this)}
                  tooltip="删除"
                  href="#"
                />
              </ButtonGroup>
            </div>
          </div>
          <div>
            {this.renderMetadata()}
          </div>
        </div>
      </Collapse>
    );
  }
}
TableElement.propTypes = propTypes;
TableElement.defaultProps = defaultProps;

export default TableElement;

const $ = window.$ = require('jquery');
import React from 'react';
import Select from 'react-select';
import { Label, Button } from 'react-bootstrap';
import TableElement from './TableElement';
import AsyncSelect from '../../components/AsyncSelect';

const propTypes = {
  queryEditor: React.PropTypes.object.isRequired,
  tables: React.PropTypes.array,
  actions: React.PropTypes.object,
  networkOn: React.PropTypes.bool,
};

const defaultProps = {
  tables: [],
  networkOn: true,
  actions: {},
};

class SqlEditorLeftBar extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      schemaLoading: false,
      schemaOptions: [],
      tableLoading: false,
      tableOptions: [],
      networkOn: true,
    };
  }
  componentWillMount() {
    this.fetchSchemas();
    this.fetchTables();
  }
  onChange(db) {
    const val = (db) ? db.value : null;
    this.setState({ schemaOptions: [] });
    this.props.actions.queryEditorSetDb(this.props.queryEditor, val);
    if (!(db)) {
      this.setState({ tableOptions: [] });
    } else {
      this.fetchTables(val, this.props.queryEditor.schema);
      this.fetchSchemas(val);
    }
  }
  dbMutator(data) {
    data = data.data;
    const options = data.map((db) => ({ value: db.id, label: db.database_name }));
    this.props.actions.setDatabases(data);
    if (data.length === 0) {
      this.props.actions.addAlert({
        bsStyle: 'danger',
        msg: "没有权限访问数据库",
      });
    }
    return options;
  }
  resetState() {
    this.props.actions.resetState();
  }
  fetchTables(dbId, schema) {
    const actualDbId = dbId || this.props.queryEditor.dbId;
    if (actualDbId) {
      const actualSchema = schema || this.props.queryEditor.schema;
      this.setState({ tableLoading: true });
      this.setState({ tableOptions: [] });
      const url = `/table/tables/${actualDbId}/${actualSchema}`;
      $.get(url, (data) => {
        data = data.data;
        let tableOptions = data.map((s) => ({ value: s, label: s }));
        const views = data.map((s) => ({ value: s, label: '[view] ' + s }));
        tableOptions = [...tableOptions, ...views];
        this.setState({ tableOptions });
        this.setState({ tableLoading: false });
      });
    }
  }
  changeSchema(schemaOpt) {
    const schema = (schemaOpt) ? schemaOpt.value : null;
    this.props.actions.queryEditorSetSchema(this.props.queryEditor, schema);
    this.fetchTables(this.props.queryEditor.dbId, schema);
  }
  fetchSchemas(dbId) {
    const actualDbId = dbId || this.props.queryEditor.dbId;
    if (actualDbId) {
      this.setState({ schemaLoading: true });
      const url = `/table/schemas/${actualDbId}`;
      $.get(url, (data) => {
        const schemas = data.data;
        const schemaOptions = schemas.map((s) => ({ value: s, label: s }));
        this.setState({ schemaOptions });
        this.setState({ schemaLoading: false });
      });
    }
  }
  closePopover(ref) {
    this.refs[ref].hide();
  }
  changeTable(tableOpt) {
    const tableName = tableOpt.value;
    const qe = this.props.queryEditor;

    this.setState({ tableLoading: true });
    this.props.actions.addTable(qe, tableName);
    this.setState({ tableLoading: false });
  }
  render() {
    let networkAlert = null;
    if (!this.props.networkOn) {
      networkAlert = <p><Label bsStyle="danger">OFFLINE</Label></p>;
    }
    const shouldShowReset = window.location.search === '?reset=1';
    return (
      <div className="scrollbar-container">
        <div className="clearfix sql-toolbar scrollbar-content">
          {networkAlert}
          <div>
            <div className="select-title">连接</div>
            <AsyncSelect
              dataEndpoint="/table/databases"
              onChange={this.onChange.bind(this)}
              value={this.props.queryEditor.dbId}
              valueRenderer={(o) => (
                <div>
                {o.label}
                </div>
              )}
              mutator={this.dbMutator.bind(this)}
              placeholder=""
            />
          </div>
          <div className="m-t-5">
            <div className="select-title">数据库 ({this.state.schemaOptions.length})</div>
            <Select
              name="select-schema"
              placeholder={`(${this.state.schemaOptions.length})`}
              options={this.state.schemaOptions}
              value={this.props.queryEditor.schema}
              valueRenderer={(o) => (
                <div>
                  {o.label}
                </div>
              )}
              isLoading={this.state.schemaLoading}
              autosize={false}
              onChange={this.changeSchema.bind(this)}
            />
          </div>
          <div className="m-t-5">
            <div className="select-title">表 ({this.state.tableOptions.length})</div>
            <Select
              name="select-table"
              ref="selectTable"
              isLoading={this.state.tableLoading}
              placeholder={` `}
              autosize={false}
              onChange={this.changeTable.bind(this)}
              options={this.state.tableOptions}
            />
          </div>
          <hr />
          <div className="m-t-5 table-elements">
            {this.props.tables.map((table) => (
              <TableElement
                table={table}
                key={table.id}
                actions={this.props.actions}
              />
            ))}
          </div>
          {shouldShowReset &&
            <Button bsSize="small" bsStyle="danger" onClick={this.resetState.bind(this)}>
              <i className="fa fa-bomb" /> 重置状态
            </Button>
          }
        </div>
      </div>
    );
  }
}
SqlEditorLeftBar.propTypes = propTypes;
SqlEditorLeftBar.defaultProps = defaultProps;

export default SqlEditorLeftBar;

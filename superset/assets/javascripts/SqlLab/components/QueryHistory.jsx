import React from 'react';
import intl from 'react-intl-universal';

import QueryTable from './QueryTable';
import { Alert } from 'react-bootstrap';

const propTypes = {
  queries: React.PropTypes.array.isRequired,
  actions: React.PropTypes.object.isRequired,
};

const QueryHistory = (props) => {
  if (props.queries.length > 0) {
    return (
      <QueryTable
        columns={[
          intl.get('condition'), intl.get('start_time'), 
          intl.get('used_time'), intl.get('progress'),
          intl.get('line_amount'), 'sql',
          intl.get('database'), intl.get('action')
        ]}
        queries={props.queries}
        actions={props.actions}
      />
    );
  }
  return (
    <Alert bsStyle="info">
      No query history yet...
    </Alert>
  );
};
QueryHistory.propTypes = propTypes;

export default QueryHistory;

import React from 'react';

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
          '状态', '开始时间', '用时', '进度',
          '行数', 'sql', '数据库', '操作',
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

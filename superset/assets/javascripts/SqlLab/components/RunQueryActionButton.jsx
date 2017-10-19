import React, { PropTypes } from 'react';
import Button from '../../components/Button';

const propTypes = {
  allowAsync: PropTypes.bool.isRequired,
  dbId: PropTypes.number.isRequired,
  queryState: PropTypes.string.isRequired,
  runQuery: PropTypes.func.isRequired,
  selectedText: PropTypes.string,
  stopQuery: PropTypes.func.isRequired,
};

export default function RunQueryActionButton(props) {
  const runBtnText = props.selectedText ? '执行选择的查询' : '执行查询';
  const btnStyle = props.selectedText ? 'warning' : 'primary';
  const shouldShowStopBtn = ['running', 'pending'].indexOf(props.queryState) > -1;
  const asyncToolTip = '异步执行查询';

  const commonBtnProps = {
    bsSize: 'small',
    bsStyle: btnStyle,
    disabled: !(props.dbId),
  };

  const syncBtn = (
    <div className="sync-btn query-btn">
      <Button
        {...commonBtnProps}
        onClick={() => props.runQuery(false)}
        key="run-btn"
      >
        <i className="fa fa-table" /> {runBtnText}
      </Button>
    </div>
  );

  const asyncBtn = (
    <div className="async-btn query-btn">
      <Button
        {...commonBtnProps}
        onClick={() => props.runQuery(true)}
        key="run-async-btn"
      >
        <i className="fa fa-table" /> {runBtnText}
      </Button>
    </div>
  );

  const stopBtn = (
    <div className="stop-btn query-btn">
      <Button
        {...commonBtnProps}
        onClick={props.stopQuery}
      >
        <i className="fa fa-stop" /> Stop
      </Button>
    </div>
  );

  let button;
  if (shouldShowStopBtn) {
    button = stopBtn;
  } else if (props.allowAsync) {
    button = asyncBtn;
  } else {
    button = syncBtn;
  }

  return (
    <div className="inline m-r-5">
      {button}
    </div>
  );
}

RunQueryActionButton.propTypes = propTypes;

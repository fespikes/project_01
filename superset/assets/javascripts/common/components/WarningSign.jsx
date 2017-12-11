import React from 'react';
import PropTypes from 'prop-types';

const WarningSign = ({}) => {
  return (
      <div className="warning-sign">
          <div className="symbol">
              <div className="vertical-line"></div>
              <div className="dot"></div>
          </div>
      </div>
  );
};

WarningSign.propTypes = {};

export default WarningSign;
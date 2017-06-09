import React, { PropTypes } from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';
import { slugify } from '../modules/utils';
import { Tooltip } from 'antd';

const propTypes = {
  tooltip: PropTypes.node,
  placement: PropTypes.string,
};
const defaultProps = {
  bsSize: 'sm',
  placement: 'top',
};

export default function Button(props) {
  const buttonProps = Object.assign({}, props);
  const placement = props.placement;
  delete buttonProps.tooltip;
  delete buttonProps.placement;

  let button = (
    <BootstrapButton {...buttonProps} >
      {props.children}
    </BootstrapButton>
  );
  if (props.tooltip) {
    button = (
      <Tooltip title={props.tooltip} placement={placement}>
        {button}
      </Tooltip>
    );
  }
  return button;
}

Button.propTypes = propTypes;
Button.defaultProps = defaultProps;

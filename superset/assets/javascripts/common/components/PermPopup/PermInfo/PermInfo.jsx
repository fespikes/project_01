import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'antd';

import './PermInfo.scss';

const PermInfo = ({infos}) => {
    const permInfos = infos.map((info, index) => {
        return <Tooltip placement="topLeft" title={info}>
                <pre key={index} className="info-item">{info}</pre>
            </Tooltip>
    });
    return (
        <div className="perm-info" >
            {permInfos}
        </div>
    );
};

PermInfo.propTypes = {};

export default PermInfo;
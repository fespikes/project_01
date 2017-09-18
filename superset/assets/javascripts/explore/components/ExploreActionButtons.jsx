import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import cx from 'classnames';
import URLShortLinkButton from './URLShortLinkButton';
import EmbedCodeButton from './EmbedCodeButton';
import DisplayQueryButton from './DisplayQueryButton';
import { Tooltip } from 'antd';

const propTypes = {
  canDownload: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
  slice: PropTypes.object.isRequired,
  query: PropTypes.string,
};

export default function ExploreActionButtons({ canDownload, slice, sliceId, query }) {
  const exportToCSVClasses = cx('btn btn-default btn-sm', {
    'disabled disabledButton': !canDownload,
  });
  return (
    <div className="btn-group results" role="group">
        <Tooltip title={'导出为.csv格式'} placement="bottom">
            <a
                href={slice.data.csv_endpoint}
                className={exportToCSVClasses}
                target="_blank"
            >
                <i className="fa fa-file-text-o"></i>.csv
            </a>
        </Tooltip>
        <DisplayQueryButton query={query} />
    </div>
  );
}

ExploreActionButtons.propTypes = propTypes;

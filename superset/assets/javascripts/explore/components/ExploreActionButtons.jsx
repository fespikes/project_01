import React, { PropTypes } from 'react';
import { render } from 'react-dom';
import cx from 'classnames';
import URLShortLinkButton from './URLShortLinkButton';
import EmbedCodeButton from './EmbedCodeButton';
import DisplayQueryButton from './DisplayQueryButton';
import SliceEdit from './SliceEdit';
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
  function editSlice() {
      $.ajax({
          type: 'GET',
          url: '/slice/show/' + sliceId,
          contentType: 'application/json',
          success(data) {
              let slice = JSON.parse(data);
              let editSlicePopup = render(
                  <SliceEdit
                      slice={slice}/>,
                  document.getElementById('popup_root'));
              if(editSlicePopup) {
                  editSlicePopup.showDialog();
              }
          },
          error(error) {

          }
      });
  }
  return (
    <div className="btn-group results" role="group">
        {/*
            <a className="btn btn-default btn-sm" onClick={() => editSlice()}>
                <i className="fa fa-edit"></i>
            </a>
            <URLShortLinkButton slice={slice} />
            <EmbedCodeButton slice={slice} />
            <a
                href={slice.data.json_endpoint}
                className="btn btn-default btn-sm"
                title="Export to .json"
                target="_blank"
            >
                <i className="fa fa-file-code-o"></i>.json
            </a>
        */}
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

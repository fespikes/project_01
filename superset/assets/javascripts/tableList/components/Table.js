import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { fetchStateChange, setSelectedRows, fetchSliceDelete, fetchSliceDetail } from '../actions';
import { SliceDelete, SliceEdit } from '../../components/popup';
import style from '../style/database.scss'

class SliceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.slice_name);
        });
        dispatch(setSelectedRows(selectedRowKeys, selectedRowNames));
    };

    render() {

        const { dispatch, data } = this.props;

        function editSlice(record) {
            dispatch(fetchSliceDetail(record.id, callback));
            function callback(success, data) {
                if(success) {
                    var editSlicePopup = render(
                        <SliceEdit
                            dispatch={dispatch}
                            sliceDetail={data}/>,
                        document.getElementById('popup_root'));
                    if(editSlicePopup) {
                        editSlicePopup.showDialog();
                    }
                }
            }
        }

        function deleteSlice(record) {

            let deleteTips = "确定删除" + record.slice_name + "?";
            let deleteSlicePopup = render(
                <SliceDelete
                    dispatch={dispatch}
                    deleteType={'single'}
                    deleteTips={deleteTips}
                    slice={record}/>,
                document.getElementById('popup_root'));
            if(deleteSlicePopup) {
                deleteSlicePopup.showDialog();
            }
        }

        function publishSlice(record) {
            dispatch(fetchStateChange(record, "publish"));
        }

        function favoriteSlice(record) {
            dispatch(fetchStateChange(record, "favorite"));
        }

        const rowSelection = {
            onChange: this.onSelectChange
        };

        const columns = [
            {
                width: '5%',
                render: (text, record) => {
                    const datasetType = record.dataset_type;
                    console.log(record);

                    return (
                        <i className={'icon ' + record.iconClass}
                           onClick={() => favoriteSlice(record)}></i>
                    )
                }
            },
            {
                title: '名称',  //TODO: title need to i18n
                key: 'datasetName',
                dataIndex: 'dataset_name',
                width: '30%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div className="entity-title highlight">
                                <a href={record.explore_url} target="_blank">{record.dataset_name}</a>
                            </div>
                            <div className="entity-description">{record.dataset_type} | {record.connection}</div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return a.dataset_name.substring(0, 1).charCodeAt() - b.dataset_name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '25%',
                sorter(a, b) {
                    return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
                }
            }, {
                title: '更新时间',
                dataIndex: 'changed_on',
                key: 'changed_on',
                width: '25%',
                sorter(a, b) {
                    return a.changed_on - b.changed_on ? 1 : -1;
                }
            }, {
                title: '操作',
                key: 'action',
                width: '15%',
                render: (record) => {
                    return (
                        <div className="icon-group">
                            <i className="icon" onClick={() => editSlice(record)}></i>&nbsp;
                            <i className={record.online ? 'icon online' : 'icon offline'}
                               onClick={() => publishSlice(record)}></i>&nbsp;
                            <i className="icon" onClick={() => deleteSlice(record)}></i>
                        </div>
                    )
                }
            }
        ];

        return (
            <Table
                rowSelection={rowSelection}
                dataSource={data}
                columns={columns}
                pagination={false}
                rowKey={record => record.id}
            />
        );
    }
}

export default SliceTable;
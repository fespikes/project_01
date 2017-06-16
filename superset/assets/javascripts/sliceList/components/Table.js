import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { fetchStateChange, setSelectedRows, fetchSliceDelete, fetchSliceDetail } from '../actions';
import { SliceDelete, SliceEdit } from '../../components/popup';

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

        const { dispatch, sliceList } = this.props;

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
                title: '',
                dataIndex: 'favorite',
                key: 'favorite',
                width: '5%',
                render: (text, record) => {
                    return (
                        <i className={record.favorite ? 'icon icon-star-fav' : 'icon icon-star'}
                           onClick={() => favoriteSlice(record)}></i>
                    )
                }
            },
            {
                title: '名称',  //TODO: title need to i18n
                key: 'slice_name',
                dataIndex: 'slice_name',
                width: '20%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div className="entity-title highlight">
                                <a href={record.slice_url}>{record.slice_name}</a>
                            </div>
                            <div className="entity-description">{record.description}</div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return a.slice_name.substring(0, 1).charCodeAt() - b.slice_name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '图标类型',
                dataIndex: 'viz_type',
                key: 'viz_type',
                width: '10%',
                sorter(a, b) {
                    return a.viz_type.substring(0, 1).charCodeAt() - b.viz_type.substring(0, 1).charCodeAt();
                }

            }, {
                title: '数据集',
                dataIndex: 'datasource',
                key: 'datasource',
                width: '15%',
                render: (text, record) => {
                    return (
                        <a href={record.explore_url} className="highlight">{record.datasource}</a>
                    )
                },
                sorter(a, b) {
                    return a.datasource.substring(0, 1).charCodeAt() - b.datasource.substring(0, 1).charCodeAt();
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '10%',
                sorter(a, b) {
                    return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
                }
            }, {
                title: '发布状态',
                dataIndex: 'online',
                key: 'online',
                width: '10%',
                sorter: (a, b) => a.online - b.online,
                render: (text, record) => {
                    return (
                        <span className="entity-publish">{record.online ? "已发布" : "未发布"}</span>
                    )
                }
            }, {
                title: '最后修改时间',
                dataIndex: 'changed_on',
                key: 'changed_on',
                width: '15%',
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
                            <i className="icon icon-edit" onClick={() => editSlice(record)}></i>&nbsp;
                            <i className={record.online ? 'icon icon-online' : 'icon icon-offline'}
                               onClick={() => publishSlice(record)}></i>&nbsp;
                            <i className="icon icon-delete" onClick={() => deleteSlice(record)}></i>
                        </div>
                    )
                }
            }
        ];

        return (
            <Table
                rowSelection={rowSelection}
                dataSource={sliceList}
                columns={columns}
                pagination={false}
                rowKey={record => record.id}
            />
        );
    }
}

export default SliceTable;
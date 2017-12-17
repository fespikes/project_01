import React from 'react';
import {render} from 'react-dom';
import {message, Table, Icon, Tooltip} from 'antd';
import PropTypes from 'prop-types';
import {
    fetchStateChange, setSelectedRows, fetchSliceDelete, fetchSliceDetail,
    fetchOnOfflineInfo, fetchSliceDelInfo
} from '../actions';
import {SliceDelete, SliceEdit} from '../popup';
import {ConfirmModal} from '../../common/components';
import {sortByInitials, renderGlobalErrorMsg} from '../../../utils/utils.jsx';

class SliceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.editSlice = this.editSlice.bind(this);
        this.deleteSlice = this.deleteSlice.bind(this);
        this.publishSlice = this.publishSlice.bind(this);
        this.favoriteSlice = this.favoriteSlice.bind(this);
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        const { dispatch } = this.props;
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.slice_name);
        });
        dispatch(setSelectedRows(selectedRowKeys, selectedRowNames));
    };

    editSlice(record) {
        const { dispatch } = this.props;
        dispatch(fetchSliceDetail(record.id, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <SliceEdit
                        dispatch={dispatch}
                        sliceDetail={data}
                    />,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    deleteSlice(record) {
        const { dispatch } = this.props;
        dispatch(fetchSliceDelInfo(record.id, callback));
        function callback(success, data) {
            if(success) {
                const deleteTips = data;
                render(
                    <SliceDelete
                        dispatch={dispatch}
                        deleteType={'single'}
                        deleteTips={deleteTips}
                        slice={record}
                    />,
                    document.getElementById('popup_root')
                );
            }else {
                renderGlobalErrorMsg(data);
            }
        }
    }

    publishSlice(record) {
        const { dispatch } = this.props;
        const self = this;
        dispatch(fetchOnOfflineInfo(record.id, record.online, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <ConfirmModal
                        dispatch={dispatch}
                        record={record}
                        needCallback={true}
                        confirmCallback={self.onOfflineSlice}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    onOfflineSlice() {
        const {dispatch, record} = this;
        dispatch(fetchStateChange(record, callback, "publish"));
        function callback(success, data) {
            if(!success) {
                render(
                    <ConfirmModal
                        needCallback={false}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    favoriteSlice(record) {
        const { dispatch } = this.props;
        dispatch(fetchStateChange(record, undefined, "favorite"));
    }

    sliceDetail(url) {
        localStorage.setItem('explore:firstEntry', 'true');
        window.location = url;
    }

    render() {

        const { sliceList, selectedRowKeys, loading } = this.props;

        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange
        };

        const columns = [
            {
                title: '',
                dataIndex: 'favorite',
                key: 'favorite',
                width: '2%',
                render: (text, record) => {
                    return (
                        <i className={record.favorite ? 'icon icon-star-fav' : 'icon icon-star'}
                           onClick={() => this.favoriteSlice(record)}/>
                    )
                }
            },
            {
                title: '名称',  //TODO: title need to i18n
                key: 'slice_name',
                dataIndex: 'slice_name',
                width: '25%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div
                                className="entity-title highlight text-overflow-style"
                                style={{maxWidth: 270}}
                            >
                                <a onClick={argus => this.sliceDetail(record.slice_url)}>{record.slice_name}</a>
                            </div>
                            <div
                                className="entity-description text-overflow-style"
                                style={{maxWidth: 270}}
                            >
                                {record.description}
                            </div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return sortByInitials(a.description, b.description);
                }
            }, {
                title: '图表类型',
                dataIndex: 'viz_type',
                key: 'viz_type',
                width: '13%',
                render: (text, record) => {
                    return (
                        <div
                            className="text-overflow-style"
                            style={{maxWidth: 140}}
                            >
                            {record.viz_type}
                        </div>
                    )
                },
                sorter(a, b) {
                    return sortByInitials(a.viz_type, b.viz_type);
                }

            }, {
                title: '数据集',
                dataIndex: 'datasource',
                key: 'datasource',
                width: '15%',
                render: (text, record) => {
                    return (
                        <a
                            href={record.explore_url}
                            className="highlight text-overflow-style"
                            style={{maxWidth: 160, display: 'inline-block'}}
                        >
                            {record.datasource}
                        </a>
                    )
                },
                sorter(a, b) {
                    return sortByInitials(a.datasource, b.datasource);
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '10%',
                render: (text, record) => {
                    return (
                        <div
                            className="text-overflow-style"
                            style={{maxWidth: 110}}
                        >
                            {record.created_by_user}
                        </div>
                    )
                },
                sorter(a, b) {
                    return sortByInitials(a.created_by_user, b.created_by_user);
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
                width: '10%',
                render: (record) => {
                    return (
                        <div className="icon-group">
                            <Tooltip placement="top" title="编辑" arrowPointAtCenter>
                                <i
                                    className="icon icon-edit"
                                    onClick={() => this.editSlice(record)}
                                />
                            </Tooltip>
                            <Tooltip placement="top" title={record.online?'下线':'发布'} arrowPointAtCenter>
                                <i
                                    className={record.online ? 'icon icon-online icon-line' : 'icon icon-offline icon-line'}
                                    onClick={() => this.publishSlice(record)}
                                />
                            </Tooltip>
                            <Tooltip placement="top" title="删除" arrowPointAtCenter>
                                <i
                                    className="icon icon-delete"
                                    onClick={() => this.deleteSlice(record)}
                                />
                            </Tooltip>
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
                loading={loading}
                rowKey={record => record.id}
            />
        );
    }
}

export default SliceTable;
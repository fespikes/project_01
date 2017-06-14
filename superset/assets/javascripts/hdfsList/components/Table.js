import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import PropTypes from 'prop-types';
import { fetchStateChange, setSelectedRows, fetchSliceDelete, fetchSliceDetail } from '../actions';
import { SliceDelete, SliceEdit } from '../../components/popup';
import style from '../style/hdfs.scss'



const getData = (length) => {
    length = length||12;
    let arr = [];
    for( let i=length; i--;) {
        arr.push({
            key: i,
            name: 'rowId'+i,
            size: 'size'+i,
            user: 'user'+i,
            group: 'group'+i,
            permission: 'permission'+i,
            date: 'date'+i
        });
    }
    return arr;
};

const data = getData();

class SliceTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data
        };
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
                width: '10%',
                render: (text, record) => {
                    const datasetType = record.dataset_type;
                    return (
                        <i className={'icon ' + record.iconClass}
                           onClick={() => favoriteSlice(record)}></i>
                    )
                }
            },
            {
                title: '名称',  //TODO: title need to i18n
                key: 'name',
                dataIndex: 'name',
                width: '15%',
                sorter(a, b) {
                    return a.dataset_name.substring(0, 1).charCodeAt() - b.dataset_name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                width: '15%',
                sorter(a, b) {
                    return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
                }
            }, {
                title: '用户',
                dataIndex: 'user',
                key: 'user',
                width: '15%',
                sorter(a, b) {
                    return a.changed_on - b.changed_on ? 1 : -1;
                }
            }, {
               title: '组',
               dataIndex: 'group',
               key: 'group',
               width: '15%',
               sorter(a, b) {
                   return a.changed_on - b.changed_on ? 1 : -1;
               }
            }, {
               title: '权限',
               dataIndex: 'permission',
               key: 'permission',
               width: '10%',
               sorter(a, b) {
                   return a.changed_on - b.changed_on ? 1 : -1;
               }
            }, {
               title: '日期',
               dataIndex: 'date',
               key: 'date',
               width: '15%',
               sorter(a, b) {
                   return a.changed_on - b.changed_on ? 1 : -1;
               }
           },{
                title: '操作',
                width: '10%',
                render: (record) => {
                    return (
                        <div className="icon-group">
                            <i className="icon" ></i>
                            &nbsp;&nbsp;
                            <i className="icon " onClick={() => deleteSlice(record)}></i>
                        </div>
                    )
                }
            }
        ];

        return (
            <Table
                rowSelection={rowSelection}
                dataSource={this.state.data}
                columns={columns}
                pagination={false}
                rowKey={record => record.key}
            />
        );
    }
}

export default SliceTable;
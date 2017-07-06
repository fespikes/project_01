import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { fetchStateChange, setSelectedRows, fetchSliceDelete, fetchSliceDetail } from '../actions';
import style from '../style/hdfs.scss'



/*const getData = (length) => {
    length = length||12;
    let arr = [];
    for( let i=length; i--;) {
        arr.push({
            type: Math.random(),

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
*/

class InnerTable extends React.Component {
    constructor(props, context) {
        super(props);
        this.dispatch = context.dispatch;
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        let selectedRowNames = [];
        selectedRows.forEach(function(row) {
            selectedRowNames.push(row.slice_name);
        });
        this.props.setSelectedRows(selectedRowKeys, selectedRowNames);
    };

    render() {

        const { files } = this.props;
        const dispatch = this.dispatch;

        function deleteSlice(record) {

            /* let deleteTips = "确定删除" + record.slice_name + "?";
            let deleteSlicePopup = render(
                <SliceDelete
                    dispatch={dispatch}
                    deleteType={'single'}
                    deleteTips={deleteTips}
                    slice={record}/>,
                document.getElementById('popup_root'));
            if(deleteSlicePopup) {
                deleteSlicePopup.showDialog();
            } */
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
                title: '名称',  //TODO: title need to i18n
                width: '5%',
                render: (text, record) => {
                    const type = record.type;
//                        const typesetSelectedRows= Math.random();
                    let datasetType;

                    switch (type) {
                        case 'dir':
                        default:
                            datasetType = 'icon-backfile-default';
                            break;
                        case 'file':
                            datasetType = 'icon-backfile-default';
                            break;
                    }
/*                    if (type>0.75) {
                        datasetType = 'icon-backfile-default';
                    } else if (type>0.5) {
                        datasetType = 'icon-backfile-openfile-warning';
                    } else if (type>0.25) {
                        datasetType = 'icon-disabledfile-info';
                    } else {
                        datasetType = 'icon-grayfile-info';
                    }*/

                    return (
                        <i className={'icon ' + 'icon-disabledfile-info '+ datasetType }></i>
                    )
                },
                sorter(a, b) {
                    return a.name.substring(0, 1).charCodeAt() - b.name.substring(0, 1).charCodeAt();
                }
            },
            {
//                title: '名称',  //TODO: title need to i18n
                key: 'name',
                dataIndex: 'name',
                width: '24%',
                render: (text, record) => {
                    return (<Link to="/filebrowser">{record.path}</Link>);
                }
            }, {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                width: '16%',
                sorter(a, b) {
                    return a.size - b.size;
                }
            }, {
                title: '用户',
                dataIndex: 'user',
                key: 'user',
                width: '10%',
                sorter (a, b) {
                    return a.stats.user - b.stats.user;
                },
                render: (text, record) => {

                    return (<span>{record.stats?(record.stats.user||' '):' '}</span>);
                }
            }, {
                title: '组',
                dataIndex: 'group',
                key: 'group',
                width: '10%',
                sorter (a, b) {
                   return a.stats.group - b.stats.group;
                },
                render: (text, record) => {
                    return (<span>{record.stats?(record.stats.group||' '):' '}</span>);
                }
            }, {
                title: '权限',
                dataIndex: 'rwx',
                key: 'rwx',
                width: '15%',
                render: (text, record) => {
                    return (<span>{record.rwx?record.rwx:' '}</span>);
                },
                sorter (a, b) {
                    return a.rwx - b.rwx;
                }
            }, {
               title: '日期',
               dataIndex: 'mtime',
               key: 'mtime',
               width: '25%',
               sorter(a, b) {
                   return a.mtime - b.mtime ? 1 : -1;
               }
           }

/*           ,{
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
            }*/
        ];

        return (
            <Table
                rowSelection={rowSelection}
                dataSource={files}
                columns={columns}
                pagination={false}
                rowKey={record => record.key}
            />
        );
    }
}

export default InnerTable;
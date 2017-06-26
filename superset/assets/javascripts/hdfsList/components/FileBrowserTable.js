import React from 'react';
import { render } from 'react-dom';
import { message, Table, Icon } from 'antd';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import {  } from '../actions';
import style from '../style/hdfs.scss'

const getData = (length) => {
    length = length||12;
    let arr = [];
    for( let i=length; i--;) {
        arr.push({
            id: i,
            order: 'order'+i,
            orderDate: 'orderDate' + i,
            shippingDate: 'shippingDate' + i,
            shippingType: 'orderType'+i,
            customerId: 'customerId'+i
        });
    }
    return arr;
};
const data = getData(20);

class FileBrowserTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data
        };
    }

    render() {

        const { dispatch, data } = this.props;

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
        }

        function favoriteSlice(record) {
        }

        const columns = [
            {
                width: '10%',
                key: 'id',
                dataIndex: 'id',
                render: text => <Link to="">{text}</Link>
            },
            {
                title: '订单',  //TODO: title need to i18n
                key: 'order',
                dataIndex: 'order',
                width: '15%',
                sorter: (a, b) => a.order- b.order,
                render: text => <Link to="/filebrowser">{text}</Link>
            }, {
                title: '订购日期',
                dataIndex: 'orderDate',
                key: 'orderDate',
                width: '15%',
                sorter: (a, b) => a.orderDate - b.orderDate,
            }, {
                title: '装运日期',
                dataIndex: 'shippingDate',
                key: 'shippingDate',
                width: '15%',
                sorter: (a, b) => a.shippingDate - b.shippingDate
            }, {
               title: '装运方式',
               dataIndex: 'shippingType',
               key: 'shippingType',
               width: '15%',
               sorter: (a, b) => a.shippingType - b.shippingType
            }, {
               title: '客户ID',
               dataIndex: 'customerId',
               key: 'customerId',
               width: '10%',
               sorter: (a, b) => a.customerId - b.customerId
            }
        ];

        return (
            <Table
                dataSource={this.state.data}
                columns={columns}
                rowKey={record => record.id}
                scroll={{ y:320, x: 600 }}
                bordered
                size="small"
            />
        );
    }
}
export default FileBrowserTable;
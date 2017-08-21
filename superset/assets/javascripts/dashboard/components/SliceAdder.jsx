import $ from 'jquery';
import React, { PropTypes } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ModalTrigger from '../../components/ModalTrigger';
import { Table, Pagination } from 'antd';
require('react-bootstrap-table/css/react-bootstrap-table.css');

const propTypes = {
    dashboard: PropTypes.object.isRequired,
    triggerNode: PropTypes.node.isRequired,
};

class SliceAdder extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            slices: [],
            slicesLoaded: false,
            selectedSliceIds: [],
            pageSize: 10000,
            totalPage: 0,
            pageNumber: 1
        };

        this.addSlices = this.addSlices.bind(this);
        this.onPageChange = this.onPageChange.bind(this);
        this.keywordChange = this.keywordChange.bind(this);
    }

    keywordChange(event) {
        const keyword = event.target.value;
        this.getSliceList(1, keyword);
    }

    onSelectChange = (selectedRowKeys, selectedRows) => {
        let selectedSliceIds = [];
        selectedRows.forEach(function(row) {
            selectedSliceIds.push(row.id);
        });
        this.setState({
            selectedSliceIds: selectedSliceIds
        });
    };

    onPageChange(page) {
        this.setState({
            pageNumber: page
        });
        this.getSliceList(page, '');
    }

    addSlices() {
        this.props.dashboard.addSlicesToDashboard(this.state.selectedSliceIds);
    }

    getSliceList(pageNumber, keyword) {
        const self = this;
        const url = '/slice/listdata?page=' + (pageNumber-1) + '&page_size=' + self.state.pageSize + '&filter=' + keyword;
        this.slicesRequest = $.ajax({
            url: url,
            type: 'GET',
            success: response => {
                const slices = $.parseJSON(response).data;
                const sliceCount = $.parseJSON(response).count;
                const totalPage = Math.ceil(sliceCount/self.state.pageSize);
                this.setState({
                    slices,
                    selectedSliceIds: [],
                    totalPage: totalPage,
                    pageNumber: pageNumber,
                    slicesLoaded: true
                });
            },
            error: error => {
                this.errored = true;
                this.setState({
                    errorMsg: this.props.dashboard.getAjaxErrorMsg(error),
                });
            }
        });
    }

    componentDidMount() {
        //first load list
        this.getSliceList(1, '');
    }

    componentWillUnmount() {
        this.slicesRequest.abort();
    }

    render() {
        const hideLoad = this.state.slicesLoaded || this.errored;
        const enableAddSlice = this.state.selectedSliceIds && this.state.selectedSliceIds.length > 0;

        const rowSelection = {
            onChange: this.onSelectChange
        };

        const columns = [
            {
                title: '名称',
                key: 'slice_name',
                dataIndex: 'slice_name',
                width: '40%',
                render: (text, record) => {
                    return (
                        <div className="entity-name">
                            <div className="entity-title">
                                {record.slice_name}
                            </div>
                            <div
                                className="entity-description"
                                style={{
                                    textOverflow:'ellipsis',
                                    whiteSpace:'nowrap',
                                    overflow:'hidden',
                                    maxWidth:'230px'
                                }}
                            >
                                {record.description}
                            </div>
                        </div>
                    )
                },
                sorter(a, b) {
                    return a.slice_name.substring(0, 1).charCodeAt() - b.slice_name.substring(0, 1).charCodeAt();
                }
            }, {
                title: '图表类型',
                dataIndex: 'viz_type',
                key: 'viz_type',
                width: '20%',
                sorter(a, b) {
                    return a.viz_type.substring(0, 1).charCodeAt() - b.viz_type.substring(0, 1).charCodeAt();
                }
            }, {
                title: '数据集',
                dataIndex: 'datasource',
                key: 'datasource',
                width: '20%',
                sorter(a, b) {
                    return a.datasource.substring(0, 1).charCodeAt() - b.datasource.substring(0, 1).charCodeAt();
                }
            }, {
                title: '所有者',
                dataIndex: 'created_by_user',
                key: 'created_by_user',
                width: '20%',
                sorter(a, b) {
                    return a.created_by_user.substring(0, 1).charCodeAt() - b.created_by_user.substring(0, 1).charCodeAt();
                }
            }
        ];

        const modalTitle = "添加工作表";
        const modalIcon = "icon icon-plus";
        const modalContent = (
            <div className="table-add-slice">
                <img
                    src="/static/assets/images/loading.gif"
                    className={'loading ' + (hideLoad ? 'hidden' : '')}
                    alt={hideLoad ? '' : 'loading'}
                />
                <div className={this.errored ? '' : 'hidden'}>
                    {this.state.errorMsg}
                </div>
                <div className={this.state.slicesLoaded ? '' : 'hidden'}>
                    <div className="search-input">
                        <input onChange={this.keywordChange} placeholder="search..." />
                        <i className="icon icon-search"/>
                    </div>
                    <Table
                        rowSelection={rowSelection}
                        dataSource={this.state.slices}
                        columns={columns}
                        pagination={false}
                    />
                    {/*<Pagination
                        size="small"
                        style={{textAlign: 'right', marginTop: 10}}
                        pageSize={this.state.pageSize}
                        total={this.state.totalPage}
                        current={this.state.pageNumber}
                        onChange={this.onPageChange}
                    />*/}
                </div>
            </div>
        );
        const modalFooter = (
            <div>
                <button
                    type="button"
                    className="tp-btn tp-btn-middle tp-btn-primary"
                    data-dismiss="modal"
                    onClick={this.addSlices}
                    disabled={!enableAddSlice}
                >
                    添加
                </button>
            </div>
        );

        return (
            <ModalTrigger
                triggerNode={this.props.triggerNode}
                isButton
                className='popup-modal-add-slice'
                modalBody={modalContent}
                modalIcon={modalIcon}
                modalTitle={modalTitle}
                modalFooter={modalFooter}
            />
        );
    }
}

SliceAdder.propTypes = propTypes;

export default SliceAdder;

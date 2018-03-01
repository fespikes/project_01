import React from 'react';
import PropTypes from 'prop-types';
import {Checkbox, message} from 'antd';
import {render} from 'react-dom';
import * as actions from '../actions';
import {DashboardEdit, DashboardDelete} from '../popup';
import {ConfirmModal} from '../../common/components';
import intl from "react-intl-universal";
import {renderGlobalErrorMsg} from '../../../utils/utils';
import * as utils from '../../../utils/utils';
import {getPermInfo} from '../../perm/actions';

class GalleryItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: false
        };
        // bindings
        this.editDashboard = this.editDashboard.bind(this);
        this.publishDashboard = this.publishDashboard.bind(this);
        this.deleteDashboard = this.deleteDashboard.bind(this);
    };

    editDashboard() {
        const { dispatch, dashboard } = this.props;
        dispatch(actions.fetchDashboardDetail(dashboard.id, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <DashboardEdit
                        dispatch={dispatch}
                        dashboardDetail={data}
                        editable={true}/>,
                    document.getElementById('popup_root')
                );
            }
        }
    }

    publishDashboard() {
        const { dispatch, dashboard } = this.props;
        const self = this;
        dispatch(actions.fetchOnOfflineInfo(dashboard.id, dashboard.online, callback));
        function callback(success, data) {
            if(success) {
                render(
                    <ConfirmModal
                        dispatch={dispatch}
                        record={dashboard}
                        needCallback={true}
                        confirmCallback={self.onOfflineDashboard}
                        confirmMessage={data} />,
                    document.getElementById('popup_root')
                );
            }else {
                renderGlobalErrorMsg(data);
            }
        }
    }

    onOfflineDashboard() {
        const {dispatch, record} = this;
        dispatch(actions.fetchStateChange(record, callback,"publish"));
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

    deleteDashboard() {
        const { dispatch, dashboard } = this.props;
        const deleteTips = intl.get('DASHBOARD.CONFIRM') + intl.get('DASHBOARD.DELETE')
            + dashboard.name + "?";
        render(
            <DashboardDelete
                dispatch={dispatch}
                deleteType={'single'}
                deleteTips={deleteTips}
                dashboard={dashboard}/>,
            document.getElementById('popup_root')
        );
    }

    authorize(record) {
        const callback = (success, response) => {
            if(success) {
                utils.renderPermModal(record.id, record.name, utils.OBJECT_TYPE.DASHBOARD);
            }else {
                utils.renderConfirmModal(response);
            }
        };

        getPermInfo({
            type: utils.OBJECT_TYPE.DASHBOARD,
            id: record.id
        }, callback);
    }

    render() {
        const self = this;
        const { dispatch, dashboard, selectedRowKeys, selectedRowNames } = self.props;
        function onChange(e) {
            if(e.target.checked) {
                dispatch(actions.appendRow(dashboard, selectedRowKeys, selectedRowNames));
            }else {
                dispatch(actions.removeRow(dashboard, selectedRowKeys, selectedRowNames));
            }
            self.setState({
                selected: e.target.checked
            });
        }
        return (
            <div className="items">
                <div className="item">
                    <div className='item-img-wrapper'>
                        <div className={'item-img dashboard-thumbnail-' + (dashboard.id%5 + 1)}>
                            <a href={dashboard.url}>
                                <i
                                    className="fa fa-search"
                                    aria-hidden="true"
                                />
                            </a>
                        </div>
                    </div>
                    <div className="item-operation">
                        <div className={this.state.selected ? 'selected' : 'name'}>
                            <Checkbox onChange={onChange}>
                                <span className="item-title">
                                    {dashboard.name}
                                </span>
                            </Checkbox>
                        </div>
                        <div className="icon-group">
                            <i
                                className="icon icon-edit"
                                onClick={this.editDashboard}
                            />
                            {/*<i
                                className={dashboard.online ? 'icon icon-online' : 'icon icon-offline'}
                                onClick={this.publishDashboard}
                            />*/}
                            <i
                                className="icon icon-delete"
                                onClick={this.deleteDashboard}
                            />
                            <i
                                className="icon icon-perm"
                                onClick={() => this.authorize(dashboard)}
                            />
                        </div>
                    </div>
                    <hr className="divider"/>
                    <div className="item-description">
                        {dashboard.description}
                    </div>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {};

GalleryItem.propTypes = propTypes;
GalleryItem.defaultProps = defaultProps;

export default GalleryItem;
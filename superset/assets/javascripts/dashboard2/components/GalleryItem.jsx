import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from 'antd';
import { render } from 'react-dom';
import { fetchStateChange, fetchDashboardDetail, appendRow, removeRow } from '../actions';
import { DashboardEdit, DashboardDelete } from '../popup';

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
        dispatch(fetchDashboardDetail(dashboard.id, callback));
        function callback(success, data) {
            if(success) {
                var editDashboardPopup = render(
                    <DashboardEdit
                        dispatch={dispatch}
                        dashboardDetail={data}
                        editable={true}/>,
                    document.getElementById('popup_root'));
                if(editDashboardPopup) {
                    editDashboardPopup.showDialog();
                }
            }
        }
    }

    publishDashboard() {
        const { dispatch, dashboard } = this.props;
        dispatch(fetchStateChange(dashboard, "publish"));
    }

    deleteDashboard() {
        const { dispatch, dashboard } = this.props;
        const deleteTips = "确定删除" + dashboard.dashboard_title + "?";
        var deleteDashboardPopup = render(
            <DashboardDelete
                dispatch={dispatch}
                deleteType={'single'}
                deleteTips={deleteTips}
                dashboard={dashboard}/>,
            document.getElementById('popup_root'));
        if(deleteDashboardPopup) {
            deleteDashboardPopup.showDialog();
        }
    }

    render() {
        const self = this;
        const { dispatch, dashboard, selectedRowKeys, selectedRowNames } = self.props;
        function onChange(e) {
            if(e.target.checked) {
                dispatch(appendRow(dashboard, selectedRowKeys, selectedRowNames));
            }else {
                dispatch(removeRow(dashboard, selectedRowKeys, selectedRowNames));
            }
            self.setState({
                selected: e.target.checked
            });
        }
        return (
            <div className="items">
                <div className="item">
                    <div className="item-img" >
                        <a href={dashboard.url}></a>
                    </div>
                    <div className="item-operation">
                        <div className={this.state.selected ? 'selected' : 'name'}>
                            <Checkbox onChange={onChange}>
                                {dashboard.dashboard_title}
                            </Checkbox>
                        </div>
                        <div className="icon-group">
                            <i className="icon" onClick={this.editDashboard}></i>&nbsp;
                            <i className={dashboard.online ? 'icon online' : 'icon offline'} onClick={this.publishDashboard}></i>&nbsp;
                            <i className="icon" onClick={this.deleteDashboard}></i>
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
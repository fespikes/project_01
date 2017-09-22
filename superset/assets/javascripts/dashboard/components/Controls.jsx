const $ = window.$ = require('jquery');
import React from 'react';
import { render, ReactDOM } from 'react-dom';
import { ButtonGroup } from 'react-bootstrap';
import Button from '../../components/Button';
import CssEditor from './CssEditor';
import RefreshIntervalModal from './RefreshIntervalModal';
import SaveModal from './SaveModal';
import CodeModal from './CodeModal';
import SliceAdder from './SliceAdder';
import DashboardEdit from './DashboardEdit';
import { ConfirmModal } from '../../common/components';
import { renderLoadingModal, PILOT_PREFIX } from '../../../utils/utils';

const propTypes = {
    dashboard: React.PropTypes.object.isRequired,
};

class Controls extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            css: props.dashboard.css,
            cssTemplates: [],
            published: false
        };
    }
    refresh() {
        this.props.dashboard.sliceObjects.forEach((slice) => {
            slice.render(true);
        });
    }
    publish() {
        const self = this;
        const { dashboard } = self.props;
        const loadingModel = renderLoadingModal();
        loadingModel.show();
        let url = this.getOnOfflineUrl(dashboard.id, this.state.published, 'check');
        $.get(url, (data) => {
            loadingModel.hide();
            if(data.status === 200) {
                render(
                    <ConfirmModal
                        self={self}
                        dashboardId={dashboard.id}
                        published={this.state.published}
                        dashboardStateChange={self.dashboardStateChange}
                        needCallback={true}
                        confirmCallback={self.dashboardOnOffline}
                        confirmMessage={data.data} />,
                    document.getElementById('popup_root')
                );
            }
        });
    }

    dashboardOnOffline() {
        const self = this.self;
        const url = self.getOnOfflineUrl(this.dashboardId, this.published, 'release');
        this.dashboardStateChange(url, this.dashboardId, self);
    }

    dashboardStateChange(url, dashboardId, _this) {
        const loadingModel = renderLoadingModal();
        loadingModel.show();
        $.get(url, (data) => {
            if(data.status === 200) {
                let url = PILOT_PREFIX + 'if_online/dashboard/' + dashboardId;
                $.get(url, (data) => {
                    _this.setState({
                        published: $.parseJSON(data).online
                    });
                    loadingModel.hide();
                });
            }else {
                render(
                    <ConfirmModal
                        needCallback={false}
                        confirmMessage={data.message}
                    />,
                    document.getElementById('popup_root')
                );
            }
        });
    }

    getOnOfflineUrl(dashboardId, published, type) {
        let url = "";
        if(type === 'check') {
            url = '/dashboard/';
            if(published) {
                url += 'offline_info/' + dashboardId;
            }else {
                url += 'online_info/' + dashboardId;
            }
        }else if(type === "release") {
            url = PILOT_PREFIX + 'release/dashboard/';
            if(published) {
                url += 'offline/' + dashboardId;
            }else {
                url += 'online/' + dashboardId;
            }
        }
        return url;
    }

    componentDidMount() {
        const self = this;
        const { dashboard } = self.props;
        let url = PILOT_PREFIX + 'if_online/dashboard/' + dashboard.id;
        $.get(url, (data) => {
            self.setState({
                published: $.parseJSON(data).online
            });
        });
    }
    changeCss(css) {
        this.setState({ css });
        this.props.dashboard.onChange();
    }
    render() {
        const dashboard = this.props.dashboard;
        const canSave = dashboard.context.dash_save_perm; //cannot use currently
        const emailBody = `Checkout this dashboard: ${window.location.href}`;
        const emailLink = 'mailto:?Subject=Superset%20Dashboard%20'
            + `${dashboard.dashboard_title}&Body=${emailBody}`;
        return (
            <ButtonGroup>
                <Button
                    onClick={this.publish.bind(this)}
                    tooltip={this.state.published?'下线':'发布'}
                    placement="bottom"
                    >
                    <i className={this.state.published ? 'icon icon-online' : 'icon icon-offline'}/>
                </Button>
                <Button
                    onClick={this.refresh.bind(this)}
                    tooltip="刷新仪表盘"
                    placement="bottom"
                    >
                    <i className="icon icon-refresh"/>
                </Button>
                <SliceAdder
                    dashboard={dashboard}
                    triggerNode={
                        <i className="icon icon-plus"/>
                    }
                />
                {
                    /*<RefreshIntervalModal
                    onChange={refreshInterval => dashboard.startPeriodicRender(refreshInterval * 1000)}
                    triggerNode={
                        <i className="icon icon-clock" />
                    }
                />

                    <CodeModal
                        codeCallback={dashboard.readFilters.bind(dashboard)}
                        triggerNode={<i className="icon icon-setting" />}
                    />
                    <CssEditor
                        dashboard={dashboard}
                        triggerNode={
                            <i className="icon icon-drag" />
                        }
                        initialCss={dashboard.css}
                        templates={this.state.cssTemplates}
                        onChange={this.changeCss.bind(this)}
                    />
                     */
                }
                <DashboardEdit
                    dashboard={dashboard}
                    triggerNode={
                        <i className="icon icon-edit"/>
                    }
                />
                <SaveModal
                    dashboard={dashboard}
                    css={this.state.css}
                    triggerNode={
                        <i className="icon icon-save"/>
                    }
                />
                {/*<Button
                    onClick={() => { window.location = emailLink; }}
                    tooltip="发送邮件"
                    placement="bottom"
                    >
                    <i className="icon icon-email"></i>
                </Button>*/}
            </ButtonGroup>
        );
    }
}
Controls.propTypes = propTypes;

export default Controls;

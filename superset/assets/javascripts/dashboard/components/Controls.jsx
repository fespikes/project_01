const $ = window.$ = require('jquery');
import React from 'react';
import { ButtonGroup } from 'react-bootstrap';
import Button from '../../components/Button';
import CssEditor from './CssEditor';
import RefreshIntervalModal from './RefreshIntervalModal';
import SaveModal from './SaveModal';
import CodeModal from './CodeModal';
import SliceAdder from './SliceAdder';
import DashboardEdit from './DashboardEdit';

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
        let url = '/dashboard/release/';
        if(this.state.published) {
            url += 'offline/' + dashboard.id;
        }else {
            url += 'online/' + dashboard.id;
        }
        $.get(url, (data) => {
            if($.parseJSON(data).success) {
                let url = '/pilot/if_online/dashboard/' + dashboard.id;
                $.get(url, (data) => {
                    self.setState({
                        published: $.parseJSON(data).online
                    });
                });
            }
        });
    }

    componentDidMount() {
        const self = this;
        const { dashboard } = self.props;
        let url = '/pilot/if_online/dashboard/' + dashboard.id;
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
                    tooltip="发布仪表盘"
                    placement="bottom"
                    >
                    <i className={this.state.published ? 'icon icon-online' : 'icon icon-offline'}></i>
                </Button>
                <Button
                    onClick={this.refresh.bind(this)}
                    tooltip="刷新仪表盘"
                    placement="bottom"
                    >
                    <i className="icon icon-refresh" />
                </Button>
                <SliceAdder
                    dashboard={dashboard}
                    triggerNode={
                        <i className="icon icon-plus" />
                    }
                />
                <RefreshIntervalModal
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
                <DashboardEdit
                    dashboard={dashboard}
                    triggerNode={
                        <i className="icon icon-edit" />
                    }
                />
                <SaveModal
                    dashboard={dashboard}
                    css={this.state.css}
                    triggerNode={
                        <i className="icon icon-save" />
                    }
                />
                <Button
                    onClick={() => { window.location = emailLink; }}
                    tooltip="发送邮件"
                    placement="bottom"
                    >
                    <i className="icon icon-email"></i>
                </Button>
            </ButtonGroup>
        );
    }
}
Controls.propTypes = propTypes;

export default Controls;

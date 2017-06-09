import React from 'react';
import Controls from './Controls';
import { Tooltip } from 'antd';

const propTypes = {
    dashboard: React.PropTypes.object,
};
const defaultProps = {
};

class Header extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
        };
    }
    render() {
        const dashboard = this.props.dashboard;
        const tips = "Click to favorite/unfavorite";
        return (
            <div className="title">
                <div className="pull-left">
                    <span>{dashboard.dashboard_title}</span>
                    <span is class="favstar" class_name="Dashboard" obj_id={dashboard.id} />
                    <Tooltip title={tips} placement="bottom">
                        <i className="icon info"></i>
                    </Tooltip>
                </div>
                <div className="pull-right">
                    {!this.props.dashboard.context.standalone_mode &&
                    <Controls dashboard={dashboard} />
                    }
                </div>
                <div className="clearfix" />
            </div>
        );
    }
}
Header.propTypes = propTypes;
Header.defaultProps = defaultProps;

export default Header;

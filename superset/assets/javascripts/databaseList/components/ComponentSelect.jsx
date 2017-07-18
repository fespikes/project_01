/**
 * Created by haitao on 17-7-17.
 */
import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';
import { Link }  from 'react-router-dom';

class ComponentSelect extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            opened: false
        };
        this.onToggle = this.onToggle.bind(this);
    }

    onToggle() {
        let opened = this.state.opened;
        this.setState({
            opened: !opened
        });
    }

    onSelect(self) {
        self.setState({
            selected: this,
            opened: false
        });
        self.props.selectChange(this);
    }

    render () {
        const self = this;
        const { options, opeType } = self.props;
        let typeOptions = [];
        if(opeType === "addConnect") {
            typeOptions = options.map((opt, index) => {
                return <li className={this.state.selected===opt?'selected':''}
                           key={index} onClick={self.onSelect.bind(opt, self)}>
                    <Link to={`/add/detail/${opt}/`}>{opt}</Link>
                </li>
            });
        }else if(opeType === "addDataset") {
            typeOptions = options.map((opt, index) => {
                return <li className={this.state.selected===opt?'selected':''}
                           key={index} onClick={self.onSelect.bind(opt, self)}>
                    <span>{opt}</span>
                </li>
            });
        }

        return (
            <div className="component-select">
                <div className="selection-toggle" onClick={this.onToggle}>
                    <i className="icon icon-plus"/>
                    <span>{this.state.selected || "请选择"}</span>
                </div>
                <div className={this.state.opened===true?'selection-section':'none'}>
                    <ul>{typeOptions}</ul>
                </div>
            </div>
        );
    }
}

ComponentSelect.propTypes = {};

export default ComponentSelect;
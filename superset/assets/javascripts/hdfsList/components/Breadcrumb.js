import { Breadcrumb } from 'antd';
import React, { Component } from 'react';

class HDFSBreadcrumbs extends Component {
    constructor(props) {
        super(props);
//        this.state = {}
    }

    render () {

        return (
            <Breadcrumb>
                <Breadcrumb.Item>Home</Breadcrumb.Item>
                <Breadcrumb.Item><a href="">Application Center</a></Breadcrumb.Item>
                <Breadcrumb.Item><a href="">Application List</a></Breadcrumb.Item>
                <Breadcrumb.Item>An Application</Breadcrumb.Item>
            </Breadcrumb>
        );
    }
}

HDFSBreadcrumbs.propTypes = {};

export default HDFSBreadcrumbs;
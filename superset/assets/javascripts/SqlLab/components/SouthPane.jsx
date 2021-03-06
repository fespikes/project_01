import { Alert, Tab, Tabs } from 'react-bootstrap';
import QueryHistory from './QueryHistory';
import ResultSet from './ResultSet';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import React from 'react';
import intl from 'react-intl-universal';

import * as Actions from '../actions';

import shortid from 'shortid';

/*
 editorQueries are queries executed by users passed from SqlEditor component
 dataPrebiewQueries are all queries executed for preview of table data (from SqlEditorLeft)
 */
const propTypes = {
    editorQueries: React.PropTypes.array.isRequired,
    dataPreviewQueries: React.PropTypes.array.isRequired,
    actions: React.PropTypes.object.isRequired,
    activeSouthPaneTab: React.PropTypes.string,
};

const defaultProps = {
    activeSouthPaneTab: 'Results',
};

class SouthPane extends React.PureComponent {
    switchTab(id) {
        this.props.actions.setActiveSouthPaneTab(id);
    }
    render() {
        let latestQuery;
        const props = this.props;
        if (props.editorQueries.length > 0) {
            latestQuery = props.editorQueries[props.editorQueries.length - 1];
        }
        let results;
        if (latestQuery) {
            results = (
                <ResultSet showControls search query={latestQuery} actions={props.actions} />
            );
        } else {
            results = <Alert bsStyle="info">Run a query to display results here</Alert>;
        }

        const dataPreviewTabs = props.dataPreviewQueries.map((query) => (
            <Tab
                title={intl.get('preview')+ ' ' +`${query.tableName}`}
                eventKey={query.id}
                key={query.id}
            >
                <ResultSet query={query} visualize={false} csv={false} actions={props.actions} cache />
            </Tab>
        ));

        return (
            <div className="SouthPane">
                <Tabs
                    bsStyle="tabs"
                    id={shortid.generate()}
                    activeKey={this.props.activeSouthPaneTab}
                    onSelect={this.switchTab.bind(this)}
                >
                    <Tab
                        title={intl.get('result')}
                        eventKey="Results"
                    >
                        <div style={{ overflow: 'auto' }}>
                            {results}
                        </div>
                    </Tab>
                    <Tab
                        title={intl.get('query_history')}
                        eventKey="History"
                    >
                        <QueryHistory queries={props.editorQueries} actions={props.actions} />
                    </Tab>
                    {dataPreviewTabs}
                </Tabs>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return {
        activeSouthPaneTab: state.activeSouthPaneTab,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(Actions, dispatch),
    };
}

SouthPane.propTypes = propTypes;
SouthPane.defaultProps = defaultProps;

export default connect(mapStateToProps, mapDispatchToProps)(SouthPane);

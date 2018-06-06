import React from 'react';
import { Alert, Button, Col, Modal, ButtonGroup, ProgressBar } from 'react-bootstrap';
import { Table } from 'reactable';
import shortid from 'shortid';
import { Input } from 'antd';
import intl from 'react-intl-universal';

import VisualizeModal from './VisualizeModal';
import HighlightedSql from './HighlightedSql';

import {PILOT_PREFIX} from '../../../utils/utils'

const propTypes = {
    actions: React.PropTypes.object,
    csv: React.PropTypes.bool,
    query: React.PropTypes.object,
    search: React.PropTypes.bool,
    searchText: React.PropTypes.string,
    showSql: React.PropTypes.bool,
    visualize: React.PropTypes.bool,
    cache: React.PropTypes.bool,
};
const defaultProps = {
    search: true,
    visualize: true,
    showSql: false,
    csv: true,
    searchText: '',
    actions: {},
    cache: false,
};


class ResultSet extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            searchText: '',
            showModal: false,
            data: [],
            cvsDownload: false,      // show the CVS confirm model
            withTitle: true         // param of show header
        };
        this.confirmCSVDownloadWithTitle = this.confirmCSVDownloadWithTitle.bind(this);
        this.setCSVDownloadState = this.setCSVDownloadState.bind(this);
    }
    componentWillReceiveProps(nextProps) {
        // when new results comes in, save them locally and clear in store
        if (this.props.cache && (!nextProps.query.cached)
            && nextProps.query.results
            && nextProps.query.results.data.length > 0) {
            this.setState(
                { data: nextProps.query.results.data },
                this.clearQueryResults(nextProps.query)
            );
        }
    }
    confirmCSVDownloadWithTitle() {
        const url = PILOT_PREFIX + 'csv/' + this.props.query.id + '?header=' + this.state.withTitle;
        this.setState({cvsDownload: false})
        window.open(url);
    }
    setCSVDownloadState(withTitle) {
        const tr = document.querySelector('.true');
        this.setState({withTitle: tr.checked});
    }
    getControls() {
        if (this.props.search || this.props.visualize || this.props.csv) {
            let csvButton;
            if (this.props.csv) {
                csvButton = (
                    <Button 
                        onClick={_ => this.setState({cvsDownload: true, withTitle: true})}
                        bsSize="small"
                    >
                        <i className="fa fa-file-text-o" /> .CSV
                    </Button>
                );
            }
            let visualizeButton;
            if (this.props.visualize) {
                visualizeButton = (
                    <Button
                        bsSize="small"
                        onClick={this.showModal.bind(this)}
                    >
                        <i className="fa fa-bar-chart m-l-1" />{intl.get('create_slice')}
                    </Button>
                );
            }
            let searchBox;
            if (this.props.search) {
                const Search = Input.Search;
                searchBox = (
                    <Search
                        placeholder="Search Results"
                        className="input-sm tp-input"
                        onChange={this.changeSearch.bind(this)}
                    />
                );
            }
            return (
                <div className="ResultSetControls">
                    <div className="control-bar">
                        <ButtonGroup>
                            {visualizeButton}
                            {csvButton}
                        </ButtonGroup>
                        {searchBox}
                        {/*S: below is the confirm download column title model*/}
                        <div className="VisualizeModal" style={{display: this.state.cvsDownload?'': 'none'}}>
                            <Modal show={this.state.cvsDownload} >
                                <Modal.Header>
                                    <div className="popup-header">
                                        <div className="header-left">
                                            <span>{intl.get('csv_download')}</span>
                                        </div>
                                        <div className="header-right">
                                            <i className="icon icon-close" onClick={_ => this.setState({cvsDownload: false})}/>
                                        </div>
                                    </div>
                                </Modal.Header>

                                <Modal.Body style={{maxHeight: 150}}>
                                    <div className="row">
                                        <Col md={6}>
                                            <span className="if-download">{intl.get('download_with_title')}:</span>
                                            <label>
                                                <input 
                                                    className="cvs-radio true" 
                                                    type="radio" 
                                                    name="header"
                                                    onChange={this.setCSVDownloadState}
                                                    checked={!!this.state.withTitle?true: false}
                                                />
                                                {intl.get('with_title')}
                                            </label>
                                            <label>
                                                <input 
                                                    className="cvs-radio false" 
                                                    type="radio" 
                                                    name="header"
                                                    onChange={this.setCSVDownloadState}
                                                />
                                                {intl.get('without_title')}
                                            </label>
                                        </Col>
                                    </div>
                                    <div style={{textAlign: 'center'}}>
                                        <button
                                            onClick={this.confirmCSVDownloadWithTitle}
                                            className="tp-btn tp-btn-middle tp-btn-primary"
                                            disabled={(!this.state.cvsDownload)}
                                        >
                                            <span style={{color: '#fff'}}>{intl.get('download')}</span>
                                        </button>
                                    </div>
                                </Modal.Body>
                            </Modal>
                        </div>
                        {/*E: below is the confirm download column title model*/}
                    </div>
                </div>
            );
        }
        return <div className="noControls" />;
    }
    clearQueryResults(query) {
        this.props.actions.clearQueryResults(query);
    }
    popSelectStar() {
        const qe = {
            id: shortid.generate(),
            title: this.props.query.tempTable,
            autorun: false,
            dbId: this.props.query.dbId,
            sql: `SELECT * FROM ${this.props.query.tempTable}`,
        };
        this.props.actions.addQueryEditor(qe);
    }
    showModal() {
        this.setState({ showModal: true });
    }
    hideModal() {
        this.setState({ showModal: false });
    }
    changeSearch(event) {
        this.setState({ searchText: event.target.value });
    }
    fetchResults(query) {
        this.props.actions.fetchQueryResults(query);
    }
    reFetchQueryResults(query) {
        this.props.actions.reFetchQueryResults(query);
    }
    render() {
        const query = this.props.query;
        const results = query.results;
        let data;
        if (this.props.cache && query.cached) {
            data = this.state.data;
        } else {
            data = results ? results.data : [];
        }

        let sql;

        if (this.props.showSql) {
            sql = <HighlightedSql sql={query.sql} />;
        }
        if (['running', 'pending', 'fetching'].indexOf(query.state) > -1) {
            let progressBar;
            if (query.progress > 0 && query.state === 'running') {
                progressBar = (
                    <ProgressBar
                        striped
                        now={query.progress}
                        label={`${query.progress}%`}
                    />);
            }
            return (
                <div>
                    <img className="loading" alt="Loading..." src="/static/assets/images/loading.gif" />
                    {progressBar}
                </div>
            );
        } else if (query.state === 'failed') {
            return <Alert bsStyle="danger">{query.errorMessage}</Alert>;
        } else if (query.state === 'success' && query.ctas) {
            return (
                <div>
                    <Alert bsStyle="info">
                        Table [<strong>{query.tempTable}</strong>] was
                        created &nbsp;
                        <Button
                            bsSize="small"
                            className="m-r-5"
                            onClick={this.popSelectStar.bind(this)}
                        >{intl.get('search_in_tags')}
                        </Button>
                    </Alert>
                </div>);
        } else if (query.state === 'success') {
            if (results && data && data.length > 0) {
                return (
                    <div>
                        <VisualizeModal
                            show={this.state.showModal}
                            query={this.props.query}
                            onHide={this.hideModal.bind(this)}
                        />
                        {this.getControls.bind(this)()}
                        {sql}
                        <div className="ResultSet">
                            <Table
                                data={data}
                                columns={results.columns.map((col) => col.name)}
                                sortable
                                className="table table-condensed table-bordered"
                                filterBy={this.state.searchText}
                                filterable={results.columns.map((c) => c.name)}
                                hideFilterInput
                            />
                        </div>
                    </div>
                );
            } else if (query.resultsKey) {
                return (
                    <div>
                        <Alert bsStyle="warning">This query was run asynchronously &nbsp;
                            <Button bsSize="sm" onClick={this.fetchResults.bind(this, query)}>
                                {intl.get('get_result')}
                            </Button>
                        </Alert>
                    </div>
                );
            }
        }
        if (query.cached) {
            return (
                <Button
                    bsSize="sm"
                    bsStyle="primary"
                    onClick={this.reFetchQueryResults.bind(this, query)}
                >{intl.get('get_data_preview')}
                </Button>
            );
        }
        return <Alert bsStyle="warning">{intl.get('no_data_current')}</Alert>;
    }
}
ResultSet.propTypes = propTypes;
ResultSet.defaultProps = defaultProps;

export default ResultSet;

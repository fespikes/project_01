import React from 'react';
import { render } from 'react-dom';
import { Tooltip } from 'antd';
import PropTypes from 'prop-types';
import './popup.scss';

class Popup extends React.Component {
    constructor (props, context) {
        super(props);
        this.state = {
            datasetType: 'inceptor',     //uploadFile HDFS inceptor
            databaseName: '',
            sqlalchemyUri: '',

            verfifyType: 'password'     //verfifyType: keyTab password
        };
        this.dispatch = context.dispatch;

        this.submit = this.submit.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.onChange = this.onChange.bind(this);
    };

    //showDialog () {
    //    this.refs.popupContainer.style.display = "flex";
    //}

    closeDialog () {
        const {changePopupStatus} = this.props;
        this.dispatch(changePopupStatus('none'));
    }

    onChange () {
        //this.setState({
            //sqlalchemyUri:this.refs.sqlalchemyUri.value
        //});
    }

    setSubmitParam () {
        const datasetType = this.state.datasetType;
        const databaseName = this.refs.databaseName.value;
        const sqlalchemyUri = this.refs.sqlalchemyUri.value;

        this.dispatch(setPopupParam({datasetType, databaseName, sqlalchemyUri}));
    }

    testConnection () {

    }

    submit () {
        const me = this;
        const {setPopupParam} = this.props;
        //unnecessary to set state

        function callback(success, msg) {
            if(success) {
                me.closeDialog();
            }else {
                //to make sure the error tips
            }
        }
        me.props.submit(callback);
    }

    switchDatasetType (type) {
        this.setState({
            datasetType: type
        });
    }

    switchVerfifyType (type) {
        this.setState({
            verfifyType: type
        });
    }

    render () {
        //dialogType:
        //title: 删除数据库连接
        /*
        const {title, deleteTips, confirm, closeDialog, showDialog,
            setPopupParam, setPopupTitle } = this.props;
        */

        const {
            title, deleteTips, confirm, closeDialog, showDialog,
            setPopupParam,
            status
        } = this.props;

        const {
            datasetType,     //uploadFile HDFS inceptor
            databaseName,
            sqlalchemyUri,

            verfifyType
        } = this.state;

        /*setPopupParam({
            popupContainer: 'popup'
        });
        */
        let iconClass = 'icon-connect';
        let tipMsg = <span>this is the tip message text.</span>;

        console.log('render popup');

        return (
            <div className="popup" ref="popupContainer" style={{display: status}}>
                <div className="popup-dialog popup-md">
                    <div className="popup-content">
                        <div className="popup-header">
                            <div className="header-left">
                                <i className={'icon '+ iconClass}></i>
                                <span>{title}</span>
                            </div>
                            <div className="header-right">
                                <i className="icon icon-close" onClick={this.closeDialog}></i>
                            </div>
                        </div>
                        <div className="popup-body">

                            <div className="add-connection">
                                <div className="data-detail-border">
                                    <label className="data-detail-item">
                                        <span>数据集类型：</span>
                                        <dl onClick={()=>this.switchDatasetType('inceptor')}>
                                            <dd className={(datasetType==='inceptor'?'radio-glugin-active':'')+' radio-glugin'} ></dd>
                                            <dd className={datasetType==='inceptor'?'active':''}>inceptor</dd>
                                        </dl>
                                        <dl onClick={()=>this.switchDatasetType('HDFS')}>
                                            <dd className={(datasetType==='HDFS'?'radio-glugin-active':'')+' radio-glugin'}></dd>
                                            <dd className={datasetType==='HDFS'?'active':''}>HDFS</dd>
                                        </dl>
                                    </label>
                                    <div style={{ display: datasetType==='inceptor'?'block':'none' }} >
                                        <label className="data-detail-item">
                                            <span>连接名称：</span>
                                            <input
                                                type="text"
                                                defaultValue=""
                                                required="required"
                                                ref="databaseName"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>连接串：</span>
                                            <input
                                                ref="sqlalchemyUri"
                                                type="text"
                                                placeholder="SQLAlchemy连接串"
                                                defaultValue={this.state.sqlalchemyUri}
                                                onChange={this.onChange}
                                                required="required"
                                            />
                                            <Tooltip placement="topRight" title={tipMsg}>
                                                <i className="icon icon-infor icon-infor-ps"></i>
                                            </Tooltip>
                                        </label>

                                        <label className="data-detail-item">
                                            <span>&nbsp;</span>
                                            <button className="uploading-btn">测试连接</button>
                                        </label>
                                    </div>
                                    <div style={{ display: datasetType==='HDFS'?'block':'none' }} >
                                        <label className="data-detail-item">
                                            <span>关联inceptor连接：</span>
                                            <input
                                                type="text"
                                                defaultValue="Heatmap"
                                                required="required"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>HDFS配置文件：</span>
                                            <input
                                                type="file"
                                                defaultValue="file"
                                                required="required"
                                            />
                                        </label>

                                        {/*
                                        <label className="data-detail-item">
                                            <span></span>
                                            <div className="file-uploading">
                                                <i className="icon"></i>
                                                <span>package.json</span>
                                                <div className="progress"></div>
                                            </div>
                                        </label>
                                        */}

                                        <label className="data-detail-item">
                                            <span>用户名：</span>
                                            <input
                                                type="text"
                                                defaultValue="Heatmap"
                                                required="required"
                                            />
                                        </label>
                                        <label className="data-detail-item">
                                            <span>认证类型：</span>
                                            <dl onClick={()=>this.switchVerfifyType('password')}>
                                                <dd className={(verfifyType==='password'?'radio-glugin-active':'')+' radio-glugin'} ></dd>
                                                <dd className={verfifyType==='password'?'active':''}>密码认证</dd>
                                            </dl>
                                            <dl onClick={()=>this.switchVerfifyType('keyTab')}>
                                                <dd className={(verfifyType==='keyTab'?'radio-glugin-active':'')+' radio-glugin'}></dd>
                                                <dd className={verfifyType==='keyTab'?'active':''}>keyTab</dd>
                                            </dl>
                                        </label>
                                        <label
                                            style={{display: verfifyType==='password'?'':'none' }}
                                            className="data-detail-item "
                                        >
                                            <span>密码：</span>
                                            <input
                                                type="text"
                                                required="required"
                                                defaultValue="Heatmap" />
                                        </label>
                                        <label
                                            style={{display: verfifyType==='keyTab'?'':'none' }}
                                            className="data-detail-item"
                                        >
                                            <span>keyTab：</span>
                                            <input
                                                required="required"
                                                type="file"
                                                defaultValue="Heatmap" />
                                        </label>
                                        {/*
                                        <label className="data-detail-item">
                                            <span></span>
                                            <div className="file-uploading">
                                                <i className="icon"></i>
                                                <span>package.json</span>
                                                <div className="progress"></div>
                                            </div>
                                        </label>
                                        */}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="tp-btn tp-btn-middle tp-btn-primary"
                                onClick={this.submit}>
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

const propTypes = {};
const defaultProps = {
    dialogType: 'database'
};

Popup.propTypes = propTypes;
Popup.defaultProps = defaultProps;
Popup.contextTypes = {
    dispatch: PropTypes.func.isRequired
};
export default Popup;

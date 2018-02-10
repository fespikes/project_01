import React from 'react';
import ReactDOM from 'react-dom';
import { Table } from 'antd';
import '../style.scss';

import { setupImportParams } from '../actions';


const POLICY = {
  skip: 'skip',
  overwrite: 'overwrite',
  rename: 'rename'
};

export default class NestedTable extends React.Component {
  
  state = {};
  renameInfo = null;
  renameTimer;

  constructor(props, context, updater) {
    super(props);
    this.expandedRowRender = this.expandedRowRender.bind(this);
    this.renderNormal = this.renderNormal.bind(this);
    this.renderExpanded = this.renderExpanded.bind(this);

    this.adjustState = this.adjustState.bind(this);
    this.textHandler = this.textHandler.bind(this);
  }

  componentDidMount() {
    this.adjustState();
  }
  componentWillReceiveProps(nextProps) {
    this.adjustState(nextProps.duplicatedList);
  }

  adjustState(stateParamData?, callback?) {
    const {renderData, paramData} = this.getData(stateParamData);

    this.props.dispatch(setupImportParams(paramData));
    this.setState({
      renderData: renderData,
      paramData: paramData
    });
  }

  componentDidUpdate() {
    const ctn = document.querySelector('.nested-table');
    let id;
    ctn && (ctn.onclick = ctn.onclick || this.eventHandler.bind(this));

    if(this.renameInfo) {
      id = this.renameInfo.prefix + this.renameInfo.id;
      const ele = document.querySelector(id);
      ele.focus();      
      ele.value = this.state.paramData[
        this.renameCurrentId.replace(this.renameInfo.prefix, '')
      ];
    }
  }

  textHandler(e) {
    e.persist();
    const target = e.target;
    const value = target.value;
    let config;
    config = target.getAttribute("data-config");
    config = JSON.parse(config);

    this.renameTimer && clearTimeout(this.renameTimer);

    let paramData = new Object(this.state.paramData);
    let parentData = paramData[config.parent];
    let childData = parentData[config.name];

    childData.name = value;
    delete parentData[config.name];
    parentData[value] = childData;
    this.adjustState(paramData);
    e.stopPropagation();

    this.renameCurrentId = value;
    this.renameInfo = {
      id: value,
      prefix: '#' + config.parent + '_child_'
    } 
  }

  eventHandler(e) {
    const target = e.target;
    let config;
    let paramData = new Object(this.state.paramData);
    let parentData = {};
    let childData = {};
    let policy = '';
    let can_overwrite;

    if(target.type === 'radio') {
      e.stopPropagation();
      target.checked = true;
      config = target.getAttribute("data-config");
      config = JSON.parse(config);
        const index = config.index;
        const parent = config.parent;

      const mockFn = function(index, config, paramData, isParent?='parent'){ return;
        console.log(index, config, paramData, isParent);
      }
      // 做父级事件绑定，子集中同栏变换
      if(!parent) {
        // 做父级数据改变
        switch(index) {
          case 1:
            policy = 'skip';
            break;
          case 2:
            // mockFn(index, config, paramData);
            policy = 'overwrite';
            break;
          case 3:
            policy = 'rename';
            break;
          default:
            console.log('default that');
        }
        parentData = paramData[config.name];
        can_overwrite = parentData.can_overwrite;
        delete parentData.policy;
        delete parentData.can_overwrite;
        for(var i in parentData) {      // set children
          paramData[config.name][i].policy = policy;
        }
        paramData[config.name].can_overwrite = can_overwrite;
        parentData.policy = policy;
      } else {
        // 做子级数据改变
        // 1.取出子集数据
        // {"policy": "skip", "new_name": null}

        // 2.修改子集数据，并改变state。准备好后可以提交数据请求
        switch(index) {
          case 1:
            policy = 'skip';
            break;
          case 2:
            policy = 'overwrite';
            break;
          case 3:
            policy = 'rename';
            // enable the brother afterward in template
            break;
          default:
            console.log('default that');
        }
        paramData[parent][config.name].policy = policy;
        delete paramData[parent].policy;
      }
      this.adjustState(paramData);
    }
  }

  getData(stateParamData?) {
    const renderData = [];
    let paramData = {};

    // similar to the data in response
    const responseData = stateParamData || this.props.duplicatedList;
    let policy;
    let canOverwrite;

    for (let i in responseData) {

      let o = responseData[i];
      let obj = {};
      let children = [];
      let objChildren = {};
      let can_overwrite = true;
      let dream = {};
      policy = o.policy;
      canOverwrite = o.can_overwrite;
      let sufix = '_1';
      delete o.policy;
      delete o.can_overwrite;

      for (var j in o){
        dream = {
          key: i + '_child_' + j,
          name: j,
          new_name: j + sufix,
          policy: (o[j].policy || policy || POLICY.skip),
          can_overwrite: o[j].can_overwrite,
          parent: i,
        };
        children.push(dream);
        objChildren[j] =  {     // do the data adjustment here,
                                // need to get it back to param in action
          name: j,
          new_name: j + sufix,
          policy: (o[j].policy || policy || POLICY.skip),
          can_overwrite: o[j].can_overwrite
        };
        if (o[j].can_overwrite === false) {
          can_overwrite = false;
        }

        paramData[i] = {
          can_overwrite: can_overwrite,
          policy: policy,
          [j]: objChildren[j]
        };
      };

      o.policy = policy;
      o.can_overwrite = canOverwrite;

      renderData.push({
        key: i + '_parent',
        name: i,
        can_overwrite: can_overwrite,
        children: children,
        policy: policy
      });

      // paramData[i] = objChildren;
    };

    return {
      renderData: renderData,
      paramData: paramData      // used in events handling / request
    };
  }

  renderNormal(text, record, index) {
    const paramData = this.state.paramData;
    const policy = paramData[record.name]['policy'];

    const skipId = record.key + '_skip',
    overrideId = record.key + '_overwrite',
    renameId = record.key + '_rename';

    return (
      <span className="table-operation">
        <input 
          type="radio" 
          id={skipId} 
          name={record.key} 
          checked={policy===POLICY.skip || true}
          onChange={_=> _}
          data-config={JSON.stringify({
            index:1, 
            name:record.name
          })} 
        />
        <label htmlFor={skipId}>跳过</label>

        { record.can_overwrite? 
            <input 
              type="radio" 
              id={overrideId} 
              name={record.key} 
              onChange={_=> _}
              data-config={JSON.stringify({
                index:2, 
                name:record.name
              })} 
              checked={policy===POLICY.overwrite}
            />: 
            <input 
              type="radio" 
              id={overrideId} 
              name={record.key} disabled 
              onChange={_=> _}
              data-config={JSON.stringify({
                index:2, 
                name:record.name
              })} 
              checked={policy===POLICY.overwrite}
            />
        }
        <label htmlFor={overrideId}>覆盖</label>

        <input 
          type="radio" 
          id={renameId} 
          name={record.key} 
          onChange={_=> _}
          data-config={JSON.stringify({
            index:3, 
            name:record.name
          })} 
          checked={policy===POLICY.rename}
        />
        <label htmlFor={renameId}>重命名</label>
      </span>
    )
  }

  renderExpanded(text, record, index) {

    const paramData = this.state.paramData;
    const childData = paramData[record.parent][record.name];
    const policy = childData['policy'];

    const skipId = record.key + '_skip',
      overrideId = record.key + '_overwrite',
      renameId = record.key + '_rename';

    return (
        <span className="table-operation" ref="operation-span">
          <input 
            type="radio" 
            id={skipId} 
            name={record.key} 
            checked={policy===POLICY.skip || true}
            onChange={_ => _}
            data-config={JSON.stringify({
              index:1, 
              parent:record.parent, 
              name:record.name
            })}
          />
          <label htmlFor={skipId}>跳过</label>

          { record.can_overwrite? 
              <input 
                type="radio" 
                checked={policy===POLICY.overwrite}
                id={overrideId} name={record.key} 
                onChange={_=> _}
                data-config={JSON.stringify({
                  index:2, 
                  parent:record.parent, 
                  name:record.name
                })} 
              />: 
              <input 
                type="radio" 
                checked={policy===POLICY.overwrite}
                id={overrideId} 
                name={record.key} 
                onChange={_=> _}
                data-config={JSON.stringify({
                  index:2, 
                  parent:record.parent, 
                  name:record.name
                })} 
                disabled 
              />
          }
          <label htmlFor={overrideId}>覆盖</label>

          <input 
            type="radio" 
            id={renameId} 
            checked={policy===POLICY.rename}
            name={record.key} 
            onChange={_=> _}
            data-config={JSON.stringify({
              index:3, 
              parent:record.parent, 
              name:record.name,
              brotherId: record.key
            })} 
          />
          <label htmlFor={renameId}>重命名</label>
          
          <input 
            className="rename"
            type="text" 
            disabled={(policy===POLICY.rename)?null:'disabled'}
            id={record.key}
            value={record.name}
            data-config={JSON.stringify({
              index:3, 
              parent:record.parent, 
              name:record.name,
              brotherId: record.key
            })} 
            onChange={this.textHandler}
          />
        </span>
      );
  }

  expandedRowRender = (data) => {
    return () => {
      const expandedColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
          title: 'Action',
          dataIndex: 'operation',
          key: 'operation',
          render: this.renderExpanded
        },
      ];

      return (
        <Table
          columns={expandedColumns}
          dataSource={data}

          pagination={false}
          showHeader={false}
        />
      );
    }
  }

  render() {
    const me = this;

    const renderData = this.state.renderData;

    if(!renderData) {
      return <div>no data !</div>
    } else {
      const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { 
          title: 'Action', 
          key: 'operation', 
          render: me.renderNormal
        },
      ];
      
      const children = renderData.map((object, key) => {
        let obj = {...object};
        console.log(obj);

        let subs = obj.children;

        // *******S: please notice that: wasted half day here*******
        // dataSource mustn't content a key children
        // if not deleted, it will overlap with antd setting.
        delete obj.children;
        // *******E: please notice that: wasted half day here*******

        return <Table
          key={key}
          className="components-table-demo-nested"
          expandedRowRender={me.expandedRowRender(subs)}
          columns={columns}
          dataSource={[obj]}
          
          expandRowByClick={false}
          pagination={false}
          showHeader={false}
        />
      });

      return (<div className="nested-table">{children}</div>);
    }
  }

}
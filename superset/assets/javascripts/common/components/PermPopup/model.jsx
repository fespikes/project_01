import React from 'react';
import { Select, Table } from 'antd';

export function makeSelectOptions(userList) {
    const Option = Select.Option;
    const options = userList.map(
        user => {
            return <Option key={user}>{user}</Option>
        }
    );
    return options;
}

export function makePermCheckboxes(permList, _this) {
    const perms = permList.map(
        perm => {
            return <div key={perm}>
                    <input
                        type="checkbox"
                        name={perm}
                        onChange={_this.handleChange}
                    />
                    <span>{perm}</span>
                </div>
        }
    );
    return perms;
}

export function makeTableDataSource(data) {
    const userPermList = makeUserPermList(data);
    const dataSource = [];
    userPermList.map(
        (perm, index) => {
            const userPerm = {
                key: index,
                name: perm.name,
                perm: perm.value
            };
            dataSource.push(userPerm);
        }
    );
    return dataSource;
}

export function makeTableColumns(_this) {
    const columns = [{
        title: '用户名',
        dataIndex: 'name',
        key: 'name',
        width: '40%'
    }, {
        title: '权限',
        dataIndex: 'perm',
        key: 'perm',
        width: '40%'
    }, {
        title: '操作',
        key: 'action',
        width: '20%',
        render: (text, record) => {
            return (
                <i
                    className="icon icon-delete"
                    onClick={() => _this.revokePerm(record)}
                />
            )
        }
    }];
    return columns;
}

function makeUserPermList(data) {
    const userPermList = [];
    for(let attr in data) {
        const userPerms = data[attr];
        for(let index = 0; index < userPerms.length; index++) {
            userPermList.push({
                name: attr,
                value: userPerms[index]
            });
        }
    }
    return userPermList;
}
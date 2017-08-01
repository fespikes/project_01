import React from 'react';

export function getPermColumns(_this) {

    const columns = [{
        title: '',
        dataIndex: 'name',
        key: 'name',
        width: '25%'
    }, {
        title: '用户',
        dataIndex: 'user',
        key: 'user',
        width: '25%',
        className: 'checkb',
        render: (text, record) => {
            return (<input type="checkbox" onClick={() => _this.onPermChange(record, 'user')} checked={record.user} />)
        }
    }, {
        title: '组',
        dataIndex: 'group',
        key: 'group',
        width: '25%',
        className: 'checkb',
        render: (text, record) => {
            return (<input type="checkbox" onClick={() => _this.onPermChange(record, 'group')} checked={record.group} />)
        }
    }, {
        title: '其他',
        dataIndex: 'other',
        key: 'other',
        width: '25%',
        className: 'checkb',
        render: (text, record) => {
            return (<input type="checkbox" onClick={() => _this.onPermChange(record, 'other')} checked={record.other} />)
        }
    }];

    return columns;
}

export function getPermData(hdfsItem) {
    console.log('hdfsItem=', hdfsItem);
    const perms = analysisPerms(hdfsItem[0].rwx);
    if(!perms) {
        return;
    }
    const permData = [{
        key: 'perm1',
        name: '读',
        user: perms[0][0],
        group: perms[0][1],
        other: perms[0][2]
    }, {
        key: 'perm2',
        name: '写',
        user: perms[1][0],
        group: perms[1][1],
        other: perms[1][2]
    }, {
        key: 'perm3',
        name: '执行',
        user: perms[2][0],
        group: perms[2][1],
        other: perms[2][2]
    }];

    return permData;
}

function analysisPerms(permStr) {
    let readStr = permStr.slice(1, 4);
    let writeStr = permStr.slice(4, 7);
    let executeStr = permStr.slice(7, 10);
    let strArray = [readStr, writeStr, executeStr];
    let permArray = constructPermArray(strArray);
    console.log('permArray=', permArray);
    return permArray;
}

function constructPermArray(strArray) {
    let array = [];
    strArray.map((str) => {
        array.push(constructSinglePerm(str));
    });
    return array;
}

function constructSinglePerm(str) {
    let strArray = str.split('');
    let permArray = [];
    strArray.map((word, index) => {
        if(word !== '-') {
            permArray[index] = true
        }else {
            permArray[index] = false;
        }
    });
    return permArray;
}

export function updatePermData(record, type, permData) {
    permData.map((perm) => {
        if(perm.key === record.key) {
            perm[type] = !perm[type];
        }
    });
    console.log('permData=', permData);
    return permData;
}

export function updatePermMode(permData) {
    console.log('permData=', permData);
    let userArray = [];
    let groupArray = [];
    let otherArray = [];
    permData.map((perm, index) => {
        userArray[index] = perm.user;
        groupArray[index] = perm.group;
        otherArray[index] = perm.other;
    });
    let permMode = '0o' + computePermNum([userArray, groupArray, otherArray]);
    console.log('permMode=', permMode);
    return permMode;
}

function computePermNum(rolesArray) {

    let characterArray = [];
    rolesArray.map((roles, k) => {
        let num = 0;
        roles.map((role, index) => {
            if(role) {
                switch(index) {
                    case 0:
                        num += 4;
                        break;
                    case 1:
                        num += 2;
                        break;
                    case 2:
                        num += 1;
                        break;
                    default:
                        break;
                }
            }
        });
        characterArray[k] = num.toString();
    });
    return characterArray.join('');
}

import React from 'react';
import { Select } from 'antd';
const Option = Select.Option;

import PropTypes from 'prop-types';

class ConnectionNameSelect extends React.Component {

    constructor (props) {
        super(props);
        this.state = {};

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange (valueObj) {
        //connectionName:'',
        //databaseId:''
        const {setPopupState} = this.props;
        setPopupState({
            databaseId:valueObj.key
        });
    }

    render () {

        const {connectionNames} = this.props;

        const children = connectionNames.map((obj, key) => {

            return <Option
                        key={obj.id}
                        value={obj.id+''}
                        id={obj.id}>{obj.database_name}</Option>
        });

        return (
            <div>
                <Select
                    labelInValue
                    defaultValue={{ key: 'select database name' }} style={{ width: 120 }}
                    style={{ width: 420 }}
                    onChange={this.handleChange}
                >
                    {children}
                </Select>
            </div>
        );
    }
}

export default ConnectionNameSelect;
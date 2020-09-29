import React from "react";

import {Label, MyButton, UserRequired} from "misc";


function makeShares(users, shareDict) {
    const shares = [];
    for (let index = 0, length = users.length; index < length; ++index) {
        const {name, user_id} = users[index];
        if (user_id in shareDict) {
            shares.push(<Label key={user_id}>{name}: ${shareDict[user_id]}</Label>);
        }
    }
    return shares;
}


class BalanceViewer extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            amounts_due: null,
            amounts_owed: null,
        }
    }

    componentDidMount() {
        this.props.addListener("balances", this.updateBalances);
        this.getBalances();
    }

    componentWillUnmount() {
        this.props.removeListener("balances", this.updateBalances);
    };

    getBalances = () => {
        this.props.sendMessage({action: "view_balances"});
    };

    updateBalances = ({net_due, net_owed}) => {
        this.setState({
           amounts_due: net_due,
           amounts_owed: net_owed,
        });
    };

    render() {
        const {amounts_due, amounts_owed} = this.state;
        const {user, users} = this.props;
        return user === null ? UserRequired : (
            <React.Fragment>
                {amounts_due === null && amounts_owed === null
                    ? <Label>All Balances Settled!</Label>
                    : (
                        <React.Fragment>
                            {amounts_owed !== null && (
                                <React.Fragment>
                                    <Label>Amounts Owed:</Label>
                                    {makeShares(users, amounts_owed)}
                                </React.Fragment>
                            )}
                            {amounts_due !== null && (
                                <React.Fragment>
                                    <Label>Amounts Due:</Label>
                                    {makeShares(users, amounts_due)}
                                </React.Fragment>
                            )}
                        </React.Fragment>
                    )
                }
                <br />
                <br />
                <MyButton onClick={this.getBalances} >Refresh</MyButton>
            </React.Fragment>
        );
    }

}

export {BalanceViewer};

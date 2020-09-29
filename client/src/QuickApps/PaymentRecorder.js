import React from "react";

import {MyInput, MyButton, Label, UserRequired, MySelect, MyOption,
        SuccessMessage, ErrorMessage, doFuncOnEnter} from "misc";


function makeUsers(users, self_id) {
    const userOptions = [];
    for (let index = 0, length = users.length; index < length; ++index) {
        const {name, user_id} = users[index];
        if (user_id !== self_id) {
            userOptions.push(<MyOption value={user_id} key={user_id} >{name}</MyOption>);
        }
    }
    return userOptions;
}

class PaymentRecorder extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            lastSuccess: null,
            lastError: null,
        }
        this.amount = React.createRef();
        this.payer = React.createRef();
    }

    componentDidMount() {
        this.props.addListener("payment_success", this.displaySuccess);
        this.props.addListener("payment_error", this.displayError);
    }

    componentWillUnmount() {
        this.props.removeListener("payment_success", this.displaySuccess);
        this.props.removeListener("payment_error", this.displayError);
    }

    displayError = ({message}) => {
        if (message === this.state.lastError) {
            this.setState({lastError: ""}, () => this.setState({lastError: message}));
        } else {
            this.setState({lastSuccess: null, lastError: message});
        }
    };

    displaySuccess = ({message}) => {
        if (message === this.state.lastSuccess) {
            this.setState({lastSuccess: ""}, () => this.setState({lastSuccess: message}));
        } else {
            this.setState({lastSuccess: message, lastError: null});
        }
    };

    checkAmount = () => {
        const valid = /^\$?\d+(?:\.\d\d)?$/.test(this.amount.current.value);
        if (!valid) {
            this.displayError({message: "Amount Must be a Positive Dollar Amount"});
        }
        return valid;
    }

    recordPayment = () => {
        if (this.checkAmount()) {
            this.props.sendMessage({
                action: "record_payment",
                user_id: Number(this.payer.current.value),
                amount: this.amount.current.value,
            })
        }
    };
    recordPaymentOnEnter = doFuncOnEnter(this.recordPayment);

    render() {
        const {lastSuccess, lastError} = this.state;
        const {user, users} = this.props;
        return user === null ? UserRequired : (
            <React.Fragment>
                {lastSuccess !== null && <SuccessMessage key={lastSuccess} >{lastSuccess}</SuccessMessage>}
                {lastError !== null && <ErrorMessage key={lastError} >{lastError}</ErrorMessage>}
                <Label>Payer:</Label>
                <MySelect ref={this.payer} >
                    {makeUsers(users, user.user_id)}
                </MySelect>
                <Label>Amount:</Label>
                <MyInput ref={this.amount} onKeyPress={this.recordPaymentOnEnter} />
                <br />
                <br />
                <MyButton onClick={this.recordPayment} >Submit</MyButton>
            </React.Fragment>
        );
    }

}

export {PaymentRecorder};

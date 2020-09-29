import React from "react";

import {GroupBlock, InlineLabel, Label, MyButton, MyInput,
        ErrorMessage, SuccessMessage, doFuncOnEnter} from "misc";


const defaultName = {name: ""};

class UserManager extends React.Component {

    constructor(props) {
        super(props);
        this.pageMakers = {
            "home": this.makeHomePage,
            "login": this.makeLoginPage,
            "createAccount": this.makeCreateAccountPage,
            "user": this.makeUserPage,
            "changePassword": this.makeChangePassword,
            "changeUsername": this.makeChangeUsername,
        };
        this.state = {
            pageMaker: this.pageMakers[this.props.user === null ? "home" : "user"],
            lastError: null,
            lastSuccess: null,
        };
        this.input1 = React.createRef();
        this.input2 = React.createRef();
        this.input3 = React.createRef();
    }

    componentDidMount() {
        this.props.addListener("account_error", this.displayError);
        this.props.addListener("user_change", this.onUserChange);
    }

    componentWillUnmount() {
        this.props.removeListener("account_error", this.displayError);
        this.props.removeListener("user_change", this.onUserChange);
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

    onUserChange = (message) => {
        console.log("here");
        console.log(message);
        this.changePage(
            message.valid ? "user" : "home",
            "message" in message ? () => this.displaySuccess(message) : null
        );
    };

    changePage = (page, callback=null) => {
        this.setState({
            pageMaker: this.pageMakers[page],
            lastError: null,
            lastSuccess: null,
        }, callback);
    };

    navigateToPage = (event) => {
        this.changePage(event.target.dataset.page);
    };

    requireAllFields = () => {
        this.displayError({message: "Please fill in all fields."});
    };

    makeHomePage = () => {
        return (
            <React.Fragment>
                <MyButton onClick={this.navigateToPage} data-page={"login"}>Login</MyButton>
                <MyButton onClick={this.navigateToPage} data-page={"createAccount"} >Create Account</MyButton>
            </React.Fragment>
        );
    };

    logout = () => {
        this.props.sendMessage({action: "logout"});
    };

    makeUserPage = () => {
        return (
            <React.Fragment>
                <Label>Current User: {(this.props.user || defaultName).name}</Label>
                <br />
                <MyButton onClick={this.navigateToPage} data-page={"changeUsername"} >Change Username</MyButton>
                <MyButton onClick={this.navigateToPage} data-page={"changePassword"} >Change Password</MyButton>
                <br />
                <br />
                <MyButton onClick={this.logout} >Logout</MyButton>
            </React.Fragment>
        );
    };

    requestLogin = () => {
        const username = this.input1.current.value.trim();
        const password = this.input2.current.value.trim();
        if (username && password) {
            this.props.sendMessage({
                action: "login",
                username,
                password,
            });
        } else {
            this.requireAllFields();
        }
    };
    requestLoginOnEnter = doFuncOnEnter(this.requestLogin);


    forgotPassword = () => {
        this.displayError({message: "You're a dud. I didn't actually implement that."});
    };

    makeLoginPage = () => {
        return (
            <React.Fragment>
                <Label>Username:</Label>
                <MyInput onKeyPress={this.requestLoginOnEnter} ref={this.input1} />
                <Label>Password:</Label>
                <MyInput onKeyPress={this.requestLoginOnEnter} ref={this.input2} type={"password"} />
                <br />
                <MyButton onClick={this.requestLogin} >Login</MyButton>
                <br />
                <br />
                <br />
                <GroupBlock>
                    <InlineLabel>Don't have an account?</InlineLabel>
                    <MyButton onClick={this.navigateToPage} data-page={"createAccount"} >Create Account</MyButton>
                </GroupBlock>
                <GroupBlock>
                    <Label>Forgot Password?</Label>
                    <MyButton onClick={this.forgotPassword} >Reset Password</MyButton>
                </GroupBlock>
            </React.Fragment>
        );
    };

    requestAccount = () => {
        let name = this.input1.current.value.trim();
        name = name.charAt(0).toUpperCase() + name.slice(1);
        const username = this.input2.current.value.trim();
        const password = this.input3.current.value.trim();
        if (name && username && password) {
            this.props.sendMessage({
                action: "create_account",
                name,
                username,
                password,
            });
        } else {
            this.requireAllFields();
        }
    };
    requestAccountOnEnter = doFuncOnEnter(this.requestAccount);

    makeCreateAccountPage = () => {
        return (
            <React.Fragment>
                <Label>Name:</Label>
                <MyInput onKeyPress={this.requestAccountOnEnter} ref={this.input1} />
                <Label>Create Username:</Label>
                <MyInput onKeyPress={this.requestAccountOnEnter} ref={this.input2}/>
                <Label>Create Password:</Label>
                <MyInput onKeyPress={this.requestAccountOnEnter} ref={this.input3} type={"password"} />
                <br />
                <MyButton onClick={this.requestAccount} >Create Account</MyButton>
                <br />
                <br />
                <br />
                <InlineLabel>Have an account?</InlineLabel>
                <MyButton onClick={this.navigateToPage} data-page={"login"}>Login</MyButton>
            </React.Fragment>
        );
    };

    changeUsername = () => {
        const password = this.input1.current.value.trim();
        const new_username = this.input2.current.value.trim();
        if (password && new_username) {
            this.props.sendMessage({
                action: "change_username",
                password,
                new_username,
            })
        } else {
            this.requireAllFields();
        }
    };
    changeUsernameOnEnter = doFuncOnEnter(this.changeUsername);

    makeChangeUsername = () => {
        return (
            <React.Fragment>
                <Label>Confirm Password:</Label>
                <MyInput onKeyPress={this.changeUsernameOnEnter} ref={this.input1} type={"password"} />
                <Label>New Username:</Label>
                <MyInput onKeyPress={this.changeUsernameOnEnter} ref={this.input2} />
                <br />
                <MyButton onClick={this.changeUsername} >Change Username</MyButton>
                <br />
                <br />
                <br />
                <MyButton onClick={this.navigateToPage} data-page={"user"} >Cancel</MyButton>
            </React.Fragment>
        );
    };

    changePassword = () => {
        const password = this.input1.current.value;
        const new_password = this.input2.current.value;
        if (password && new_password) {
            this.props.sendMessage({
                "action": "change_password",
                password,
                new_password,
            })
        } else {
            this.requireAllFields();
        }
    };
    changePasswordOnEnter = doFuncOnEnter(this.changePassword);

    makeChangePassword = () => {
        return (
            <React.Fragment>
                <Label>Confirm Password:</Label>
                <MyInput onKeyPress={this.changePasswordOnEnter} ref={this.input1} type={"password"} />
                <Label>New Password:</Label>
                <MyInput onKeyPress={this.changePasswordOnEnter} ref={this.input2} type={"password"} />
                <br />
                <MyButton onClick={this.changePassword} >Change Password</MyButton>
                <br />
                <br />
                <br />
                <MyButton onClick={this.navigateToPage} data-page={"user"} >Cancel</MyButton>
            </React.Fragment>
        );
    };

    render() {
        const {pageMaker, lastSuccess, lastError} = this.state;
        return (
            <React.Fragment>
                {lastSuccess !== null && <SuccessMessage key={lastSuccess} >{lastSuccess}</SuccessMessage>}
                {lastError !== null && <ErrorMessage key={lastError} >{lastError}</ErrorMessage>}
                {pageMaker()}
            </React.Fragment>
        );
    }

}

export {UserManager};

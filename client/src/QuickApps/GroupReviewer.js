import React from "react";
import styled from "styled-components";

import {Label, GroupBlock, MyButton, MyInput, MyImage, UserRequired,
        SuccessMessage, ErrorMessage, doFuncOnEnter, growIn, ipAddress} from "misc"


const UserList = styled.ul`
    vertical-align: top;
    display: inline-block;
	list-style-type: none;
	margin-left: 0.4em;
	font-size: 1.3em;
`;

const InlineIconSvg = styled.svg`
    display: inline-block;
    position: absolute;
    ${({top, left, size}) => `
        top: ${top};
        left: ${left};
        height: ${size};
        width: ${size};
    `}
    animation: ${growIn} 0.2s linear forwards;
`;

const BlockIconSvg = styled.svg`
    display: block;
`

const CardIcon = () => (
    <InlineIconSvg viewBox="0 0 25 25" size={"2em"} top={"0.15em"} left={"0.3em"} >
        <path d="M21,14.36V5.5A1.5,1.5,0,0,0,19.5,4H3.5A1.5,1.5,0,0,0,2,5.5v10A1.5,1.5,0,0,0,3.5,17H16a2.74,2.74,0,0,0,0,.5,3.5,3.5,0,0,0,7,0A3.44,3.44,0,0,0,21,14.36ZM3.5,16a.5.5,0,0,1-.5-.5V8H20v6a2.74,2.74,0,0,0-.5,0,3.47,3.47,0,0,0-3.15,2Zm17.41,1-1.32,1.83a.52.52,0,0,1-.41.21h0a.47.47,0,0,1-.4-.22l-.68-1a.5.5,0,1,1,.82-.56l.28.41.9-1.25a.5.5,0,1,1,.82.58ZM8,12.5a.5.5,0,0,1-.5.5h-3a.5.5,0,0,1,0-1h3A.5.5,0,0,1,8,12.5Z" />
    </InlineIconSvg>
);

const ReadyIcon = () => (
    <InlineIconSvg viewBox={"0 0 24 24"} size={"1.5em"} top={"0.3em"} left={"0.5em"} >
        <path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/>
    </InlineIconSvg>
);

const User = styled.li`${({isOnline}) => `
    display: block;
    padding: 0.5em 1em 0.5em 2.5em;
    position: relative;
    border: 2px solid #444444;
    &:first-child {
        border-top-right-radius: 4px;
        border-top-left-radius: 4px;
    }
    &:last-child {
        border-bottom-right-radius: 4px;
        border-bottom-left-radius: 4px;
    }
    &:not(:last-child) {
        border-bottom-style: none;
    }
    transition: backdrop-filter 0.5s;
    ${isOnline ? `
        
    ` : `
        backdrop-filter: brightness(0.75);
    `}
`}`;

const AnchorDiv = styled.div`
    position: relative;
`;

const ClaimedItemMessage = styled.div`
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: deepSkyBlue;
    animation: ${growIn} 0.2s linear forwards;
`;

function makeUsers(all, online, active, ActiveIcon) {
    const users = new Array(all.length);
    for (let index = all.length - 1; index >= 0; --index) {
        const {name, user_id} = all[index];
        users[index] = (
            <User key={user_id} isOnline={online.has(user_id)} >
                {active.has(user_id) && <ActiveIcon />}
                {name}
            </User>
        );
    }
    return <UserList>{users}</UserList>;
}

function makeShares(users, self_id, payer_id, shares) {
    let payerLabel = null;
    let userLabel = null;
    const shareLabels = []
    for (let index = 0, length = users.length; index < length; ++index) {
        const {name, user_id} = users[index];
        if (user_id === payer_id) {
            payerLabel = <Label>Payer: {name}</Label>
        } else if (user_id in shares) {
            if (self_id === user_id) {
                userLabel = <Label>Your Share: ${shares[user_id]}</Label>
            } else {
                shareLabels.push(<Label key={user_id}>{name}: ${shares[user_id]}</Label>);
            }
        }
    }
    return (
        <React.Fragment>
            {payerLabel}
            <br />
            {userLabel && (
                <React.Fragment>
                    {userLabel}
                    <br />
                </React.Fragment>
            )}
            {shareLabels.length > 0 && (
                <React.Fragment>
                    <Label>Other Shares:</Label>
                    {shareLabels}
                </React.Fragment>
            )}
        </React.Fragment>
    );
}

function fixItem(item) {
    item.src = `http://${ipAddress}:8000/${item.src}`;
    const price = Number(item.price);
    item.total_price = (item.count * price * (item.taxed ? 1.08 : 1)).toFixed(2);
    item.taxed = item.taxed ? "Yes" : "No";
    item.price = price.toFixed(2);
}

class GroupReviewer extends React.Component {

    constructor(props) {
        super(props);
        this.pageMakers = {
            "join": this.makeJoinPage,
            "ready": this.makeReadyPage,
            "item": this.makeItemViewingPage,
            "finished": this.makeFinishedPage,
        };
        this.state = {
            pageMaker: this.pageMakers.join,
            lastError: null,
            lastSuccess: null,
            lobbies: new Set(),
            onlineUsers: null,
            activeUsers: null,
            time: null,
            item: null,
            itemClaimerName: null,
        };
        this.inLobby = false;
        this.input1 = React.createRef();
        this.listeners = [
            ["lobby_init", this.onLobbyJoin],
            ["lobby_user_change", this.onLobbyUserChange],
            ["lobby_time_change", this.onLobbyTimeChange],
            ["lobby_item_change", this.onLobbyItemChange],
            ["lobby_finished", this.onLobbyFinish],
            ["lobby_error", this.displayError],
            ["lobby_item_claim", this.onLobbyItemClaim],
        ];
    };

    componentDidMount() {
        for (let index = this.listeners.length - 1; index >= 0; --index) {
            const [type, callback] = this.listeners[index];
            this.props.addListener(type, callback);
        }
        fetch(`http://${ipAddress}:8000/cost_claimer/valid_receipts/`)
        .then(response => response.json())
        .then(data => this.setState({lobbies: new Set(data)}));
    };

    componentWillUnmount() {
        for (let index = this.listeners.length - 1; index >= 0; --index) {
            const [type, callback] = this.listeners[index];
            this.props.removeListener(type, callback);
        }
        if (this.pageMaker !== this.makeJoinPage) {
            this.leaveLobby();
        }
    };

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

    changePage = (page) => {
        this.setState({
            pageMaker: this.pageMakers[page],
            lastError: null,
            lastSuccess: null,
        });
    };

    navigateToPage = (event) => {
        this.changePage(event.target.dataset.page);
    };

    requireAllFields = () => {
        this.displayError({message: "Please fill in all fields."});
    };

    onLobbyJoin = ({lobby_state: {all_users, active_users, time, item, exclusive_active_user}}) => {
        this.inLobby = true;
        if (item !== null) {
            fixItem(item);
        }
        const {user: {user_id: self_id}} = this.props;
        this.setState(({
            onlineUsers: new Set(all_users),
            activeUsers: new Set(active_users),
            time,
            item,
            itemClaimerName: exclusive_active_user === null
                ? null
                : exclusive_active_user.user_id === self_id ? "You are" : `${exclusive_active_user.name} is`,
            pageMaker: this.pageMakers[item === null ? "ready" : "item"],
            lastError: null,
            lastSuccess: null,
        }));
    };

    onLobbyUserChange = ({all_users, active_users}) => {
        this.setState({onlineUsers: new Set(all_users), activeUsers: new Set(active_users)});
    }

    onLobbyTimeChange = ({time}) => {
        this.setState({time});
    };

    onLobbyItemChange = ({item, active_users}) => {
        fixItem(item);
        this.setState(({pageMaker}) => {
            if (pageMaker !== this.makeItemViewingPage) {
                return {
                    item,
                    activeUsers: new Set(active_users),
                    pageMaker: this.pageMakers.item,
                    lastError: null,
                    lastSuccess: null,
                    time: null,
                    itemClaimerName: null,
                };
            } else {
                return {item, activeUsers: new Set(active_users), time: null, itemClaimerName: null};
            }
        });
    };

    onLobbyItemClaim = ({user: {user_id, name}}) => {
        const {user: {user_id: self_id}} = this.props;
        this.setState({
            itemClaimerName: user_id === self_id ? "You are" : `${name} is`,
        });
    }

    onLobbyFinish = ({payer, shares}) => {
        this.setState({
            payer,
            shares,
            pageMaker: this.pageMakers.finished,
        })
    };

    joinLobby = () => {
        const receipt_date = this.input1.current.value.trim();
        if (receipt_date) {
            if (this.state.lobbies.has(receipt_date)) {
                this.props.sendMessage({
                    action: "join_lobby",
                    receipt_date,
                })
            } else {
                this.displayError({message: "Receipt Date Not Found"});
            }
        } else {
            this.requireAllFields();
        }
    };
    joinLobbyOnEnter = doFuncOnEnter(this.joinLobby);

    makeJoinPage = () => {
        return (
            <React.Fragment>
                <Label>Receipt Date (YYYY-MM-DD):</Label>
                <MyInput onKeyPress={this.joinLobbyOnEnter} ref={this.input1} />
                <br />
                <MyButton onClick={this.joinLobby} >Join</MyButton>
            </React.Fragment>
        )
    };

    leaveLobby = () => {
        if (this.inLobby) {
            this.inLobby = false;
            this.props.sendMessage({action: "leave_lobby"});
            this.changePage("join");
        }
    };

    changeStatus = (event) => {
        const {activeUsers} = this.state;
        const {user: {user_id: self_id}} = this.props;
        const new_status = event.target.dataset.status;
        if (activeUsers.has(self_id)) {
            if (new_status === "false") {
                this.setState(({activeUsers}) => {
                    activeUsers.delete(self_id);
                    return {activeUsers};
                });
                this.props.sendMessage({
                    action: "change_status",
                    new_status,
                })
            }
        } else if (new_status === "true") {
            this.setState(({activeUsers}) => {
                activeUsers.add(self_id);
                return {activeUsers};
            });
            this.props.sendMessage({
                action: "change_status",
                new_status,
            })
        }
    };

    claimItem = () => {
        this.setState({itemClaimerName: "You are"});
        this.props.sendMessage({
            action: "claim_item",
            "item_id": this.state.item.id,
        })
    }

    makeReadyPage = () => {
        const {onlineUsers, activeUsers, time} = this.state;
        const {user: {user_id: self_id}, users} = this.props;
        return (
            <React.Fragment>
                <GroupBlock extra={"vertical-align: bottom;"} >
                    <Label>{time === null ? "\u00A0" : `Starting in ${time}...`}</Label>
                    {activeUsers.has(self_id) ? (
                        <MyButton onClick={this.changeStatus} data-status={"false"} minWidth={"12ch"} >Not Ready?</MyButton>
                    ) : (
                        <MyButton onClick={this.changeStatus} data-status={"true"} minWidth={"12ch"} >Ready?</MyButton>
                    )}
                </GroupBlock>
                {makeUsers(users, onlineUsers, activeUsers, ReadyIcon)}
            </React.Fragment>
        )
    };

    makeItemViewingPage = () => {
        const {onlineUsers, activeUsers, time, item, itemClaimerName} = this.state;
        const {user: {user_id: self_id}, users} = this.props;
        const {name, src, count, price, taxed, total_price} = item;
        return (
            <AnchorDiv>
                <MyImage
                    src={src}
                    alt={name}
                    extra={"vertical-align: top; width: 180px; height: 180px;"}
                />
                <GroupBlock extra={"max-width: 45%; white-space: nowrap;"} >
                    <Label extra={"text-overflow: ellipsis; overflow: hidden;"} >Item: {name}</Label>
                    <Label>Price Per Item: ${price}</Label>
                    <Label>Count: {count}</Label>
                    <Label>Taxed: {taxed}</Label>
                    <Label>Total Cost: ${total_price}</Label>
                    <br />
                    <Label>{time === null ? "\u00A0" : `Showing next item in ${time}...`}</Label>
                    {activeUsers.has(self_id) ? (
                        <MyButton onClick={this.changeStatus} data-status={"false"} minWidth={"12ch"} >
                            Stop Splitting This
                        </MyButton>
                    ) : (
                        <MyButton onClick={this.changeStatus} data-status={"true"} minWidth={"12ch"} >
                            Split This
                        </MyButton>
                    )}
                    <MyButton onClick={this.claimItem} minWidth={"12ch"} >Pay For This</MyButton>
                </GroupBlock>
                {makeUsers(users, onlineUsers, activeUsers, CardIcon)}
                {itemClaimerName && <ClaimedItemMessage>
                    {itemClaimerName} paying for this!
                </ClaimedItemMessage>}
            </AnchorDiv>
        );
    };

    makeFinishedPage = () => {
        const {payer, shares} = this.state;
        const {user, users} = this.props;
        return (
            <React.Fragment>
                <Label>Review Finished</Label>
                <br />
                {makeShares(users, user.user_id, payer, shares)}
                <br />
                <br />
                <br />
                <MyButton onClick={this.navigateToPage} data-page={"join"}>Join New Lobby</MyButton>
            </React.Fragment>
        );
    };

    render() {
        const {pageMaker, lastSuccess, lastError} = this.state;
        const {user} = this.props;
        return user === null ? UserRequired : (
            <React.Fragment>
                {lastSuccess !== null && <SuccessMessage key={lastSuccess} >{lastSuccess}</SuccessMessage>}
                {lastError !== null && <ErrorMessage key={lastError} >{lastError}</ErrorMessage>}
                {pageMaker()}
            </React.Fragment>
        );
    }

}

export {GroupReviewer};

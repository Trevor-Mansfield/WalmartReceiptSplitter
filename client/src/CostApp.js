import React from "react";

import {ipAddress, ListenerManager, Background, Collapsible} from "misc";
import {BalanceViewer, Console, GroupReviewer, PaymentRecorder, UserManager} from "./QuickApps";


class CostApp extends React.Component {

    static redactedKeys = ["username", "new_username", "password", "new_password"];

    constructor(props) {
        super(props);
        this.state = {
            socket: {readyState: 4},
            user: null,
            users: null,
        }
        this.listenerManager = new ListenerManager();
    }

    componentDidMount() {
        this.connect();
        this.listenerManager.addListener("user_change", this.updateUser);
    }

    componentWillUnmount() {
        if (this.state.socket.readyState) {
            if (this.state.socket.readyState < 2) {
                this.state.socket.close();
            }
        }
    }

    updateUser = (message) => {
        if (message.valid) {
            if ("user" in message) {
                this.setState({user: message.user});
            }
        } else {
            this.setState({user: null});
        }
    };

    connect = () => {
		this.closeSocket();

		const socket = new WebSocket(`ws://${ipAddress}:8000/ws/cost_claimer/group_view/`);

		socket.onopen = () => {
			this.setState(({socketLog}) => ({socketLog: `${socketLog}\n[Info] Opened new socket.`}));
		};

		socket.onmessage = (event) => {
			this.setState(({socketLog}) => ({socketLog: `${socketLog}\n[Received] ${event.data}`}));
			this.listenerManager.notifyListeners(event.data);
		};

		socket.onerror = (event) => {
			console.error(event);
			socket.close();
		};

		socket.onclose = () => {
		    this.setState(({socketLog}) => ({
                socketLog: `${socketLog}\n[Info] Socket disconnected.`,
		    }));
		    this.listenerManager.notifyListeners(JSON.stringify({
                type: "user_change",
                valid: false,
            }));
		    this.listenerManager.notifyListeners(JSON.stringify({
                type: "account_error",
                message: "Connection Lost",
            }));
		    // alert("There is no active connection to the server. Some things may not function properly.");
		};

		this.setState({socket, socketLog: "[Info] Trying to open new socket..."});

		fetch(`http://${ipAddress}:8000/cost_claimer/users/`)
        .then(response => response.json())
        .then(users => {
            this.setState({
                users: users.sort((e1, e2) => e1.user_id - e2.user_id),
            });
        });
	};

	closeSocket = () => {
        if (this.state.socket.readyState < 2) {
			this.state.socket.close();
		}
    };

	sendMessage = (messageObject) => {
		const {socket} = this.state;
		if (socket.readyState === 1) {
			let messageString = JSON.stringify(messageObject);
			socket.send(messageString);
			for (let index = CostApp.redactedKeys.length - 1; index >= 0; --index) {
			    const redactedKey = CostApp.redactedKeys[index];
			    if (redactedKey in messageObject) {
			        messageObject[redactedKey] = "<redacted>";
                }
            }
			this.setState(({socketLog}) => ({socketLog: `${socketLog}\n[Sent] ${JSON.stringify(messageObject)}`}));
		} else {
		    alert("This action requires an active connection to the server. Try reconnecting in the Console tab.");
        }
	};

    render() {
        const {socket, socketLog, user, users} = this.state;
        return (
            <Background>
                <Collapsible header={"User Settings"} isOpenByDefault={true} >
                    <UserManager
                        user={user}
                        addListener={this.listenerManager.addListener}
                        sendMessage={this.sendMessage}
                        removeListener={this.listenerManager.removeListener}
                    />
                </Collapsible>
                <Collapsible header={"Receipt Review"} >
                    <GroupReviewer
                        user={user}
                        users={users}
                        addListener={this.listenerManager.addListener}
                        sendMessage={this.sendMessage}
                        removeListener={this.listenerManager.removeListener}
                    />
                </Collapsible>
                <Collapsible header={"View Balances"} >
                    <BalanceViewer
                        user={user}
                        users={users}
                        addListener={this.listenerManager.addListener}
                        sendMessage={this.sendMessage}
                        removeListener={this.listenerManager.removeListener}
                    />
                </Collapsible>
                <Collapsible header={"Acknowledge Payment"} >
                    <PaymentRecorder
                        user={user}
                        users={users}
                        addListener={this.listenerManager.addListener}
                        sendMessage={this.sendMessage}
                        removeListener={this.listenerManager.removeListener}
                    />
                </Collapsible>
                <Collapsible header={"Console"} >
                    <Console
                        socket={socket}
                        socketLog={socketLog}
                        connect={this.connect}
                        closeSocket={this.closeSocket}
                        sendMessage={this.sendMessage}
                    />
                </Collapsible>
            </Background>
        );
    }

}

export {CostApp};

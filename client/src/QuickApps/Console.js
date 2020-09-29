import React from "react";

import {Label, MyInput, Log, MyButton} from "misc";


const WebSocketStatuses = {
	"0": "CONNECTING",
	"1": "OPEN",
	"2": "CLOSING",
	"3": "CLOSED",
	"4": "UNOPENED",
};


class Console extends React.Component {

    constructor(props) {
        super(props);
        this.socketFields = React.createRef();
    }

    sendManualMessage = () => {
        const {current: {children: fields}} = this.socketFields;
        const newMessage = {};
        for (let index = 0; index < fields.length; index += 3) {
            const header = fields[index].value.trim();
            if (header) {
                newMessage[header] = fields[index + 1].value.trim();
            }
        }
        if ("action" in newMessage) {
            this.clearFields();
            this.props.sendMessage(newMessage);
        }
    };

    sendManualMessageOnEnter = (event) => {
        if (event.which === 13) {
            this.sendManualMessage();
        }
    };

	clearFields = () => {
        const {current: {children: fields}} = this.socketFields;
        for (let index = 1; index < fields.length; ++index) {
            if (index % 3 !== 2) {
                fields[index].value = "";
            }
        }
    };

    render() {
        const {socket, socketLog, connect, closeSocket} = this.props;
        return (
            <React.Fragment>
                <Label>Socket Status: {WebSocketStatuses[socket.readyState]}</Label>
                    <MyButton onClick={connect} >Reconnect</MyButton>
                    <MyButton onClick={closeSocket} disabled={socket.readyState !== 1} >Close</MyButton>
                    <br />
                    <br />
                    <span ref={this.socketFields} onKeyPress={this.sendManualMessageOnEnter} >
                        <MyInput value={"action"} readOnly={true} />
                        <MyInput />
                        <br />
                        <MyInput />
                        <MyInput />
                        <br />
                        <MyInput />
                        <MyInput />
                        <br />
                        <MyInput />
                        <MyInput />
                    </span>
                    <br />
                    <MyButton onClick={this.clearFields} >Clear</MyButton>
                    <MyButton onClick={this.sendManualMessage} disabled={socket.readyState !== 1} >Send</MyButton>
                    <br />
                    <br />
                    <Label>Log:</Label>
                    <Log>{socketLog}</Log>
            </React.Fragment>
        );
    }
}

export {Console};

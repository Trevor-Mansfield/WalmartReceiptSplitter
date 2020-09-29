import React from "react";
import styled, {ThemeProvider, keyframes} from "styled-components";


const MyTheme = {
	primary: "#5DDC20",
	backgroundLight: "#f8fff5",
	backgroundDark: "#19261A",
	secondaryLight: "#4BB3B8",
	secondaryDark: "#07949B",
};

const BackgroundDiv = styled.div`
    display: inline-block;
    height: 100%;
    width: 100%;
    background-color: ${({theme}) => theme.backgroundLight};
`;

const Background = ({children}) => (
    <ThemeProvider theme={MyTheme} >
        <BackgroundDiv>
            {children}
        </BackgroundDiv>
    </ThemeProvider>
);

const MyInput = styled.input`
	display: inline-block;
	width: 300px;
	margin: 0.25em;
	padding: 0.4em;
	font-family: "Roboto Mono", monospace;
	border: 1px solid #444444;
	border-radius: 1px;
	&:read-only {
		background: #EEEEEE;
	}
`;

const Log = styled.samp`
	display: inline-block;
	width: 65%;
	height: 400px;
	overflow: scroll;
	background-color: #EEEEEE;
	font-size: 80%;
	user-select: none;
	white-space: pre;
	margin: 0.2em;
`;

const MyImage = styled.img`
    ${({extra}) => extra || ""}
`;

const MyButton = styled.button`${({theme, minWidth}) => `
    padding: 0.3em 0.65em;
    margin: 0.25em;
    background-color: ${theme.secondaryDark};
    border: 1px solid ${theme.backgroundDark};
    border-radius: 2px;
    cursor: pointer;
    color: white;
    ${minWidth ? `min-width: ${minWidth};` : ""}
    transition: background-color 0.1s linear;
    &:hover:not(:disabled) {
		background-color: ${theme.secondaryLight};
	}
	&:active:not(:disabled) {
	    filter: brightness(1.05);
	}
	&:disabled {
		filter: opacity(0.4);
		cursor: default;
	}
`}`;

const MySelect = styled.select`
    display: inline-block;
    width: 300px;
	margin: 0.25em;
	padding: 0.4em;
	border: 1px solid #444444;
	border-radius: 1px;
`;

const MyOption = styled.option`
    width: 300px;
	margin: 0.25em;
	padding: 0.4em;
	border: 1px solid #444444;
	border-radius: 1px;
`;

const Label = styled.p`
    margin: 0.2em;
    ${({extra}) => extra || ""}
`;

const InlineLabel = styled(Label)`
	width: max-content;
`;

const GroupBlock = styled.span`
	display: inline-block;
	margin-right: 1em;
	${({extra}) => extra || ""}
`;

const growIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`

const Message = styled.div`
    border-radius: 3px;
    width: max-content;
    padding: 0.5em;
    margin: 0.2em 0.2em 0.5em 0.2em;
    animation: ${growIn} 0.4s linear forwards;
`;

const ErrorMessage = styled(Message)`
    background-color: red;
`;

const SuccessMessage = styled(Message)`
    background-color: lawnGreen;
`;

function doFuncOnEnter(func) {
    return (event) => {
        if (event.which === 13) {
            func(event);
        }
    }
}

const UserRequired = <Label>You must be logged in to do this.</Label>;

export {Background, GroupBlock, MyInput, MyButton, Label, InlineLabel, Log, MyImage, MySelect, MyOption,
	    ErrorMessage, SuccessMessage, doFuncOnEnter, UserRequired, growIn};

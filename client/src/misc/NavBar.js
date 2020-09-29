import React from "react";
import styled from "styled-components";


const Nav = styled.nav`${({theme}) => `
	background-color: ${theme.primary};
	display: flex;
	justify-content: space-between;
`}`;

const NavGroup = styled.ul`${props => `
	display: inline-block;
	list-style-type: none;
	${props.extra || ""}
`}`;

const NavItem = styled.li`
	padding: 0.6em 0.8em;
	display: inline-block;
	cursor: pointer;
	user-select: none;
	&:hover {
		backdrop-filter: brightness(1.1);
	}
`;

function makeNavList(items) {
    const navList = new Array(items.length);
    for (let index = items.length - 1; index >= 0; --index) {
        const [node, page_id] = items[index];
        navList[index] = <NavItem key={index} data-label={page_id} >{node}</NavItem>
    }
    return navList;
}

class NavBar extends React.Component {

    checkLabel = ({target: {dataset}}) => {
        if ("label" in dataset) {
            this.props.change_page(dataset.label);
        }
    }

    render() {
        const [leftItems, rightItems] = this.props.items;
        return (
            <Nav onClick={this.checkLabel} >
                <NavGroup>
                    {makeNavList(leftItems)}
                </NavGroup>
                <NavGroup>
                    {makeNavList(rightItems)}
                </NavGroup>
            </Nav>
        )
    }

}

export {NavBar};

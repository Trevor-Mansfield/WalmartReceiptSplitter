import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";


const CollapsibleBox = styled.div`
    
`;

const CollapsibleHeader = styled.div`
    padding: 0.6em 0.8em;
    background-color: ${({theme}) => theme.primary};
    box-shadow: 0 -3px 12px 0 rgba(0, 0, 0, 0.2) inset, 0 3px 12px 0 rgba(255, 255, 255, 0.1) inset;
	cursor: pointer;
	user-select: none;
`;

const CollapsibleContent = styled.div`
    /* box-shadow: 0 0 12px 4px rgba(0, 0, 0, 0.2) inset; */
    padding: 0.5em 0.8em;
`;

const DropdownArrow = ({open}) => (
    <DropdownArrowBox>
        <DropdownInnerArrow open={open} />
    </DropdownArrowBox>
);

const DropdownArrowBox = styled.div`
    display: inline-block;
    margin-right: 0.8em;
`;

const DropdownInnerArrow = styled.span`
    display: inline-block;
    border: solid black;
    padding: 3px;
    margin-bottom: 1px; 
    border-width: 0 3px 3px 0;
    transform: ${({open}) => open
        ? "rotate(45deg) translateY(-30%)"
        : "rotate(-45deg)"
    };
    transition: transform 0.3s;
`;


class Collapsible extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            open: this.props.isOpenByDefault,
            contentOffset: 0,
        }
    }

    toggleBox = () => {
        if (this.state.open) {
            this.setState({open: false});
        } else {
            this.setState({open: true});
        }
    };

    render() {
        const {header, children} = this.props;
        const {open} = this.state;
        return (
            <CollapsibleBox>
                <CollapsibleHeader onClick={this.toggleBox} >
                    <DropdownArrow open={open} />
                    {header}
                </CollapsibleHeader>
                {open && (
                    <CollapsibleContent>
                        {children}
                    </CollapsibleContent>
                )}
            </CollapsibleBox>
        );
    }

}

Collapsible.propTypes = {
    header: PropTypes.node.isRequired,
    isOpenByDefault: PropTypes.bool,
};

Collapsible.defaultProps = {
    isOpenByDefault: false,
}

export {Collapsible};

import styled from "styled-components";
import React from "react";

export const Separator = styled.div`
	width: 2px;
	height: 80%;
	background-color: #ccc;
`;

export const Section = styled.div`
	height: calc(100% - var(--root-nav));
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: #222;

	color: #ccc;
`;

export const ListBox = styled.div`
	margin-top: 4px;
	width: 100%;
	flex-grow: 1;
`;

export const Icon = ({ children, className, onClick }) => (
	<span className={`${className} material-icons`} onClick = {onClick} >{children}</span>
);

export const RolledIcon = styled(Icon)`
	animation: roll 1s infinite;

	@keyframes roll {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(-180deg);
		}
	}
`;


export const Blink = styled(Icon)`
	&.blink {
		animation: blink-anim 1s infinite alternate;
	}

	@keyframes blink-anim {
		0% {
			color: #ccc;
		}
		100% {
			color: #cc2222;
		}
	}
`;


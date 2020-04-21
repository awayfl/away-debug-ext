import styled from "styled-components";
import React from "react";

export const ItemContainer = styled.span`
	display: block;
	border-bottom: 1px solid #444;
	line-height: 20px;
	color: #ccc;
	font-size: 12px;
	padding: 0 2px;

	&.indexed:before {
		content: attr(data-index);
		position: relative;
		margin: 0 1em 0 0.25em;
		padding: 0 0.25em;
		display: inline-block;
		user-select: none;
		font-style: italic;
		font-weight: bolder;
		background-color: #ccc;
		border-radius: 8px;
		color: #222;
	}
`;

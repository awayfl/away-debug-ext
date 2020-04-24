import React from "react";
import styled from 'styled-components';

export const Label = styled.div`
	height: 24px;
	margin: 4px;
	border-radius: 4px;
	display: flex;
	justify-content: center;
	font-size: 16px;
	user-select: none;
	flex-shrink: 0;
	background-color: #222;
	color: #ccc;
	
	&.right {
		margin-left: auto;
	}
	
	&.red {
		color: #cc2222;
	}
	&.green {
		color: #22cc22;
	}
`
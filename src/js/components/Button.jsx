import React from "react";
import styled from "styled-components";

import { Label } from "./Label.jsx";

export const Button = styled(Label)`
	min-width: 100px;
	cursor: pointer;
	transition: color 0.5s, background-color 0.5s, transform: 0.2s;

	&.active, :hover {
		background-color: #ccc;
		color: #222;
	}
	
	&.locked {		
		pointer-events: none;
		opacity: 0.5;
	}

	:active {
		transform: scale(0.95);
	}

	&.tiny {
		min-width: 48px;
	}
`;

import React from "react";
import styled from "styled-components";

import { Label } from "./Label.jsx";

export const Button = styled(Label)`
	min-width: 100px;
	cursor: pointer;

	&.active, :hover {
		background-color: #ccc;
		color: #222;
		transition: color 0.5s, background-color 0.5s;
	}
	
	&.locked {		
		pointer-events: none;
		opacity: 0.5;
	}

	&.tiny {
		min-width: 48px;
	}
`;

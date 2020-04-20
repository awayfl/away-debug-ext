import React, { Component } from "react";
import InfiniteScroll from 'react-infinite-scroll-component';
import { Button } from "./Button.jsx";
import { Label } from "./Label.jsx";
import styled from "styled-components";

const MODES = {
	Runtime: 1,
	Execution: 2,
	Interpreter: 4,
};

const Icon = ({ children, className }) => (
	<span className={`${className} material-icons`}>{children}</span>
);
const Blink = styled(Icon)`
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

const Separator = styled.div`
	width: 2px;
	height: 80%;
	background-color: #ccc;
`;

const LoggerNav = ({ logTypes = [], onCapture, onMode, isCapture }) => {
	const _buttons = Object.keys(MODES).map((name) => {
		const id = MODES[name];
		const active = logTypes.includes(id);
		return (
			<Button
				className={`writers ${active && "active"} ${
					isCapture && "locked"
				}`}
				key={name}
				onClick={() => onMode(id)}
			>
				{name}
			</Button>
		);
	});

	return (
		<nav className="sub ">
			<Button
				id="capture_button"
				onClick={onCapture}
				className={isCapture && "active"}
			>
				<span> {isCapture ? "Stop" : "Capture"}</span>
				<Blink className={`${isCapture && "blink"}`}>
					fiber_manual_record
				</Blink>
			</Button>

			<Separator />
			<Button className="tiny">
				<Icon>cached</Icon>
			</Button>
			<Separator />

			<Label className="right">Mode:</Label>
			{_buttons}
		</nav>
	);
};

export class Logger extends Component {
	constructor(props) {
		super(props);

		this.state = {
			logTypes: [MODES.Runtime],
			isCapture: false,
		};

		this._devApi = props.devApi;
		this._logType = 0;
	}

	/**
	 * emited message from devApi or root service
	 * @param {string} type
	 */
	onEmit(type, data) {}

	/**
	 * Called if changed
	 * @param {IDevToolAPI} devApi
	 */
	onInit(devApi) {
		this._devApi = devApi;
	}

	// emited when devApi is detached
	onDetach() {
		this._devApi = undefined;
		this.setState({
			isCapture: false,
		});
	}

	onCapture() {
		this.setState({
			isCapture: !this.state.isCapture,
		});
	}

	onMode(modeIndex) {
		let logTypes = this.state.logTypes.slice();

		if (!logTypes.includes(modeIndex)) {
			logTypes.push(modeIndex);
		} else {
			logTypes = logTypes.filter((e) => e !== modeIndex);
		}

		if (!logTypes.length) {
			logTypes.push(MODES.Runtime);
		}

		this._logType = 0;
		logTypes.forEach((e) => {
			this._logType = e | this._logType;
		});

		this.setState({
			logTypes,
		});
	}

	render() {
		const { isCapture, logTypes } = this.state;

		return (
			<section>
				<LoggerNav
					isCapture={isCapture}
					logTypes={logTypes}
					onCapture={() => this.onCapture()}
					onMode={(v) => this.onMode(v)}
				/>
				<div className="list" id="log-list"></div>
			</section>
		);
	}
}

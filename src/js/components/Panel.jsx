import React, { Component, createRef, Fragment } from "react";

import { Button } from "./Button.jsx";
import { Logger } from "./Logger.jsx";
import styled from "styled-components";

const _TABS = {
	Logger: Logger,
};

const Overlay = styled.div`
	top: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(22, 22, 22, 0.9);
	position: fixed;
	z-index: 100;
	display: flex;
`;

const Box = styled.div`
	min-width: 100px;
	margin: auto;
	color: #ccc;
	font-size: 28px;
`;

export class Panel extends Component {
	constructor(props) {
		super(props);

		this.state = {
			currentTab: Object.keys(_TABS)[0],
			attached: false,
		};

		/**
		 * @type {IDevToolAPI}
		 */
		this._devApi = undefined;
		this.activeTabRef = createRef();

		window.PANEL_API = {
			init: this.onInit.bind(this),
			detach: this.onDetach.bind(this),
			emit: this.onEmit.bind(this),
		};
	}

	/**
	 * emited from provider
	 * @param {string} type
	 */
	onEmit(type, data) {
		const tab = this.activeTabRef.current;
		tab.onEmit && tab.onEmit(type, data);
	}

	/**
	 *
	 * @param {IDevToolAPI} devApi
	 */
	onInit(devApi) {
		this._devApi = devApi;

		const tab = this.activeTabRef.current;
		tab.onInit && tab.onInit(this._devApi);

		this._devApi.getStatus().then((status)=>{			
			this.setState({
				attached: status,
			});
		})
	}

	// emited from dev provider
	onDetach() {
		const tab = this.activeTabRef.current;
		tab.onDetach && tab.onDetach();
		this.setState({
			attached: false,
		});
	}

	switchTab(name) {
		this.setState({
			currentTab: name,
		});
	}

	render() {
		const buttons = Object.keys(_TABS).map((name) => (
			<Button
				key={name}
				onClick={() => this.switchTab(name)}
				className={this.state.currentTab === name ? "active" : ""}
			>
				{name}
			</Button>
		));
		const ActiveTab = _TABS[this.state.currentTab];

		return (
			<Fragment>
				<nav className="main">
					<div className="nav-wrap">
						<div className="logo"></div>
						{buttons}
					</div>
					<div
						id="online_status"
						className={this.state.attached ? "green" : "red"}
					>
						{this.state.attached ? "CONNECTED" : "NOT CONNECTED"}
					</div>
				</nav>
				<ActiveTab ref={this.activeTabRef} devApi={this._devApi} />
				{this.state.attached || (
					<Overlay>
						<Box>
							<div>AWAY Debug API not found or detached!</div>
							<Button>Try Reconnect</Button>
						</Box>
					</Overlay>
				)}
			</Fragment>
		);
	}
}

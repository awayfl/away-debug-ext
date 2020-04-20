import React, { Component } from "react";

import { Button } from "./Button.jsx";
import { Logger } from "./Logger.jsx";

const _TABS = {
	Logger: Logger,
};

export class Panel extends Component {
	constructor(props) {
		super(props);

		this.state = {
			currentTab: Object.keys(_TABS)[0],
			connected: false,
		};
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
			<div className="navbar-fixed">
				<nav className="main">
					<div className="nav-wrap">
						<div className="logo"></div>
						{buttons}
					</div>
					<div
						id="online_status"
						className={this.state.connected ? "green" : "red"}
					>
						{this.state.connected ? "CONNECTED" : "NOT CONNECTED"}
					</div>
				</nav>
				<ActiveTab />
			</div>
		);
	}
}

import "react-virtualized/styles.css";

import React, { Component, createRef, Fragment } from "react";

import { Button } from "./Button.jsx";
import { Logger } from "./Logger.jsx";
import styled from "styled-components";
import { Icon } from "./SectionItems.jsx";

const CONNECTION_STATUS = {
	OFFLINE: "offline",
	ONLINE: "online",
	CONNECTION: "connection",
};

const ATTEMTS = 100;
const _TABS = {
	Logger: Logger,
};

const RolledIcon = styled(Icon)`
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

export class Panel extends Component {
	constructor(props) {
		super(props);

		this.state = {
			currentTab: Object.keys(_TABS)[0],
			connection: CONNECTION_STATUS.OFFLINE,
			attemts: 0,
		};

		/**
		 * @type {IDevToolAPI}
		 */
		this._devApi = undefined;
		this.activeTabRef = createRef();
		this._reconectionTimeout = undefined;

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

		this._runReconnection();
	}

	// emited from dev provider
	onDetach() {
		const tab = this.activeTabRef.current;

		tab.onDetach && tab.onDetach();

		this.setState({
			attached: false,
		});

		setTimeout(() => {
			this.onReconnect();
		}, 1000);
	}

	switchTab(name) {
		this.setState({
			currentTab: name,
		});
	}

	onReconnect() {
		this._runReconnection();
	}

	_runReconnection() {
		clearTimeout(this._reconectionTimeout);

		if (
			this.state.connection === CONNECTION_STATUS.ONLINE ||
			!this._devApi
		) {
			return;
		}

		const attemts = this.state.attemts;

		if (attemts >= ATTEMTS) {
			this.setState({
				attemts: 0,
				connection: CONNECTION_STATUS.OFFLINE,
			});
			return;
		}

		this._devApi.tryConnect().then((status) => {
			clearTimeout(this._reconectionTimeout);

			if (status) {
				this.setState({
					connection: CONNECTION_STATUS.ONLINE,
					attemts: 0,
				});
			} else {
				this.setState({
					connection: CONNECTION_STATUS.CONNECTION,
					attemts: attemts + 1,
				});

				this._reconectionTimeout = setTimeout(() => {
					this._runReconnection();
				}, attemts * 300);
			}
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
		let Status;

		switch (this.state.connection) {
			case CONNECTION_STATUS.ONLINE: {
				Status = <Button className="green">ONLINE</Button>;
				break;
			}
			case CONNECTION_STATUS.CONNECTION: {
				Status = (
					<Button className="green">
						<span>CONNECTION</span>
						<RolledIcon>cached</RolledIcon>
					</Button>
				);
				break;
			}
			default: {
				Status = (
					<Button onClick={()=>this.onReconnect()} className="red">
						<span>OFFLINNE</span>
						<Icon>cached</Icon>
					</Button>
				);
			}
		}
		return (
			<Fragment>
				<nav className="main">
					<div className="nav-wrap">
						<div className="logo"></div>
						{buttons}
					</div>
					{Status}
				</nav>
				<ActiveTab
					ref={this.activeTabRef}
					devApi={this._devApi}
					locked={this.state.connection !== CONNECTION_STATUS.ONLINE}
				/>
			</Fragment>
		);
	}
}

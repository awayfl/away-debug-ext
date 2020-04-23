import "react-virtualized/styles.css";

import React, { Component, createRef, Fragment, createContext } from "react";

import { Button } from "./elements/Button.jsx";
import { Logger } from "./Tabs/Logger.jsx";
import { Main } from "./Tabs/Main.jsx";

import styled from "styled-components";
import { RolledIcon, Icon } from "./elements/SectionItems.jsx";

const CONNECTION_STATUS = {
	OFFLINE: "offline",
	ONLINE: "online",
	CONNECTION: "connection",
};

const ATTEMTS = 10;
const _TABS = {
	Info: Main,
	Logger: Logger,
};

const Logo = styled.div`
	background-image: url("./gfx/icon128.png");
	background-size: contain;
	width: 36px;
	height: 36px;
	margin: 0 0.5em;
`;

const ErrorBox = styled.div`
	position: absolute;
	width: 100vw;
	min-height: 3em;
	padding: 0em 1em;
	background: #ff6347;
	border: 1px solid #ff4500;
	color: white;
	top: -100%;
	opacity: 0;
	z-index: 100;
	transition: top 0.5s, opacity 0.5s;

	&.active {
		top: 0%;
		opacity: 1;
	}
`;

const Close = styled(Icon)`
	position: absolute;
	right: 0.5em;
	top: 0.5em;
	cursor: pointer;
	user-select: none;

	&:hover {
		color: #222;
	}

	&:focus {
		transform: scale(0.8);
	}
`;

export const Error = ({ title, message, onClose }) => {
	return (
		<ErrorBox className={message && "active"}>
			<Close onClick={onClose}>clear</Close>
			<h3>{title}</h3>
			<p>{message}</p>
		</ErrorBox>
	);
};

export class Panel extends Component {
	constructor(props) {
		super(props);

		this.state = {
			currentTab: Object.keys(_TABS)[0],
			connection: CONNECTION_STATUS.OFFLINE,
			attemts: 0,
			error: "",
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

		const oldCall = devApi.directCall;

		devApi.directCall = (...args) => {
			return oldCall(...args)
				.then((e) => {
					return e;
				})
				.catch((error) => {
					this.setState({
						error,
					});

					throw error;
				});
		};

		const tab = this.activeTabRef.current;
		tab.onInit && tab.onInit(this._devApi);

		this._runReconnection();
	}

	// emited from dev provider
	onDetach(reconnect = true) {
		const tab = this.activeTabRef.current;

		tab.onDetach && tab.onDetach(reconnect);

		this.setState({
			connection: CONNECTION_STATUS.OFFLINE,
			attemts: 0,
		});

		this._stopConnection();

		setTimeout(() => {
			this._runReconnection();
		}, 1000);
	}

	onConnectingDone() {
		const tab = this.activeTabRef.current;

		tab.onAttach && tab.onAttach();

		this.setState({
			connection: CONNECTION_STATUS.ONLINE,
			attemts: 0,
		});
	}

	switchTab(name) {
		this.setState({
			currentTab: name,
		});
	}

	onReconnect() {
		console.debug("Force reconnect");
		this._runReconnection();
	}

	onCloseError() {
		this.setState({
			error: undefined,
		});
	}

	_stopConnection() {
		clearTimeout(this._reconectionTimeout);
	}

	_runReconnection() {
		if (
			!this._devApi ||
			this.state.connection === CONNECTION_STATUS.ONLINE
		) {
			return;
		}

		console.debug("Reconnection runned");

		this._stopConnection();

		const attemts = this.state.attemts;

		if (attemts >= ATTEMTS) {
			this.setState({
				attemts: 0,
				connection: CONNECTION_STATUS.OFFLINE,
			});
			return;
		}

		this.setState({
			connection: CONNECTION_STATUS.CONNECTION,
			attemts: attemts + 1,
		});

		this._devApi
			.tryConnect()
			.catch(() => {
				return false;
			})
			.then((status) => {
				this._stopConnection();

				if (status) {
					this.onConnectingDone();
				} else {
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

		const tabs = Object.keys(_TABS).map((name) => {
			const Tab = _TABS[name];
			const current = this.state.currentTab === name;

			return (
				<Tab
					key={name}
					ref={current ? this.activeTabRef : undefined}
					devApi={this._devApi}
					locked={this.state.connection !== CONNECTION_STATUS.ONLINE}
					active={current}
				/>
			);
		});

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
					<Button onClick={() => this.onReconnect()} className="red">
						<span>OFFLINE</span>
						<Icon>cached</Icon>
					</Button>
				);
			}
		}

		return (
			<Fragment>
				<Error
					message={this.state.error}
					title="ERROR"
					onClose={() => this.onCloseError()}
				/>
				<nav className="main">
					<div className="nav-wrap">
						<Logo />
						{buttons}
					</div>
					{Status}
				</nav>
				{tabs}
			</Fragment>
		);
	}
}

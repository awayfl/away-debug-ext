import React, { Component, createRef, Fragment } from "react";
import { Button } from "../elements/Button.jsx";
import { Label } from "../elements/Label.jsx";
import { Icon, Section, ListBox, Blink, Separator } from "../elements/SectionItems.jsx";
import { ItemContainer } from "../elements/Item.jsx";
import { List, AutoSizer } from "react-virtualized";

import styled from "styled-components";

const Footer = styled.div`
	color: #eee;

	height: 36px;
	line-height: 28px;
	padding: 4px;
	border-top: #666 solid 1px;
`;

const MODES = {
	Runtime: 1,
	Execution: 2,
	Interpreter: 4,
};

const LoggerNav = ({
	logTypes = [],
	onCapture,
	onMode,
	onClear,
	isCapture,
	isLocked,
}) => {
	const _buttons = Object.keys(MODES).map((name) => {
		const id = MODES[name];
		const active = logTypes.includes(id);
		return (
			<Button
				className={`writers ${active && "active"} ${
					(isCapture || isLocked) && "locked"
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
				className={`${isCapture && "active"} ${isLocked && "locked"}`}
			>
				<span> {isCapture ? "Stop" : "Capture"}</span>
				<Blink className={`${isCapture && "blink"}`}>
					fiber_manual_record
				</Blink>
			</Button>

			<Separator />
			<Button className="tiny" onClick={onClear}>
				<Icon>cached</Icon>
			</Button>
			<Separator />

			<Label>Mode:</Label>
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
			indexed: true,
			dataLen: 0
		};

		this._itemList = [];

		/**
		 * @type {IDevToolAPI}
		 */
		this._devApi = props.devApi;

		this._logType = 0;

		this._renderRow = this._renderRow.bind(this);
		this._measureRow = this._measureRow.bind(this);
		this._onResize = this._onResize.bind(this);
		this._inDataArrival = this._onDataArrival.bind(this);

		this.listRef = createRef();
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
		this.setState({
			isCapture: false,
		});
	}

	onCapture() {
		if (!this._devApi) {
			return;
		}
		const runned = this.state.isCapture;

		if (runned) {
			this._devApi.stopCaptureLogs();
			this.setState({
				isCapture: false,
			});
		} else {
			console.log("Try start capture");

			this._devApi
				.startCaptureLogs(
					{ type: this._logType, limit: 2000000 },
					this._inDataArrival
				)
				.then((allow) => {
					this.setState({
						isCapture: allow,
					});
				});
		}
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

	onClear() {
		this._itemList.length = 0;
		this.setState({
			dataLen: 0,
		});
	}

	/**
	 *
	 * @param {string[]} data
	 */
	_onDataArrival(data) {
		data.forEach((e) => {
			this._itemList.push(e);
		});

		this.setState({
			dataLen: this._itemList.length,
		});
	}

	_renderRow({ key, index, style }) {
		const indexed = this.state.indexed;

		return (
			<ItemContainer
				data-index={("" + index).padStart(5, "0")}
				key={key}
				style={style}
				className={indexed && "indexed"}
			>
				{this._itemList[index]}
			</ItemContainer>
		);
	}

	_measureRow(index, width) {
		const v = this._itemList[index];
		const font = 10;
		const itemHeight = 24;
		const rows = ((v.length * font) / width) | 0 || 1;

		return itemHeight * rows;
	}

	_onResize({ width, height }) {
		this.listRef.current.recomputeRowHeights();
	}

	render() {
		const { isCapture, logTypes } = this.state;
		const { _itemList, _renderRow, _measureRow, _onResize } = this;

		return (
			<Fragment>
				<LoggerNav
					isCapture={isCapture}
					isLocked={this.props.locked}
					logTypes={logTypes}
					onCapture={() => this.onCapture()}
					onMode={(v) => this.onMode(v)}
					onClear={() => this.onClear()}
				/>
				<ListBox>
					<AutoSizer onResize={_onResize}>
						{({ height, width }) => (
							<List
								style={{
									outline: "none",
									scrollbarColor: "dark",
								}}
								height={height}
								rowCount={_itemList.length}
								rowHeight={({ index }) =>
									_measureRow(index, width)
								}
								rowRenderer={_renderRow}
								width={width}
								scrollToIndex={_itemList.length - 1}
								ref={this.listRef}
							/>
						)}
					</AutoSizer>
				</ListBox>
				<Footer>
					<span>Lines: {_itemList.length}</span>
				</Footer>
			</Fragment>
		);
	}
}

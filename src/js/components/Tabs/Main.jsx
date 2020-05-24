import React, { Component } from "react";
import { Section } from "../elements/SectionItems.jsx";
import JSONTree from "react-json-tree";
import styled from "styled-components";
import Theme from "./../elements/monokai";

Theme.base00 = "none";

const Wrap = styled.div`
	padding: 1em;
`;

const ConfigWrap = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: auto;
`;

const ItemsLine = styled.div`
	border-bottom: 1px #444 solid;
	font-size: 18px;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
`;

const ItemElement = styled.div`
	margin-right: 1em;

	& > .name {
		font-size: 0.85em;
		user-select: none;
		margin-right: 0.5em;
		text-transform: uppercase;
	}
`;

const InfoPallete = ({ name, fields }) => {
	const items = Object.keys(fields).map((key, i) => {
		return (
			<ItemElement key={key}>
				<span className="name">{key}:</span>
				{fields[key] || "---"}
			</ItemElement>
		);
	});
	return (
		<div>
			<h2>{name}</h2>
			<ItemsLine>{items}</ItemsLine>
		</div>
	);
};

export class Main extends Component {
	constructor(props) {
		super(props);

		this.state = {
			info: { file: {}, runtime: {} },
			config: {},
		};

		/**
		 * @type {IDevToolAPI}
		 */
		this._devAPI = props.devApi;
		this.active = false;

		if(this._devAPI) {
			this.onAttach();
		}
	}

	componentDidUpdate() {
		
		if(this.props.active !== this.active && this.props.active){
			this._devAPI = this.props.devApi;
			
			this._devAPI.getAppInfo().then((info) => {
				this._prepareInfo(info);
			});
		}

		this.active = this.props.active;
	}

	onActivate() {
		this._devAPI.getAppInfo().then((info) => {
			this._prepareInfo(info);
		});
	}

	onDeactivate() {

	}

	onDetach() {
		//this._prepareInfo({});
	}

	onAttach() {		
		this._devAPI.getAppInfo().then((info) => {
			this._prepareInfo(info);
		});
	}

	onInit(api) {
		this._devAPI = api;
	}

	_prepareInfo(info) {
		info.file = info.file || {};
		info.config = info.config || {};
		info.runtime = info.runtime || {};

		if (info.file.size !== undefined) {
			info.file.size = (info.file.size / (1024 * 1024)).toFixed(2) + "MB";
		}

		this.setState({
			info,
			config: info.config,
		});
	}

	render() {
		const { info } = this.state;

		return (
			<Wrap style = {{opacity: this.props.locked ? 0.5 : 1}} >
				<InfoPallete name="FILE" fields={info.file} />
				<InfoPallete name="RUNTIME" fields={info.runtime} />

				<ConfigWrap>
					<h2>CONFIG:</h2>
					<div style={{ overflow: "auto" }}>
						<JSONTree
							data={this.state.config || {}}
							theme={Theme}
							invertTheme={false}
						/>
					</div>
				</ConfigWrap>
			</Wrap>
		);
	}
}

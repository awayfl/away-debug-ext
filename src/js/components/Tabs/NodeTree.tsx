import React, { Component, Fragment } from "react";
import InfiniteTree from "react-infinite-tree";
import styled from "styled-components";

import { Button } from "../elements/Button";
import { Icon, Blink } from "../elements/SectionItems.jsx";

const Split = styled.div`
	display: flex;
	flex-direction: row;
	height: 100%;
	width: 100%;
`;

const NodeInfo = styled.div`
	min-width: 200px;
	display: flex;
	flex-direction: column;
	-webkit-box-flex: 1;
	flex-grow: 1;
`;

const Wrap = styled.div<{ active: boolean }>`
	height: 100%;
	display: flex;
	flex-direction: column;
	opacity: ${(props) => (props.active ? "1" : "0.5")};
	pointer-events: ${(props) => (props.active ? "" : "none")};
`;

const defaultRowHeight = 30;

interface INodeTreeEl {
	rowHeight?: number;
	selected: boolean;
	depth: number;
}

const TreeNode = styled.div<INodeTreeEl>`
	cursor: default;

	width: 100%;
	user-select: none;
	position: relative;
	display: flex;
	flex-direction: row;
	align-items: center;

	line-height: ${({ rowHeight = defaultRowHeight }) => rowHeight}px;

	background: ${(props) =>
		props.selected ? "rgba(0,0,0, 0.2)" : "transparent"};

	border: 1px solid transparent;

	padding-left: ${(props) => props.depth * 18}px;

	.dropdown {
		visibility: hidden;
	}

	&:hover {
		border: 1px solid #555;

		.dropdown {
			visibility: inherit;
		}
	}
`;

const _Toggler = ({ state, ...props }) => {
	let icon = "";
	switch (state) {
		case TogglState.OPEN: {
			icon = "expand_more";
			break;
		}
		case TogglState.CLOSE: {
			icon = "chevron_right";
			break;
		}
	}

	return <Icon {...props}>{icon}</Icon>;
};

const Toggler = styled(_Toggler)`
	width: 1em;
	display: inline-block;
	text-align: center;
	margin-right: 2px;
`;

const NodeBoxer = styled.div`
	display: flex;
	flex-direction: row;
	align-self: flex-end;
	width: 100%;

	& > .last {
		margin-left: auto;
		padding: 0 1em;
	}
`;

const Label = styled.span`
	color: #888;
	padding: 0 0.5em;
`;

const enum TogglState {
	NONE,
	OPEN,
	CLOSE,
}

interface INodeItem {
	type: string;
	name: string;
	id: number;
	index: number;
	items: INodeItem[];
}

const MenyBox = styled.div<{ x: number; y: number; active: boolean }>`
	display: ${({ active }) => (active ? "flex" : "none")};
	flex-direction: column;
	min-width: 200px;
	position: absolute;
	left: ${({ x }) => x}px;
	top: ${({ y }) => y}px;
	user-select: none;
	border: 1px solid #555;
	background: #222;
`;

const MenuItem = styled.div`
	font-size: 14px;
	line-height: 14px;
	width: 100%;
	color: #ccc;
	padding: 0.5em 1em;
	background: #222;
	cursor: pointer;

	border: 1px solid transparent;

	&:hover {
		background: #111;
		border: 1px solid #555;
	}
`;
export const ContextMeny = ({ items = [], pos, active, onItemClicked }) => {
	const ritems = items.map((e) => (
		<MenuItem key={e.id} onClick={() => onItemClicked(e.id)}>
			{e.title}
		</MenuItem>
	));
	return (
		<MenyBox x={pos.x} y={pos.y} active={active && !!items.length}>
			{ritems}
		</MenyBox>
	);
};

interface IState {
	tree: INodeItem;
	contextMenuItems: Array<{ id: string; title: string }>;
	contextMenuActive: boolean;
	contextMenuPos: { x: number; y: number };
	contextMenuHandler: (e: string) => void;
	watched: boolean;
	height: number;
}

interface IProp {
	active: boolean;
	devApi: IDevToolAPI;
}

interface IContextMenu {
	items: Array<{ id: string; title: string }>;
	handler: (id: string) => void;
	owner: any;
}

export class NodeTree extends Component<IProp, IState> {
	_devAPI: IDevToolAPI;
	treeView: React.RefObject<any> = React.createRef();
	treeWrap: React.RefObject<HTMLDivElement> = React.createRef();
	itemsContextMenu: IContextMenu;

	constructor(props: IProp) {
		super(props);

		this.state = {
			watched: false,
			height: 400,
			tree: {} as INodeItem,
			contextMenuItems: [],
			contextMenuActive: false,
			contextMenuPos: { x: 0, y: 0 },
			contextMenuHandler: (e: string) => e,
		};

		this.createContextMenu = this.createContextMenu.bind(this);
		this._renderTree = this._renderTree.bind(this);
		this._devAPI = props.devApi;

		this.itemsContextMenu = {
			items: [{ id: "expose", title: "Expose to Console" }],
			handler: this.onItemContextMenu.bind(this),
			owner: null,
		};

		window.addEventListener('resize',()=>{			
			this.setState(() => ({
				height: this.treeWrap.current.offsetHeight,
			}));
		})
	}

	onEmit(type: string, data) {}

	onInit(devApi: IDevToolAPI) {
		this._devAPI = devApi;
	}

	onAttach() {
		this._getNodeTree().then((data) => {
			this.setState({
				tree: data[0],
			});
			this.treeView.current.tree.loadData(data);
			console.log(data);
		});
	}

	async _getNodeTree() {
		return this._devAPI.directCall("getNodeTree", []) as Promise<INodeItem>;
	}

	_getNodePath(node: any) {
		const ids = [];
		let n = node;
		while(n && n.id) {
			ids.push(n.id);
			n = n.parent;
		}

		ids.reverse();
		return ids;
	}

	// emited when devApi is detached
	onDetach() {
		this.setState({
			watched: false,
		});
	}

	onItemContextMenu(id: string, declaration: IContextMenu) {
		const node = declaration.owner;

		if(!node){
			return;
		}

		switch(id) {
			case 'expose': {

				this._devAPI.directCall('dirObjectByIds', [this._getNodePath(node)]);
				break;
			}
		}
	}

	createContextMenu(event: MouseEvent, contextDeclaration: IContextMenu) {
		event.preventDefault();
		document.addEventListener(
			"click",
			(e) => {
				this.setState({
					contextMenuActive: false,
				});
				e.preventDefault();
			},
			{ once: true }
		);

		this.setState({
			contextMenuItems: contextDeclaration.items,
			contextMenuPos: { x: event.pageX, y: event.pageY },
			contextMenuActive: true,
			contextMenuHandler: (id) => contextDeclaration.handler(id, contextDeclaration),
		});
	}

	doWatch() {
		const w = this.state.watched;
		this.setState({
			watched: !w,
		});
	}

	_renderTree({ tree, node }) {
		const hasChildren = node.hasChildren();

		let toggleState = TogglState.NONE;

		if (hasChildren) {
			toggleState = node.state.open ? TogglState.OPEN : TogglState.CLOSE;
		}

		const trigNode = () => {
			if (toggleState === TogglState.CLOSE) {
				tree.openNode(node);
			} else if (toggleState === TogglState.OPEN) {
				tree.closeNode(node);
			}
		};

		let type: string = node.type;

		if (type && type.startsWith("[")) {
			type = type.substring(7, type.length - 1);
		}

		return (
			<TreeNode
				selected={node.state.selected}
				depth={node.state.depth}
				onClick={(event) => {
					tree.selectNode(node);
					//trigNode();
				}}
				onContextMenu={(e: any) =>
					this.createContextMenu(e, {
						...this.itemsContextMenu,
						owner: node,
					})
				}
			>
				<Toggler state={toggleState} onClick={trigNode} />
				<NodeBoxer>
					<Label>type:</Label>
					<span>{type}</span>

					<Label>id:</Label>
					<span>{node.id}</span>

					{node.name && (
						<Fragment>
							<Label>name:</Label>
							<span>{node.name}</span>
						</Fragment>
					)}

					{node.children.length && (
						<div className={"last"}>
							<Label>childs:</Label>
							<span>{node.children.length}</span>
						</div>
					)}
				</NodeBoxer>
			</TreeNode>
		);
	}

	componentDidMount() {
		this.setState(() => ({
			height: this.treeWrap.current.offsetHeight,
		}));
	}

	render() {
		const {
			tree,
			watched,
			height,
			contextMenuActive,
			contextMenuItems,
			contextMenuPos,
			contextMenuHandler,
		} = this.state;

		return (
			<Wrap active={true}>
				<nav className="sub">
					<Button onClick={() => this.onAttach()}>REBUILD</Button>
					<Button
						className={watched ? "active" : ""}
						onClick={() => this.doWatch()}
					>
						WATCH
						<Blink className={watched ? "blink" : ""}>
							fiber_manual_record
						</Blink>
					</Button>
				</nav>
				<Split>
					<div style={{ width: "100%" }} ref={this.treeWrap}>
						<InfiniteTree
							width="100%"
							height={height}
							rowHeight={30}
							data={tree}
							autoOpen={true}
							style={{ width: "100%" }}
							ref={this.treeView}
						>
							{this._renderTree}
						</InfiniteTree>
					</div>
					<NodeInfo></NodeInfo>
				</Split>
				<ContextMeny
					pos={contextMenuPos}
					active={contextMenuActive}
					items={contextMenuItems}
					onItemClicked={contextMenuHandler}
				/>
			</Wrap>
		);
	}
}

import React, { Component, Fragment } from "react";
import InfiniteTree from "react-infinite-tree";
import styled, { StyledInterface } from "styled-components";

import { Button } from "../elements/Button";
import { Icon, Blink } from "../elements/SectionItems.jsx";
import { Panel } from "../Panel";

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
	width: 0.75em;
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

	& > .clickable {
		cursor: pointer;

		&:hover {
			opacity: 0.8;
		}
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
	children: INodeItem[];
	state: {open: boolean, willOpen: boolean};
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

const MenuItem = styled.div<{ active: boolean }>`
	font-size: 14px;
	line-height: 14px;
	width: 100%;
	color: #ccc;
	padding: 0.5em 1em;
	background: #222;
	cursor: pointer;
	pointer-events: ${({ active }) => (active ? "auto" : "none")};
	opacity: ${({ active }) => (active ? "1" : "0.5")};

	border: 1px solid transparent;

	&:hover {
		background: #111;
		border: 1px solid #555;
	}
`;
export const ContextMeny = ({ items = {}, pos, active, onItemClicked }) => {
	const ritems = Object.keys(items).map((id: string) => {
		const { title, enable = true } = items[id];
		return (
			<MenuItem
				key={id}
				onClick={() => onItemClicked(id)}
				active={enable}
			>
				{title}
			</MenuItem>
		);
	});
	return (
		<MenyBox x={pos.x} y={pos.y} active={active && !!ritems.length}>
			{ritems}
		</MenyBox>
	);
};

interface IState {
	tree: INodeItem;
	contextMenuItems: { [key: string]: { title: string; enable?: boolean } };
	contextMenuActive: boolean;
	contextMenuPos: { x: number; y: number };
	contextMenuHandler: (e: string, other: any) => void;
	watched: boolean;
	boundsTracked: boolean;
	height: number;
	forceUpdateID: number;
}

interface IProp {
	active: boolean;
	locked: boolean;
	devApi: IDevToolAPI;
	panel: Panel;
}

interface IContextMenu {
	items: { [key: string]: { title: string; enable?: boolean } };
	handler: (e: string, other: any) => void;
	owner: any;
}

const enum OBJECT_METHODS {
	HIDE = "hide",
	SHOW = "show",
	REMOVE = "remove",
	EXPOSE = "expose",
}

export class NodeTree extends Component<IProp, IState> {
	_devAPI: IDevToolAPI;
	treeView: React.RefObject<any> = React.createRef();
	treeWrap: React.RefObject<HTMLDivElement> = React.createRef();
	itemsContextMenu: IContextMenu;
	active: boolean = false;
	wathInterval: number = null;
	trackedIds: number[] = [];
	trackedSet: Set<number> = new Set();

	constructor(props: IProp) {
		super(props);

		this.state = {
			watched: false,
			boundsTracked: false,
			height: 400,
			tree: {} as INodeItem,
			contextMenuItems: {},
			contextMenuActive: false,
			contextMenuPos: { x: 0, y: 0 },
			contextMenuHandler: (e: string, _other: any) => e,
			forceUpdateID: 0
		};

		this.createContextMenu = this.createContextMenu.bind(this);
		this._renderTree = this._renderTree.bind(this);
		this._devAPI = props.devApi;

		this.itemsContextMenu = {
			items: {
				[OBJECT_METHODS.EXPOSE]: { title: "Expose to Console" },
				[OBJECT_METHODS.HIDE]: { title: "Hide node" },
				[OBJECT_METHODS.SHOW]: { title: "Show node" },
				[OBJECT_METHODS.REMOVE]: { title: "Remove from stage" },
			},

			handler: this.onItemContextMenu.bind(this),
			owner: null,
		};

		window.addEventListener("resize", () => {
			this.setState(() => ({
				height: this.treeWrap.current.offsetHeight,
			}));
		});

		this.trackedIds = [];

		this.wathInterval = null;
	}

	onEmit(type: string, data) {}

	onInit(devApi: IDevToolAPI) {
		this._devAPI = devApi;
	}

	componentDidUpdate() {
		if (this.props.active !== this.active && this.props.active) {
			this._devAPI = this.props.devApi;

			this.onAttach();
		}
		this.active = this.props.active;
	}

	onAttach() {
		this._getNodeTree().then((data) => {
			this.setState({
				tree: data[0],
				height: this.treeWrap.current.offsetHeight,
			});
			this.treeView.current.tree.loadData(data);
		});
	}

	async _getNodeTree() {
		if (!this._devAPI) {
			return Promise.resolve([]);
		}

		return this._devAPI.directCall("getNodeTree", []) as Promise<INodeItem>;
	}

	_getNodePath(node: any) {
		const ids = [];
		let n = node;
		while (n && n.id) {
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
			boundsTracked: false,
		});
	}

	doObjectMethodCall(method: OBJECT_METHODS, node: any, ..._args: any[]) {
		const ids = this._getNodePath(node);
		switch (method) {
			case OBJECT_METHODS.EXPOSE: {
				this._devAPI.directCall("dirObjectByIds", [ids]);
				break;
			}
			case OBJECT_METHODS.SHOW:
			case OBJECT_METHODS.HIDE: {
				const visible = method === OBJECT_METHODS.SHOW;
				this._devAPI.directCall("applyPropsByIds", [ids, { visible }]);
				this.treeView.current.tree.updateNode(
					node,
					{ ...node, visible },
					{ shallowRendering: true }
				);
				break;
			}
			case OBJECT_METHODS.REMOVE: {
				this._devAPI.directCall("removeObjectByIds", [ids]);
				this.treeView.current.tree.removeNode(node);
				break;
			}
		}
	}

	onItemContextMenu(id: OBJECT_METHODS, declaration: IContextMenu) {
		const node = declaration.owner;

		if (!node) {
			return;
		}

		this.doObjectMethodCall(id, node);
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

		const items = contextDeclaration.items;

		items[OBJECT_METHODS.HIDE].enable = contextDeclaration.owner.visible;
		items[OBJECT_METHODS.SHOW].enable = !contextDeclaration.owner.visible;

		this.setState({
			contextMenuItems: items,
			contextMenuPos: { x: event.pageX, y: event.pageY },
			contextMenuActive: true,
			contextMenuHandler: (id) =>
				contextDeclaration.handler(id, contextDeclaration),
		});
	}

	doWatch() {
		const w = this.state.watched;

		if (w) {
			clearInterval(this.wathInterval);
			this.wathInterval = null;
		} else {
			this.wathInterval = setInterval(() => {
				this.onAttach();
			}, 100);
		}

		this.setState({
			watched: !w,
		});
	}

	_flatTree(next: INodeItem, result = []) {
		result.push(next);

		if (!next.children) {
			return result;
		}

		for(const node of next.children) {
			this._flatTree(node, result);
		}

		return result;
	}

	doTrackBounds(node?: INodeItem) {
		const isTracked = this.state.boundsTracked;

		if (isTracked && !node) {
			this._devAPI.trackBounds("dispose", {});

			this.trackedSet.clear();
			this.setState({
				boundsTracked: false,
			});

			return;
		}

		if (isTracked && node) {
			this._devAPI.trackBounds("dispose", {});

			let remove = this.trackedSet.has(node.id);

			if (remove) {
				this.trackedSet.delete(node.id);
			} else {
				this.trackedSet.add(node.id);
			}

			if (node.state.open || node.state.willOpen) {
				this._flatTree(node).forEach((e) => {
					if (remove) {
						this.trackedSet.delete(e.id);
					} else {
						this.trackedSet.add(e.id);
					}
				});
			}

			if (this.trackedSet.size === 0) {
				this.setState({
					boundsTracked: false,
				});
				return;
			}

			this._devAPI
				.trackBounds("init", {
					trackedIds: [...this.trackedSet], 
				})
				.then((_e) => {
					this.setState({
						boundsTracked: true,
						forceUpdateID: this.state.forceUpdateID + 1
					});
				})
				.catch((error) => {
					this.props.panel.fireError(error);
				});

			return;
		}

		if (!isTracked) {
			
			let trackedIds: number[];
			
			if (node) {
				if (node.state.open) {
					trackedIds = this._flatTree(node ||this.state.tree).map((e) => e.id);
				} else {
					trackedIds = [node.id];
				}

			} else {
				trackedIds = this._flatTree(node ||this.state.tree).map((e) => e.id)
			}

			this.trackedSet = new Set(trackedIds);

			this._devAPI
				.trackBounds("init", {
					trackedIds
				})
				.then((_e) => {
					this.setState({
						boundsTracked: true,
					});
				})
				.catch((error) => {
					this.props.panel.fireError(error);
				});
		}
	}

	_renderTree({ tree, node }) {
		const hasChildren = node.hasChildren();

		let toggleState = TogglState.NONE;

		if (hasChildren) {
			toggleState = node.state.open ? TogglState.OPEN : TogglState.CLOSE;
		}

		if (
			node.parentId === 0 &&
			node.state.depth === 0 &&
			!node.state.willOpen
		) {
			tree.openNode(node);
			node.state.willOpen = true;
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
				onClick={(_event) => {
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
					<Label>[{type}]</Label>
					<span>{node.name}</span>

					<Label>id:</Label>
					<span>{node.id}</span>

					<Blink
						className = {
							`last clickable ${ this.trackedSet.has(node.id) ? 'blink' : ''}`
						}
						onClick={() => this.doTrackBounds(node)}
					>
						{this.trackedSet.has(node.id) ? "grid_on" : "grid_off"}
					</Blink>

					<Icon
						className={"clickable"}
						onClick={() =>
							this.doObjectMethodCall(
								node.visible
									? OBJECT_METHODS.HIDE
									: OBJECT_METHODS.SHOW,
								node
							)
						}
					>
						{node.visible ? "visibility" : "visibility_off"}
					</Icon>

					<Label>childs:</Label>
					<span style={{ minWidth: "2em" }}>
						{node.children.length}
					</span>
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
			boundsTracked,
			height,
			contextMenuActive,
			contextMenuItems,
			contextMenuPos,
			contextMenuHandler,
		} = this.state;

		return (
			<Wrap active={!this.props.locked}>
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
					<Button
						className={boundsTracked ? "active" : ""}
						onClick={() => this.doTrackBounds()}
					>
						BOUNDS
						<Blink className={boundsTracked ? "blink" : ""}>
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
							autoOpen={false}
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

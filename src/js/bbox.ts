export interface INode {
	id: number;
	rect: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	visible: boolean;
	globalVisible: boolean;
	selected?: boolean;
	name: string;
	color?: string;
	children: INode[];
}

export class BboxRenderer {
	options = {
		drawNames: true,
		thinkness: 2,
		defaultColor: "#00ff00"
	};

	nodeRequiestMethod: () => Array<INode>;

	follow: Element;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	loop: boolean = false;

	init(follow: Element, request: () => Array<INode>, options = {}) {
		const canvas: HTMLCanvasElement =
			document.querySelector("#__AWAY__DEBUG__CANVAS__") ||
			document.createElement("canvas");

		canvas.setAttribute("id", "__AWAY__DEBUG__CANVAS__");

		Object.assign(canvas.style, {
			position: "absolute",
			pointerEvents: "none",
			zIndex: 1000,
		});

		this.options = Object.assign({
			drawNames: true,
			thinkness: 2,
			defaultColor: "#00ff00"
		}, options);

		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');

		this.follow = follow;
		this.follow.parentElement.appendChild(this.canvas);
		this.resize();

		this.nodeRequiestMethod = request;

		this.redraw = this.redraw.bind(this);
		this.redraw();
	}

	drawNode(node: INode) {
		const ctx = this.ctx;

		if(!node.rect || !node.visible) {
			return;
		}
		if (node.color) {
			ctx.strokeStyle = node.color;
		}

		if (node.selected) {
			ctx.lineWidth = this.options.thinkness * 2;
		}

		const { x, y, width, height } = node.rect;

		ctx.strokeRect(x, y, width, height);

		if (this.options.drawNames) {
			ctx.fillText(
				`${node.name}, ${node.id}`,
				x + 4,
				y + 16,
				width - 4
			);
		}

		if (node.color) {
			ctx.strokeStyle = this.options.defaultColor;
		}

		if (node.selected) {
			ctx.lineWidth = this.options.thinkness;
		}

		if(node.children && node.children.length > 0) {
			for(const c of node.children)
				this.drawNode(c);
		}
	}

	redraw() {
		if (!this.canvas) {
			return;
		}

		this.resize();
		const nodes = this.nodeRequiestMethod();
		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.lineWidth = this.options.thinkness;
		ctx.strokeStyle = this.options.defaultColor;
		ctx.fillStyle = this.options.defaultColor;
		ctx.font = "12px sans";

		for (const node of nodes) {
			this.drawNode(node);
		}

		requestAnimationFrame(this.redraw);
	}

	resize() {
		const rect = this.follow.getBoundingClientRect();

		this.canvas.width = rect.width;
		this.canvas.height = rect.height;

		Object.assign(this.canvas.style, {
			top: rect.y + "px",
			left: rect.x + "px",
			width: rect.width + "px",
			height: rect.height + "px",
		});
	}

	dispose() {
		if (!this.canvas) {
			return;
		}

		this.canvas.remove();
		this.canvas = null;
		this.ctx = null;
	}
}


//@ts-ignore
window.BBOX_RENDERE = BboxRenderer;
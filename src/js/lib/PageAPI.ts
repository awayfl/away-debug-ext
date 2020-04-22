import {APIServer, IMessage} from "./API"

export const enum PAGE_MARKER {
	PROXY = "_AWAY_API_event",
	PAGE = "_AWAY_PAGE_event"
}

interface IPageMessage extends IMessage {
	from: PAGE_MARKER;
}

export class APIPage extends APIServer {
	constructor() {
		super("page");
		this._bus = <any>{};
		this.connect();
	}

	connect() {
		window.addEventListener("message", this._onMessage);
	}

	close() {
		window.removeEventListener("message", this._onMessage);
	}

	// @ts-ignore
	_onMessage(message: any) {
		if (message.data.from !== PAGE_MARKER.PROXY) {
			return;
		}

		// console.debug("PAGE API", message.data);

		super._onMessage(message.data);
	}

	_answerFlow(data: IPageMessage) {
		data.answer = (_newData = {}) => {
			_newData.type = data.type;
			_newData.id = data.id;
			_newData.from = PAGE_MARKER.PAGE;
			_newData.target = data.sender;
			window.postMessage(_newData, "*");
		};
		return data;
	}

	async send(type: string, data: any = {}): Promise<IPageMessage & any> {
		data.type = type;
		data.id = data.id || this._messageID++;
		data.from = PAGE_MARKER.PAGE;

		return new Promise((resolve, reject) => {
			this._pool[data.id] = {
				id: data.id,
				resolve,
				reject,
			};
			window.postMessage(data, "*");
		});
	}
}
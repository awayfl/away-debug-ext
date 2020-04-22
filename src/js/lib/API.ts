export const PAGES = {
	CONTENT: "content-page",
	DEVTOOL: "devtools-page",
};

export interface IMessage {
	target: string;
	sender: string;
	type: string;
	error: any;
	id: number;
	answer?: (data: any) => void;
}

export class APIServer {
	protected _bus: chrome.runtime.Port = undefined;
	protected _pool: {[key: string]: any} = {};
	protected _flow: {[key: string]: (mess: IMessage) => void} = {};
	protected _messageID: number = 0;

	constructor(public name = '') {
		this._onMessage = this._onMessage.bind(this);
	}
	
	connect(tabId = undefined) {
		if (this._bus) {
			this._bus.disconnect();
		}

		if (!tabId) {
			this._bus = chrome.runtime.connect({ name: this.name});
		} else {
			this._bus = chrome.tabs.connect(tabId, { name: this.name });
		}

		this._bus.onMessage.addListener(this._onMessage.bind(this));
	}

	close() {
		this._bus && this._bus.disconnect();
		this._bus = undefined;
	}

	get opened() {
		return !!this._bus;
	}

	/**
	 *
	 * @param {IMessage} data
	 * @returns {{answer: Function}}
	 */
	_answerFlow(data: IMessage) {
		data.answer = (_newData = {}) => {
			_newData.type = data.type;
			_newData.id = data.id;
			_newData.target = data.sender;
			this._bus.postMessage(_newData);
		};
		return data;
	}

	_onMessage(data: IMessage) {

		// console.debug("API", this.name, data);

		const resolver = data.id !== undefined ? this._pool[data.id] : undefined;

		if (!resolver) {
			if (this._flow[data.type]) {
				this._flow[data.type](this._answerFlow(data));

				// console.debug("CAll flow", data.type);

			} else {
				console.warn("message resolve not found", data.id, data.type);
			}
		} else {
			this._pool[data.id] = undefined;
			if (data.error) {
				resolver.reject(data.error);
				return;
			}
			resolver.resolve(data);
		}
	}

	onFlow(type: string, callback: (data: IMessage & any) => void) {
		this._flow[type] = callback;
	}

	offFlow(type: string) {
		this._flow[type] = undefined;
	}


	async send(type: string, data: any, timeout = 0): Promise<IMessage & any> {
		if (!this._bus) {
			throw new Error("Connection not opened!");
		}

		data.type = type;
		data.id = data.id || this._messageID++;

		return new Promise((resolve, reject) => {
			this._pool[data.id] = {
				id: data.id,
				resolve,
				reject,
			};

			if(timeout > 0) {
				setTimeout(()=>{
					reject("API call rejected by timeout")
				}, timeout);
			}

			this._bus.postMessage(data);
		});
	}
}

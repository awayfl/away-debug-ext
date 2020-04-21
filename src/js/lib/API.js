export const PAGES = {
	CONTENT: 'content-page',
	DEVTOOL: 'devtools-page'
}

export class APIServer {
	constructor(name) {
		this.name = name;
		this._bus = undefined;
		this._pool = {};
		this._flow = {};
		this._messageId = 0;
	}

	connect() {
		if(this._bus) {
			this._bus.disconnect();
		}

		this._bus = chrome.runtime.connect({
			name: this.name,
		});

		this._bus.onMessage.addListener(this._onMessage.bind(this));
	}

	close() {
		this._bus && this._bus.disconnect();
		this._bus = undefined;
	}

	/**
	 * 
	 * @param {any} data
	 * @returns {{answer: Function}} 
	 */
	_answerFlow(data) {
		data.answer = (_newData = {}) =>{
			_newData.type = data.type;
			_newData.id = data.id;
			_newData.target = data.sender;
			this._bus.postMessage(_newData);
		}
		return data;
	}
	
	_onMessage(data) {
		const resolver = this._pool[data.id];
		this._pool[data.id] = undefined;

		if (!resolver) {
			if (this._flow[data.type]) {
				this._flow[data.type](this._answerFlow(data));
			} else {
				console.warn("message resolve not found", data.id, data.type);
			}
		} else {
			if (data.error) {
				resolver.reject(data.error);
				return;
			}
			resolver.resolve(data);
		}
	}

	onFlow(type, callback) {
		this._flow[type] = callback;
	}

	offFlow(type) {
		this._flow[type] = false;
	}

	async send(type, data) {
		if (!this._bus) {
			throw new Error("Connection not opened!");
		}

		data.type = type;
		data.id = this._messageId++;

		return new Promise((resolve, reject) => {
			this._pool[data.id] = {
				id: data.id,
				resolve,
				reject,
			};

			this._bus.postMessage(data);
		});
	}
}

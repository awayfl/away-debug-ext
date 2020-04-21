export class APIServer {
	constructor() {
		this._pool = {};
		this._messageId = 0;
		this._onMessage = this._onMessage.bind(this);
		this._flow = {};
		this.connect();
	}

	connect() {
		window.addEventListener("message", this._onMessage);
	}

	close() {
		window.removeEventListener("message", this._onMessage);
	}

	_onMessage({ data }) {
		if (data.from !== "_AWAY_PROXY_event") {
			return;
		}

		const resolver = this._pool[data.id];
		this._pool[data.id] = undefined;

		if (!resolver) {
			if (this._flow[data.type]) {
				this._flow[data.type](this._answerFlow(data));
			} else {
				console.warn(
					"message resolve not found",
					data.id,
					data.type
				);
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

	/**
	 *
	 * @param {any} data
	 * @returns {{answer: Function}}
	 */
	_answerFlow(data) {
		data.answer = (_newData = {}) => {
			_newData.type = data.type;
			_newData.id = data.id;
			_newData.from = "_AWAY_API_event";
			_newData.target = data.sender;
			window.postMessage(_newData, "*");
		};
		return data;
	}

	async send(type, data = {}) {
		data.type = type;
		data.id = data.id || this._messageId++;
		data.from = "_AWAY_API_event";

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
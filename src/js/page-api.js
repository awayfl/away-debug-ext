(function () {
	class APIServer {
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

	// ---------------main -------------
	const api = new APIServer();

	const BATCH_BLOB_TIME = 500;
	const BATCH_BLOBS = 1000;
	const WAIT_TIMEOUT = 1000;
	/**
	 * @type {IAwayDebug}
	 */
	let AWAY_DEBUG = undefined;
	let _limit = 500000;
	let _total = 0;
	let _logBlob = [];
	let _logBathedSender = undefined;
	let _lastLoggedValue = undefined;

	function _detachLogger(reason) {
		AWAY_DEBUG.registerWriter(0, null);

		clearTimeout(_logBathedSender);

		api.send("log-stop", { target: "devtools-page", reason });
	}

	function _sendLog(blob) {
		if(!blob.length) {
			return;
		}

		const waiter = setTimeout(() => {
			_detachLogger("timeout");
		}, WAIT_TIMEOUT);
		
		// send blobs and wait, or stop sending!
		api.send("log", { blob, target: "devtools-page", total: _total }).then(
			(e) => {
				clearTimeout(waiter);
			}
		);
	}

	function _logWriter(str) {
		if(str !== _lastLoggedValue){
			_logBlob.push(str);
			_total++;

			_lastLoggedValue = str;
		}

		if (!_logBathedSender) {
			_logBathedSender = setTimeout(() => {
				_sendLog(_logBlob);
				_logBlob = [];
				_logBathedSender = undefined;
			}, BATCH_BLOB_TIME);
		}

		if (_logBlob.length >= BATCH_BLOBS) {
			_sendLog(_logBlob);
			_logBlob = [];

			clearTimeout(_logBathedSender);
			_logBathedSender = undefined;
		}

		if (_total > _limit) {
			_detachLogger("limit");
		}
	}

	function testOnDebug({ answer }) {
		AWAY_DEBUG = window._AWAY_DEBUG_;

		answer({ status: !!AWAY_DEBUG });

		if (AWAY_DEBUG) {
			console.debug("AWAY_API attached");
		}
	}

	function logInit({ answer, logType, limit }) {
		_limit = limit;
		_total = 0;

		AWAY_DEBUG.registerWriter(logType, _logWriter);
		answer({});
	}

	function logStop() {
		_detachLogger("manual");
	}

	api.onFlow("test", testOnDebug);
	api.onFlow("log-init", logInit);
	api.onFlow("log-stop", logStop);
	///
})();

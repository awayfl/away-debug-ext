import { APIPage } from "./lib/PageAPI";
import { EVENT } from "./lib/EVENT";
import { BboxRenderer } from "./bbox";

declare global {
	interface Window {
		_AWAY_DEBUG_: IAwayDebug;
	}
}

(function () {
	console.debug("PAGE API INJECTED");

	// ---------------main -------------
	const api = new APIPage();
	const bbox = new BboxRenderer();

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

	function safeCall(method: string, args: any[]) {
		if (!AWAY_DEBUG) {
			throw "[AWAY DEBUG PAGE API] AWAY DEBUG interface not found!";
		}

		if (typeof AWAY_DEBUG[method] !== "function") {
			throw `[AWAY DEBUG PAGE API] field ${method} not callable!`;
		}

		return AWAY_DEBUG[method].apply(undefined, args);
	}

	function _detachLogger(reason: string) {
		AWAY_DEBUG.registerWriter(0, null);

		clearTimeout(_logBathedSender);

		api.send(EVENT.LOG_STOP, { target: "devtools-page", reason });
	}

	function _sendLog(blob: string[]) {
		if (!blob.length) {
			return;
		}

		const waiter = setTimeout(() => {
			_detachLogger("timeout");
		}, WAIT_TIMEOUT);

		// send blobs and wait, or stop sending!
		api.send(EVENT.LOG_BLOB, {
			blob,
			target: "devtools-page",
			total: _total,
		}).then((e) => {
			clearTimeout(waiter);
		});
	}

	function _logWriter(str: string) {
		if (str !== _lastLoggedValue) {
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

	function logInit({ answer, logType, limit }) {
		_limit = limit;
		_total = 0;

		safeCall("registerWriter", [logType, _logWriter]);

		answer({ allow: true });
	}

	function logStop() {
		_detachLogger("manual");
	}

	function testOnDebug({ answer }) {
		if (!AWAY_DEBUG && window._AWAY_DEBUG_) {
			console.debug("AWAY_API attached");
		}

		AWAY_DEBUG = window._AWAY_DEBUG_;

		answer({ status: !!AWAY_DEBUG });
	}

	function directCall({ answer, method, args = [] }) {
		try {
			const data = safeCall(method, args);

			if (data && typeof data.then === "function") {
				data.then((result) => {
					answer({ result });
				});
			} else {
				answer({ result: data });
			}
		} catch (e) {
			answer({ error: e });
		}
	}

	function trackBounds({ answer, method, args }) {

		if(!AWAY_DEBUG.getStageCanvas) {
			return answer ({error: "Bounds debugger not exist on this AWAY Player version."});
		}

		switch (method) {
			case "init": {
				const canvas = AWAY_DEBUG.getStageCanvas();

				if (!canvas) {
					return answer({ error: "Unknow stage!" });
				}

				const request = () => AWAY_DEBUG.getNodeTree(false, 0, true);
				bbox.init(canvas, request, args);

				return answer({ ok: true });
			}

			case "dispose": {
				bbox.dispose();
				answer({ ok: true });
			}
		}
	}

	api.onFlow(EVENT.DETACH, function () {
		bbox.dispose();
	});
	api.onFlow(EVENT.TEST, testOnDebug);
	api.onFlow(EVENT.LOG_INIT, logInit);
	api.onFlow(EVENT.LOG_STOP, logStop);
	api.onFlow(EVENT.CALL, directCall);
	api.onFlow(EVENT.TRACK_BOUNDS, trackBounds);

	///
})();

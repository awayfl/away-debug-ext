//@ts-check

import { APIServer, PAGES } from "./lib/API.js";
import { EVENT } from "./lib/EVENT";

const api = new APIServer(PAGES.DEVTOOL);

/**
 * @type {IPanelAPI}
 */
let contex = undefined;
let injectionStatus = false;
let isCapture = false;
let pingTimeout = undefined;
let isAttached = false;

async function getStatus() {
	if (!injectionStatus) {
		return false;
	}

	return api.send(EVENT.TEST, { target: PAGES.CONTENT }).then((e) => {
		return e.status;
	});
}

let _logsCallback = undefined;

function serverIsDetached() {
	clearInterval(pingTimeout);

	isCapture = false;
	isAttached = false;
	contex && contex.detach();

	console.warn("AWAY DEV server is detached!");
}

function startPingout() {
	pingTimeout = setTimeout(() => {
		serverIsDetached();
	}, 1000);

	getStatus().then((status) => {
		clearInterval(pingTimeout);

		if (!status) {
			serverIsDetached();
		} else {
			pingTimeout = setTimeout(() => {
				startPingout();
			}, 500);
		}
	});
}

function _onBlobReached(data) {
	if (_logsCallback) {
		// пинаем, что не зависили!
		data.answer({});
		_logsCallback(data.blob);
	}
}

function startCaptureLogs({ type, limit = 500000 }, callback) {
	_logsCallback = callback;

	return api
		.send(EVENT.LOG_INIT, {
			logType: type,
			limit,
			target: PAGES.CONTENT,
		})
		.then(({ allow }) => {
			if (allow) {
				console.log("register blob flow");

				api.onFlow(EVENT.LOG_STOP, () => stopCaptureLogs(true));
				api.onFlow(EVENT.LOG_BLOB, _onBlobReached);
			}
			isCapture = allow;

			return allow;
		});
}

function stopCaptureLogs(supress = false) {
	if (!isCapture) {
		return;
	}

	isCapture = false;

	console.debug("DEVTOOL", "STOP CAPTURE");

	api.offFlow(EVENT.LOG_BLOB);

	if (!supress) {
		api.send(EVENT.LOG_STOP, { target: PAGES.CONTENT });
	}

	contex.emit(EVENT.LOG_STOP, {});
	_logsCallback = undefined;
}

async function tryConnect() {
	api.connect();

	const status = await api.send(EVENT.INJECT, {
		tabId: chrome.devtools.inspectedWindow.tabId,
		scriptToInject: "js/content.js",
	});

	injectionStatus = status.status;

	const isDebugable = await getStatus();

	isAttached = status.status && isDebugable;

	if (isAttached) {
		startPingout();
	}

	return isAttached;
}

async function getAppInfo() {
	return directCall("getInfo");
}

async function directCall(method, args = []) {

	console.debug("CALL DIRECT", method, args);
	
	if (!isAttached) {
		throw "DevTool not attached to page!";
	}

	return api
		.send(EVENT.CALL, { method, args, target: PAGES.CONTENT })
		.then((e) => {
			if (e.error) {
				throw e.error;
			}

			return e.result;
		});
}

/**
 * @type {IDevToolAPI}
 */
const devApi = {
	getStatus,
	startCaptureLogs,
	stopCaptureLogs,
	tryConnect,
	getAppInfo,
	directCall,
};

function _onPanelShow(panelContext) {
	setTimeout(() => {
		contex = panelContext.PANEL_API;

		tryConnect().then((status) => {
			contex.init(devApi);
		});
	}, 100);
}

function _onPanelHide(panelContext) {
	contex = undefined;
	api.send(EVENT.DETACH, { target: PAGES.CONTENT });
	api.close();
}

chrome.devtools.panels.create(
	"AwayFL",
	"gfx/icon16.png",
	"panel.html",
	(panel) => {
		panel.onShown.addListener(_onPanelShow);
		panel.onHidden.addListener(_onPanelHide);
	}
);

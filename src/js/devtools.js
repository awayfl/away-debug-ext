import { EVENT, APIServer, PAGES } from "./lib/API.js";

const api = new APIServer(PAGES.DEVTOOL);
/**
 * @type {IPanelAPI}
 */
let contex = undefined;
let injectionStatus = false;
let isCapture = false;

async function getStatus() {
	if (!injectionStatus) {
		return false;
	}

	return api.send(EVENT.TEST, { target: PAGES.CONTENT }).then((e) => {
		return e.status;
	});
}

let _logsCallback = undefined;

function _onBlobReached(data) {

	if(_logsCallback) {
		// пинаем, что не зависили!
		data.answer({});
		_logsCallback(data.blob);
	}
}

function captureLogs({ type, limit = 500000 }, callback) {
	_logsCallback = callback;

	api.send(EVENT.LOG_INIT, {
		logType: type,
		limit,
		target: PAGES.CONTENT,
	}).then(() => {
		console.log("register blob flow");

		api.onFlow(EVENT.LOG_STOP, () => stopCapture(true) );
		api.onFlow(EVENT.LOG_BLOB, _onBlobReached);
		isCapture = true;
	});
}

function stopCapture(supress = false) {
	if(!isCapture) {
		return;
	}

	isCapture = false;

	console.debug("DEVTOOL", "STOP CAPTURE");

	api.offFlow(EVENT.LOG_BLOB, _onBlobReached);
	
	if(!supress){
		api.send(EVENT.LOG_STOP, { target: PAGES.CONTENT });
	}

	contex.emit(EVENT.LOG_STOP);
	_logsCallback = undefined;
}

/**
 * @type {IDevToolAPI}
 */
const devApi = {
	getStatus,
	captureLogs,
	stopCapture,
};

function _onPanelShow(panelContext) {
	setTimeout(()=>{
		contex = panelContext.PANEL_API;

		console.log(panelContext);

		api.connect();

		api.send(EVENT.INJECT, {
			tabId: chrome.devtools.inspectedWindow.tabId,
			scriptToInject: "js/content.js",
		}).then(({ status }) => {
			injectionStatus = status;
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
	"/gfx/icon16.png",
	"panel.html",
	(panel) => {
		panel.onShown.addListener(_onPanelShow);
		panel.onHidden.addListener(_onPanelHide);
	}
);

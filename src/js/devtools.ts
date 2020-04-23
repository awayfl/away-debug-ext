//@ts-check

import { APIServer, PAGES } from "./lib/API";
import { EVENT } from "./lib/EVENT";

const api = new APIServer(PAGES.DEVTOOL);

let contex: IPanelAPI = undefined;
let isCapture: boolean = false;
let pingTimeout: any = undefined;
let isAttached: boolean = false;
let currentTab: number = -1;

async function injectPageApi(): Promise<any> {
	currentTab = chrome.devtools.inspectedWindow.tabId;
	console.log("CURRENT TAB", currentTab);

	api.connect(currentTab);

	return true;

	/*
	const testPage = await new Promise((res)=>{
		chrome.tabs.executeScript(currentTab, {
			code: `window.__AWAY__PAGE__API`
		}, (result)=>{
			console.debug("Test page of field", result);
			
			res(result[0]);
		})
	})

	if(testPage) {
		console.debug("Connect to existed page");
		return true;
	}
	
	console.debug("Execute new instance");

	return new Promise((res) => {
		chrome.tabs.executeScript(
			currentTab,
			{ file: "js/content.js" },
			res
		);
	});*/
}

async function getStatus(timeout = 0): Promise<boolean> {
	return api.send(EVENT.TEST, {}, timeout).then((e) => {
		return e.status;
	});
}

let _logsCallback = undefined;

function serverIsDetached() {
	clearInterval(pingTimeout);

	isCapture = false;
	isAttached = false;
	contex && contex.detach(true);

	console.debug("AWAY DEV server is detached!");
}

let runned = false;

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
			}, 1000);
		}
	});
}

function _onBlobReached(data: { blob: string[]; answer: Function }) {
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

let _connection = undefined;

async function _tryConnect(): Promise<boolean> {
	await injectPageApi();

	//if(api.)api.connect(currentTab);

	try {
		isAttached = await getStatus(300);
	} catch (e) {
		isAttached = false;
	}

	if (isAttached) {
		startPingout();
	}

	_connection = undefined;
	return isAttached;
}

async function tryConnect(): Promise<boolean> {
	if (_connection) {
		console.log("Called runned connectio");
		return _connection;
	}

	_connection = _tryConnect();

	setTimeout(() => {
		_connection = undefined;
	}, 1000);

	return _connection;
}

async function getAppInfo(): Promise<any> {
	return directCall("getInfo");
}

async function directCall(method: string, args: any[] = []): Promise<any> {
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

function _onPanelShow(panelContext: Window) {
	setTimeout(() => {
		api.onFlow("unload", serverIsDetached);

		contex = panelContext.PANEL_API;
		contex.init(devApi);
	}, 100);
}

function _onPanelHide() {
	serverIsDetached();

	api.offFlow("unload");
	api.close();

	contex = undefined;
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

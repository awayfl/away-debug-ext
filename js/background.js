import { EVENT, PAGES } from "./lib/API.js";

const _BUSSES = {
	[PAGES.CONTENT]: {},
	[PAGES.DEVTOOL]: {},
};

let _injectRequestId = 0;

_BUSSES[PAGES.DEVTOOL].onMessage = function (message) {
	switch (message.type) {
		case EVENT.INJECT: {
			console.log("INJECT", message.scriptToInject);			
			_injectRequestId = message.id;

			chrome.tabs.executeScript(message.tabId, {
				file: message.scriptToInject,
			});
			break;
		}
	}

	console.debug("devtool -> background", message);
};

_BUSSES[PAGES.CONTENT].onMessage = function (message) {
	if(message.type === EVENT.INJECT) {
		message.id = _injectRequestId;
		_BUSSES[PAGES.DEVTOOL].port.postMessage(message);
		console.debug("content -> devtool", message);
	}

	console.debug("content -> background", message);
};

// Background page -- background.js
chrome.runtime.onConnect.addListener((port) => {
	_BUSSES[port.name].port = port;

	const onMessage = (message, sender) => {

		if(message.target && _BUSSES[message.target]) {
			if(!_BUSSES[message.target].port) {
				console.warn('ATTEMTS send to closed port', message);
				return;
			}

			message.sender = sender.name;
			
			_BUSSES[message.target].port.postMessage(message);
			console.debug('proxy message to', message.target, message);
			return;
		}

		_BUSSES[sender.name].onMessage(message);
	};

	// add the listener
	port.onMessage.addListener(onMessage);

	port.onDisconnect.addListener(() => {
		port.onMessage.removeListener(onMessage);
	});
});

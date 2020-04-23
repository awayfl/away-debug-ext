export {};

declare global {
	interface Window {
		__AWAY__PAGE__API: boolean;
	}
}

if(!window.__AWAY__PAGE__API) {
	console.log("Init content script");
	Init();
}

function Init() {	
	window.__AWAY__PAGE__API = true;
	
	let actualPort = undefined;

	// page-api -> devtools
	function _onMessage({data}) {
		// console.log("PROXY FROM PAGE TO DEVTOOL", data);

		if (data.from !== "_AWAY_PAGE_event") {
			return;
		}

		if(!actualPort) {
			return;
		}

		actualPort.postMessage(data);
	}

	
	// devtools -> page-api
	function _postMesage(data) {
		// console.debug("Proxy to PAGE", data);

		data.from = "_AWAY_API_event";
		window.postMessage(data, "*");
	}

	window.addEventListener("message", _onMessage);
	window.addEventListener("beforeunload", ()=>{
		if(actualPort) {
			console.debug("Page reloaded");
			actualPort.postMessage({type:'unload'});
		}
	});

	chrome.runtime.onConnect.addListener(function (port: chrome.runtime.Port) {
		//console.log("AWAY CONTENT", port);
		actualPort = port;

		// background -> page-api
		port.onMessage.addListener(_postMesage);
		port.onDisconnect.addListener(()=>{
			console.log("DEVTOOL DISCONNECTED");
		
			port.onMessage.removeListener(_postMesage);
		})
	});

	const injection = document.createElement("script");

	injection.src = chrome.extension.getURL("js/page-api.js");
	(document.head || document.documentElement).appendChild(injection);

	injection.onload = function () {
		//injection.remove();
	};
}
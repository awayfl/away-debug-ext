
(function () {
	let port = window.__AWAY__FL__DEBUGER;

	if (port) {
		port.postMessage({ type: 'inject', status: true });;
		return;
	}

	port = chrome.runtime.connect({
		name: "content-page",
	});
	
	window.__AWAY__FL__DEBUGER = port;


	// page-api -> background
	function _onMessage({data}) {
		if (data.from !== "_AWAY_API_event") {
			return;
		}
		port.postMessage(data);
	}

	function _postMesage(data) {
		data.from = "_AWAY_PROXY_event";
		window.postMessage(data, "*");
	}

	// background -> page-api
	port.onMessage.addListener(_postMesage);

	window.addEventListener("message", _onMessage);

	const injection = document.createElement("script");

	injection.src = chrome.extension.getURL("js/page-api.js");
	(document.head || document.documentElement).appendChild(injection);

	injection.onload = function () {
		injection.remove();
		port.postMessage({ type: 'inject', status: true });
	};
})();

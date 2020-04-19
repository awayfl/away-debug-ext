import {Tabs} from "./lib/tabs.js";
import {LoggerTab} from "./lib/loggerTab.js";

const _TABS = [
	LoggerTab
];

Tabs((e, name)=>{
	_TABS.forEach((tab)=>{
		tab.enable(tab.name === name);
	});
});


const connectionStatus = document.querySelector('#online_status');

//---- ----

/**
 * 
 * @param {IDevToolAPI} devAPI 
 */
function init(devAPI) {
	_TABS.forEach((tab)=>{
		tab.init(devAPI);
	});

	// retrive status of connection to AWAY_API
	devAPI.getStatus().then((status)=>{
		connectionStatus.classList.toggle('active', status);
	});
}

function detach() {
	_TABS.forEach((tab)=>{
		tab.detach();
	});

	connectionStatus.classList.toggle('active', false);
}

// emit events
function emit(type, data) {
	_TABS.forEach(tab => tab.emit && tab.emit(type, data))
}

/**
 * @type {IPanelAPI}
 */
window.PANEL_API = {
	init, detach, emit
}

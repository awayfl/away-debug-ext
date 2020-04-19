import { EVENT } from "./API.js";

const q = document.querySelector.bind(document);
const qa = document.querySelectorAll.bind(document);


/**
 * @type {HTMLElement}
 */
const logList = q("#log-list");

/**
 * @type {HTMLElement}
 */
const capture_btn = q("#capture_button");

/**
 * @type {HTMLElement[]}
 */
const mode_buttons = qa(".writers");

let active = false;
let captureMode = 0;
let isCaptured = false;

/**
 * @type {IDevToolAPI}
 */
let devTool = undefined;

/**
 *
 * @param {MouseEvent} event
 */
function _onModeChange(event) {
  /**
   * @type {HTMLElement}
   */
  const e = event.target;
  e.classList.toggle("active");

  captureMode = 0;
  mode_buttons.forEach((e) => {
    if (e.classList.contains("active")) {
      captureMode = captureMode | +e.dataset["mode"];
    }
  });

  console.log(captureMode);
};

let _globalIndex = 0;
function _enableCapture() {
	logList.innerHTML = '';
	_globalIndex = 0;
	devTool.captureLogs({
		type: captureMode, limit: 1000000
	}, (blob)=>{
		_pushBlob(blob);
	});

    isCaptured = true;
}

function _disableCapture() {
	devTool.stopCapture();
    isCaptured = false;
}

function _switchCapture() {
    if(isCaptured){
        _disableCapture();
    }else{
        _enableCapture();
    }

    capture_btn.classList.toggle('active', isCaptured);
    mode_buttons.forEach((e) => e.classList.toggle('locked', isCaptured));
}

/**
 * 
 * @param {string[]} blob 
 */
function _pushBlob(blob) {
	blob.forEach((e)=>{
		const span = document.createElement('span');
		span.classList.add('item');
		span.innerHTML = `<span class='ticker'>${("" + _globalIndex).padStart(4, '0')}:</span>${e}`;

		logList.appendChild(span);
		span.scrollIntoView(false);
		
		_globalIndex ++;

	})
}

//
mode_buttons.forEach((e) => {
  e.addEventListener("click", _onModeChange);
});

capture_btn.addEventListener("click", _switchCapture);

// ------ -----
let inited = false;

async function _internalInit() {

}

function enable(status) {
	active = status;

	if(!status) {
		isCaptured = true;
		_switchCapture();
	}

	if(devTool && active) {
		_internalInit();
	}
}

function init(dev) {
	devTool = dev;
}

function detach() {
	_disableCapture();
	devTool = undefined;
}

function emit(type, data) {
	if(type === EVENT.LOG_STOP) {
		isCaptured = true;
		_switchCapture();
	}
}


export const LoggerTab = {
	name : 'logger',
	detach,
	init,
	enable,
	emit
}
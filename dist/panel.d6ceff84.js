// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"LgVo":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tabs = Tabs;

function Tabs(onToggle = undefined) {
  /**
   * @type {HTMLElement[]}
   */
  const el = document.querySelectorAll('[data-tab-target]');
  /**
   * @type {HTMLElement[]}
  */

  const tabs = document.querySelectorAll('[data-tab-name]');
  let active = undefined;

  const _clicked = ({
    target
  }) => {
    active = target;
    el.forEach(e => {
      e.classList.toggle('active', e === target);
    });
    tabs.forEach(e => {
      e.classList.toggle('active', e.dataset.tabName === active.dataset.tabTarget);
    });
    onToggle && onToggle(active, active.dataset.tabTarget.trim());
  };

  el.forEach(e => {
    e.addEventListener('click', _clicked);
  });

  _clicked({
    target: document.querySelector('.active[data-tab-target]')
  });
}
},{}],"rHfI":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.APIServer = exports.PAGES = exports.EVENT = void 0;
const EVENT = {
  INJECT: 'inject',
  DETACH: 'detach',
  TEST: 'test',
  LOG_BLOB: 'log',
  LOG_INIT: 'log-init',
  LOG_STOP: 'log-stop'
};
exports.EVENT = EVENT;
const PAGES = {
  CONTENT: 'content-page',
  DEVTOOL: 'devtools-page'
};
exports.PAGES = PAGES;

class APIServer {
  constructor(name) {
    this.name = name;
    this._bus = undefined;
    this._pool = {};
    this._flow = {};
    this._messageId = 0;
  }

  connect() {
    this._bus = chrome.runtime.connect({
      name: this.name
    });

    this._bus.onMessage.addListener(this._onMessage.bind(this));
  }

  close() {
    this._bus && this._bus.disconnect();
    this._bus = undefined;
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
      _newData.target = data.sender;

      this._bus.postMessage(_newData);
    };

    return data;
  }

  _onMessage(data) {
    const resolver = this._pool[data.id];
    this._pool[data.id] = undefined;

    if (!resolver) {
      if (this._flow[data.type]) {
        this._flow[data.type](this._answerFlow(data));
      } else {
        console.warn("message resolve not found", data.id, data.type);
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

  async send(type, data) {
    if (!this._bus) {
      throw new Error("Connection not opened!");
    }

    data.type = type;
    data.id = this._messageId++;
    return new Promise((resolve, reject) => {
      this._pool[data.id] = {
        id: data.id,
        resolve,
        reject
      };

      this._bus.postMessage(data);
    });
  }

}

exports.APIServer = APIServer;
},{}],"coqm":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LoggerTab = void 0;

var _API = require("./API.js");

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
  mode_buttons.forEach(e => {
    if (e.classList.contains("active")) {
      captureMode = captureMode | +e.dataset["mode"];
    }
  });
  console.log(captureMode);
}

;
let _globalIndex = 0;

function _enableCapture() {
  logList.innerHTML = '';
  _globalIndex = 0;
  devTool.captureLogs({
    type: captureMode,
    limit: 1000000
  }, blob => {
    _pushBlob(blob);
  });
  isCaptured = true;
}

function _disableCapture() {
  devTool.stopCapture();
  isCaptured = false;
}

function _switchCapture() {
  if (isCaptured) {
    _disableCapture();
  } else {
    _enableCapture();
  }

  capture_btn.classList.toggle('active', isCaptured);
  mode_buttons.forEach(e => e.classList.toggle('locked', isCaptured));
}
/**
 * 
 * @param {string[]} blob 
 */


function _pushBlob(blob) {
  blob.forEach(e => {
    const span = document.createElement('span');
    span.classList.add('item');
    span.innerHTML = `<span class='ticker'>${("" + _globalIndex).padStart(4, '0')}:</span>${e}`;
    logList.appendChild(span);
    span.scrollIntoView(false);
    _globalIndex++;
  });
} //


mode_buttons.forEach(e => {
  e.addEventListener("click", _onModeChange);
});
capture_btn.addEventListener("click", _switchCapture); // ------ -----

let inited = false;

async function _internalInit() {}

function enable(status) {
  active = status;

  if (!status) {
    isCaptured = true;

    _switchCapture();
  }

  if (devTool && active) {
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
  if (type === _API.EVENT.LOG_STOP) {
    isCaptured = true;

    _switchCapture();
  }
}

const LoggerTab = {
  name: 'logger',
  detach,
  init,
  enable,
  emit
};
exports.LoggerTab = LoggerTab;
},{"./API.js":"rHfI"}],"f7o4":[function(require,module,exports) {
"use strict";

var _tabs = require("./lib/tabs.js");

var _loggerTab = require("./lib/loggerTab.js");

const _TABS = [_loggerTab.LoggerTab];
(0, _tabs.Tabs)((e, name) => {
  _TABS.forEach(tab => {
    tab.enable(tab.name === name);
  });
});
const connectionStatus = document.querySelector('#online_status'); //---- ----

/**
 * 
 * @param {IDevToolAPI} devAPI 
 */

function init(devAPI) {
  _TABS.forEach(tab => {
    tab.init(devAPI);
  }); // retrive status of connection to AWAY_API


  devAPI.getStatus().then(status => {
    connectionStatus.classList.toggle('active', status);
  });
}

function detach() {
  _TABS.forEach(tab => {
    tab.detach();
  });

  connectionStatus.classList.toggle('active', false);
} // emit events


function emit(type, data) {
  _TABS.forEach(tab => tab.emit && tab.emit(type, data));
}
/**
 * @type {IPanelAPI}
 */


window.PANEL_API = {
  init,
  detach,
  emit
};
},{"./lib/tabs.js":"LgVo","./lib/loggerTab.js":"coqm"}]},{},["f7o4"], null)
//# sourceMappingURL=/panel.d6ceff84.js.map
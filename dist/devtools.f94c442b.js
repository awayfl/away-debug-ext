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
})({"js/lib/API.js":[function(require,module,exports) {
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
},{}],"js/devtools.js":[function(require,module,exports) {
"use strict";

var _API = require("./lib/API.js");

const api = new _API.APIServer(_API.PAGES.DEVTOOL);
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

  return api.send(_API.EVENT.TEST, {
    target: _API.PAGES.CONTENT
  }).then(e => {
    return e.status;
  });
}

let _logsCallback = undefined;

function _onBlobReached(data) {
  if (_logsCallback) {
    // пинаем, что не зависили!
    data.answer({});

    _logsCallback(data.blob);
  }
}

function captureLogs({
  type,
  limit = 500000
}, callback) {
  _logsCallback = callback;
  api.send(_API.EVENT.LOG_INIT, {
    logType: type,
    limit,
    target: _API.PAGES.CONTENT
  }).then(() => {
    console.log("register blob flow");
    api.onFlow(_API.EVENT.LOG_STOP, () => stopCapture(true));
    api.onFlow(_API.EVENT.LOG_BLOB, _onBlobReached);
    isCapture = true;
  });
}

function stopCapture(supress = false) {
  if (!isCapture) {
    return;
  }

  isCapture = false;
  console.debug("DEVTOOL", "STOP CAPTURE");
  api.offFlow(_API.EVENT.LOG_BLOB, _onBlobReached);

  if (!supress) {
    api.send(_API.EVENT.LOG_STOP, {
      target: _API.PAGES.CONTENT
    });
  }

  contex.emit(_API.EVENT.LOG_STOP);
  _logsCallback = undefined;
}
/**
 * @type {IDevToolAPI}
 */


const devApi = {
  getStatus,
  captureLogs,
  stopCapture
};

function _onPanelShow(panelContext) {
  setTimeout(() => {
    contex = panelContext.PANEL_API;
    console.log(panelContext);
    api.connect();
    api.send(_API.EVENT.INJECT, {
      tabId: chrome.devtools.inspectedWindow.tabId,
      scriptToInject: "js/content.js"
    }).then(({
      status
    }) => {
      injectionStatus = status;
      contex.init(devApi);
    });
  }, 100);
}

function _onPanelHide(panelContext) {
  contex = undefined;
  api.send(_API.EVENT.DETACH, {
    target: _API.PAGES.CONTENT
  });
  api.close();
}

chrome.devtools.panels.create("AwayFL", "/gfx/icon16.png", "panel.html", panel => {
  panel.onShown.addListener(_onPanelShow);
  panel.onHidden.addListener(_onPanelHide);
});
},{"./lib/API.js":"js/lib/API.js"}]},{},["js/devtools.js"], null)
//# sourceMappingURL=/devtools.f94c442b.js.map
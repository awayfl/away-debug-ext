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
})({"js/lib/API.ts":[function(require,module,exports) {
"use strict";

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PAGES = {
  CONTENT: "content-page",
  DEVTOOL: "devtools-page"
};

class APIServer {
  constructor(name = '') {
    this.name = name;
    this._bus = undefined;
    this._pool = {};
    this._flow = {};
    this._messageID = 0;
    this._onMessage = this._onMessage.bind(this);
  }

  connect(tabId = undefined) {
    if (this._bus) {
      this._bus.disconnect();
    }

    if (!tabId) {
      this._bus = chrome.runtime.connect({
        name: this.name
      });
    } else {
      this._bus = chrome.tabs.connect(tabId, {
        name: this.name
      });
    }

    this._bus.onMessage.addListener(this._onMessage.bind(this));
  }

  close() {
    this._bus && this._bus.disconnect();
    this._bus = undefined;
  }

  get opened() {
    return !!this._bus;
  }
  /**
   *
   * @param {IMessage} data
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
    // console.debug("API", this.name, data);
    const resolver = data.id !== undefined ? this._pool[data.id] : undefined;

    if (!resolver) {
      if (this._flow[data.type]) {
        this._flow[data.type](this._answerFlow(data)); // console.debug("CAll flow", data.type);

      } else {
        console.warn("message resolve not found", data.id, data.type);
      }
    } else {
      this._pool[data.id] = undefined;

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
    this._flow[type] = undefined;
  }

  send(type, data, timeout = 0) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this._bus) {
        throw new Error("Connection not opened!");
      }

      data.type = type;
      data.id = data.id || this._messageID++;
      return new Promise((resolve, reject) => {
        this._pool[data.id] = {
          id: data.id,
          resolve,
          reject
        };

        if (timeout > 0) {
          setTimeout(() => {
            reject("API call rejected by timeout");
          }, timeout);
        }

        this._bus.postMessage(data);
      });
    });
  }

}

exports.APIServer = APIServer;
},{}],"js/lib/EVENT.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var EVENT;

(function (EVENT) {
  EVENT["INJECT"] = "inject";
  EVENT["DETACH"] = "detach";
  EVENT["TEST"] = "test";
  EVENT["INFO"] = "info";
  EVENT["LOG_BLOB"] = "log";
  EVENT["LOG_INIT"] = "log-init";
  EVENT["LOG_STOP"] = "log-stop";
  EVENT["CALL"] = "call";
  EVENT["TRACK_BOUNDS"] = "track-bounds";
})(EVENT = exports.EVENT || (exports.EVENT = {}));

;
},{}],"js/devtools.ts":[function(require,module,exports) {
"use strict"; //@ts-check

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

const API_1 = require("./lib/API");

const EVENT_1 = require("./lib/EVENT");

const api = new API_1.APIServer(API_1.PAGES.DEVTOOL);
let contex = undefined;
let isCapture = false;
let pingTimeout = undefined;
let isAttached = false;
let currentTab = -1;

function injectPageApi() {
  return __awaiter(this, void 0, void 0, function* () {
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
  });
}

function getStatus(timeout = 0) {
  return __awaiter(this, void 0, void 0, function* () {
    return api.send(EVENT_1.EVENT.TEST, {}, timeout).then(e => {
      return e.status;
    });
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
  getStatus().then(status => {
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

function _onBlobReached(data) {
  if (_logsCallback) {
    // пинаем, что не зависили!
    data.answer({});

    _logsCallback(data.blob);
  }
}

function startCaptureLogs({
  type,
  limit = 500000
}, callback) {
  _logsCallback = callback;
  return api.send(EVENT_1.EVENT.LOG_INIT, {
    logType: type,
    limit,
    target: API_1.PAGES.CONTENT
  }).then(({
    allow
  }) => {
    if (allow) {
      console.log("register blob flow");
      api.onFlow(EVENT_1.EVENT.LOG_STOP, () => stopCaptureLogs(true));
      api.onFlow(EVENT_1.EVENT.LOG_BLOB, _onBlobReached);
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
  api.offFlow(EVENT_1.EVENT.LOG_BLOB);

  if (!supress) {
    api.send(EVENT_1.EVENT.LOG_STOP, {
      target: API_1.PAGES.CONTENT
    });
  }

  contex.emit(EVENT_1.EVENT.LOG_STOP, {});
  _logsCallback = undefined;
}

let _connection = undefined;

function _tryConnect() {
  return __awaiter(this, void 0, void 0, function* () {
    yield injectPageApi(); //if(api.)api.connect(currentTab);

    try {
      isAttached = yield getStatus(300);
    } catch (e) {
      isAttached = false;
    }

    if (isAttached) {
      startPingout();
    }

    _connection = undefined;
    return isAttached;
  });
}

function tryConnect() {
  return __awaiter(this, void 0, void 0, function* () {
    if (_connection) {
      console.log("Called runned connectio");
      return _connection;
    }

    _connection = _tryConnect();
    setTimeout(() => {
      _connection = undefined;
    }, 1000);
    return _connection;
  });
}

function getAppInfo() {
  return __awaiter(this, void 0, void 0, function* () {
    return directCall("getInfo");
  });
}

function directCall(method, args = []) {
  return __awaiter(this, void 0, void 0, function* () {
    console.debug("CALL DIRECT", method, args);

    if (!isAttached) {
      //try {
      //	await tryConnect();
      //} catch {
      throw "DevTool not attached to page!"; //}
    }

    return api.send(EVENT_1.EVENT.CALL, {
      method,
      args,
      target: API_1.PAGES.CONTENT
    }).then(e => {
      if (e.error) {
        throw e.error;
      }

      return e.result;
    });
  });
}

function trackBounds(method, args) {
  return __awaiter(this, void 0, void 0, function* () {
    console.debug("CALL TRACK BOUNDS", method, args);

    if (!isAttached) {
      //try {
      //	await tryConnect();
      //} catch {
      throw "DevTool not attached to page!"; //}
    }

    return api.send(EVENT_1.EVENT.TRACK_BOUNDS, {
      method,
      args,
      target: API_1.PAGES.CONTENT
    }).then(e => {
      if (e.error) {
        throw e.error;
      }

      return e.result;
    });
  });
}

const devApi = {
  getStatus,
  startCaptureLogs,
  stopCaptureLogs,
  tryConnect,
  getAppInfo,
  directCall,
  //
  trackBounds
};

function _onPanelShow(panelContext) {
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

chrome.devtools.panels.create("AwayFL", "gfx/icon16.png", "panel.html", panel => {
  panel.onShown.addListener(_onPanelShow);
  panel.onHidden.addListener(_onPanelHide);
});
},{"./lib/API":"js/lib/API.ts","./lib/EVENT":"js/lib/EVENT.ts"}]},{},["js/devtools.ts"], null)
//# sourceMappingURL=/devtools.8279e2d4.js.map
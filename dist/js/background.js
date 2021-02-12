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
},{}],"js/background.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

const API_1 = require("./lib/API");

const EVENT_1 = require("./lib/EVENT");

const _BUSSES = {
  [API_1.PAGES.CONTENT]: {
    onMessage: undefined,
    port: undefined
  },
  [API_1.PAGES.DEVTOOL]: {
    onMessage: undefined,
    port: undefined
  }
};
let _injectRequestId = 0;

_BUSSES[API_1.PAGES.DEVTOOL].onMessage = function (message) {
  switch (message.type) {
    case EVENT_1.EVENT.INJECT:
      {
        console.log("INJECT", message.scriptToInject);
        _injectRequestId = message.id;
        chrome.tabs.executeScript(message.tabId, {
          file: message.scriptToInject
        });
        break;
      }
  }

  console.debug("devtool -> background", message);
};

_BUSSES[API_1.PAGES.CONTENT].onMessage = function (message) {
  if (message.type === EVENT_1.EVENT.INJECT) {
    message.id = _injectRequestId;

    _BUSSES[API_1.PAGES.DEVTOOL].port.postMessage(message);

    console.debug("content -> devtool", message);
  }

  console.debug("content -> background", message);
}; // Background page -- background.js


chrome.runtime.onConnect.addListener(port => {
  _BUSSES[port.name].port = port;

  const onMessage = (message, sender) => {
    if (message.target && _BUSSES[message.target]) {
      if (!_BUSSES[message.target].port) {
        console.warn('ATTEMTS send to closed port', message);
        return;
      }

      message.sender = sender.name;

      _BUSSES[message.target].port.postMessage(message);

      console.debug('proxy message to', message.target, message);
      return;
    }

    _BUSSES[sender.name].onMessage(message);
  }; // add the listener


  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(onMessage);
  });
});
},{"./lib/API":"js/lib/API.ts","./lib/EVENT":"js/lib/EVENT.ts"}]},{},["js/background.ts"], null)
//# sourceMappingURL=/js/background.js.map
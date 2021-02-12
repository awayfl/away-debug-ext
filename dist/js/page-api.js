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
},{}],"js/lib/PageAPI.ts":[function(require,module,exports) {
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

const API_1 = require("./API");

var PAGE_MARKER;

(function (PAGE_MARKER) {
  PAGE_MARKER["PROXY"] = "_AWAY_API_event";
  PAGE_MARKER["PAGE"] = "_AWAY_PAGE_event";
})(PAGE_MARKER = exports.PAGE_MARKER || (exports.PAGE_MARKER = {}));

class APIPage extends API_1.APIServer {
  constructor() {
    super("page");
    this._bus = {};
    this.connect();
  }

  connect() {
    window.addEventListener("message", this._onMessage);
  }

  close() {
    window.removeEventListener("message", this._onMessage);
  } // @ts-ignore


  _onMessage(message) {
    if (message.data.from !== PAGE_MARKER.PROXY) {
      return;
    } // console.debug("PAGE API", message.data);


    super._onMessage(message.data);
  }

  _answerFlow(data) {
    data.answer = (_newData = {}) => {
      _newData.type = data.type;
      _newData.id = data.id;
      _newData.from = PAGE_MARKER.PAGE;
      _newData.target = data.sender;
      window.postMessage(_newData, "*");
    };

    return data;
  }

  send(type, data = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      data.type = type;
      data.id = data.id || this._messageID++;
      data.from = PAGE_MARKER.PAGE;
      return new Promise((resolve, reject) => {
        this._pool[data.id] = {
          id: data.id,
          resolve,
          reject
        };
        window.postMessage(data, "*");
      });
    });
  }

}

exports.APIPage = APIPage;
},{"./API":"js/lib/API.ts"}],"js/lib/EVENT.ts":[function(require,module,exports) {
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
},{}],"js/bbox.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

class BboxRenderer {
  constructor() {
    this.options = {
      drawNames: true,
      thinkness: 2,
      defaultColor: "#00ff00",
      trackedIds: []
    };
    this.loop = false;
    this.redraw = this.redraw.bind(this);
  }

  init(follow, request, options = {}) {
    const canvas = document.querySelector("#__AWAY__DEBUG__CANVAS__") || document.createElement("canvas");
    canvas.setAttribute("id", "__AWAY__DEBUG__CANVAS__");
    Object.assign(canvas.style, {
      position: "absolute",
      pointerEvents: "none",
      zIndex: 1000
    });
    this.options = Object.assign({
      drawNames: true,
      thinkness: 2,
      defaultColor: "#00ff00",
      trackedIds: null
    }, options);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.follow = follow;
    this.follow.parentElement.appendChild(this.canvas);
    this.resize();
    this.nodeRequiestMethod = request;
    this.redraw();
  }

  drawNode(node) {
    const ctx = this.ctx;

    if (!node.rect || !node.visible) {
      return;
    }

    if (node.color) {
      ctx.strokeStyle = node.color;
    }

    if (!this.options.trackedIds || this.options.trackedIds.indexOf(node.id) > -1) {
      if (node.selected) {
        ctx.lineWidth = this.options.thinkness * 2;
      }

      const {
        x,
        y,
        width,
        height
      } = node.rect;
      ctx.strokeRect(x, y, width, height);

      if (this.options.drawNames) {
        ctx.fillText(`${node.name}, ${node.id}`, x + 4, y + 16, width - 4);
      }

      if (node.color) {
        ctx.strokeStyle = this.options.defaultColor;
      }

      if (node.selected) {
        ctx.lineWidth = this.options.thinkness;
      }
    }

    if (node.children && node.children.length > 0) {
      for (const c of node.children) this.drawNode(c);
    }
  }

  redraw() {
    if (!this.canvas) {
      return;
    }

    this.resize();
    const nodes = this.nodeRequiestMethod();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.lineWidth = this.options.thinkness;
    ctx.strokeStyle = this.options.defaultColor;
    ctx.fillStyle = this.options.defaultColor;
    ctx.font = "12px sans";

    for (const node of nodes) {
      this.drawNode(node);
    }

    requestAnimationFrame(this.redraw);
  }

  resize() {
    const rect = this.follow.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    Object.assign(this.canvas.style, {
      top: rect.y + "px",
      left: rect.x + "px",
      width: rect.width + "px",
      height: rect.height + "px"
    });
  }

  dispose() {
    if (!this.canvas) {
      return;
    }

    this.canvas.remove();
    this.canvas = null;
    this.ctx = null;
  }

}

exports.BboxRenderer = BboxRenderer; //@ts-ignore

window.BBOX_RENDERE = BboxRenderer;
},{}],"js/page-api.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

const PageAPI_1 = require("./lib/PageAPI");

const EVENT_1 = require("./lib/EVENT");

const bbox_1 = require("./bbox");

(function () {
  console.debug("PAGE API INJECTED"); // ---------------main -------------

  const api = new PageAPI_1.APIPage();
  const bbox = new bbox_1.BboxRenderer();
  const BATCH_BLOB_TIME = 500;
  const BATCH_BLOBS = 1000;
  const WAIT_TIMEOUT = 1000;
  /**
   * @type {IAwayDebug}
   */

  let AWAY_DEBUG = undefined;
  let _limit = 500000;
  let _total = 0;
  let _logBlob = [];
  let _logBathedSender = undefined;
  let _lastLoggedValue = undefined;

  function safeCall(method, args) {
    if (!AWAY_DEBUG) {
      throw "[AWAY DEBUG PAGE API] AWAY DEBUG interface not found!";
    }

    if (typeof AWAY_DEBUG[method] !== "function") {
      throw `[AWAY DEBUG PAGE API] field ${method} not callable!`;
    }

    return AWAY_DEBUG[method].apply(undefined, args);
  }

  function _detachLogger(reason) {
    AWAY_DEBUG.registerWriter(0, null);
    clearTimeout(_logBathedSender);
    api.send(EVENT_1.EVENT.LOG_STOP, {
      target: "devtools-page",
      reason
    });
  }

  function _sendLog(blob) {
    if (!blob.length) {
      return;
    }

    const waiter = setTimeout(() => {
      _detachLogger("timeout");
    }, WAIT_TIMEOUT); // send blobs and wait, or stop sending!

    api.send(EVENT_1.EVENT.LOG_BLOB, {
      blob,
      target: "devtools-page",
      total: _total
    }).then(e => {
      clearTimeout(waiter);
    });
  }

  function _logWriter(str) {
    if (str !== _lastLoggedValue) {
      _logBlob.push(str);

      _total++;
      _lastLoggedValue = str;
    }

    if (!_logBathedSender) {
      _logBathedSender = setTimeout(() => {
        _sendLog(_logBlob);

        _logBlob = [];
        _logBathedSender = undefined;
      }, BATCH_BLOB_TIME);
    }

    if (_logBlob.length >= BATCH_BLOBS) {
      _sendLog(_logBlob);

      _logBlob = [];
      clearTimeout(_logBathedSender);
      _logBathedSender = undefined;
    }

    if (_total > _limit) {
      _detachLogger("limit");
    }
  }

  function logInit({
    answer,
    logType,
    limit
  }) {
    _limit = limit;
    _total = 0;
    safeCall("registerWriter", [logType, _logWriter]);
    answer({
      allow: true
    });
  }

  function logStop() {
    _detachLogger("manual");
  }

  function testOnDebug({
    answer
  }) {
    if (!AWAY_DEBUG && window._AWAY_DEBUG_) {
      console.debug("AWAY_API attached");
    }

    AWAY_DEBUG = window._AWAY_DEBUG_;
    answer({
      status: !!AWAY_DEBUG
    });
  }

  function directCall({
    answer,
    method,
    args = []
  }) {
    try {
      const data = safeCall(method, args);

      if (data && typeof data.then === "function") {
        data.then(result => {
          answer({
            result
          });
        });
      } else {
        answer({
          result: data
        });
      }
    } catch (e) {
      answer({
        error: e
      });
    }
  }

  function trackBounds({
    answer,
    method,
    args
  }) {
    if (!AWAY_DEBUG.getStageCanvas) {
      return answer({
        error: "Bounds debugger not exist on this AWAY Player version."
      });
    }

    switch (method) {
      case "init":
        {
          const canvas = AWAY_DEBUG.getStageCanvas();

          if (!canvas) {
            return answer({
              error: "Unknow stage!"
            });
          }

          const request = () => AWAY_DEBUG.getNodeTree({
            flat: false,
            from: 0,
            rect: true,
            visibleOnly: true
          });

          bbox.init(canvas, request, args);
          return answer({
            ok: true
          });
        }

      case "dispose":
        {
          bbox.dispose();
          answer({
            ok: true
          });
        }
    }
  }

  api.onFlow(EVENT_1.EVENT.DETACH, function () {
    bbox.dispose();
  });
  api.onFlow(EVENT_1.EVENT.TEST, testOnDebug);
  api.onFlow(EVENT_1.EVENT.LOG_INIT, logInit);
  api.onFlow(EVENT_1.EVENT.LOG_STOP, logStop);
  api.onFlow(EVENT_1.EVENT.CALL, directCall);
  api.onFlow(EVENT_1.EVENT.TRACK_BOUNDS, trackBounds); ///
})();
},{"./lib/PageAPI":"js/lib/PageAPI.ts","./lib/EVENT":"js/lib/EVENT.ts","./bbox":"js/bbox.ts"}]},{},["js/page-api.ts"], null)
//# sourceMappingURL=/js/page-api.js.map
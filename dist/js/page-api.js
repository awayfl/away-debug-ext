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
})({"js/page-api.js":[function(require,module,exports) {
(function () {
  class APIServer {
    constructor() {
      this._pool = {};
      this._messageId = 0;
      this._onMessage = this._onMessage.bind(this);
      this._flow = {};
      this.connect();
    }

    connect() {
      window.addEventListener("message", this._onMessage);
    }

    close() {
      window.removeEventListener("message", this._onMessage);
    }

    _onMessage({
      data
    }) {
      if (data.from !== "_AWAY_PROXY_event") {
        return;
      }

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
    /**
     *
     * @param {any} data
     * @returns {{answer: Function}}
     */


    _answerFlow(data) {
      data.answer = (_newData = {}) => {
        _newData.type = data.type;
        _newData.id = data.id;
        _newData.from = "_AWAY_API_event";
        _newData.target = data.sender;
        window.postMessage(_newData, "*");
      };

      return data;
    }

    async send(type, data = {}) {
      data.type = type;
      data.id = data.id || this._messageId++;
      data.from = "_AWAY_API_event";
      return new Promise((resolve, reject) => {
        this._pool[data.id] = {
          id: data.id,
          resolve,
          reject
        };
        window.postMessage(data, "*");
      });
    }

  } // ---------------main -------------


  const api = new APIServer();
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

  function _detachLogger(reason) {
    AWAY_DEBUG.registerWriter(0, null);
    clearTimeout(_logBathedSender);
    api.send("log-stop", {
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

    api.send("log", {
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

  function logInit({
    answer,
    logType,
    limit
  }) {
    _limit = limit;
    _total = 0;
    AWAY_DEBUG.registerWriter(logType, _logWriter);
    answer({
      allow: true
    });
  }

  function logStop() {
    _detachLogger("manual");
  }

  api.onFlow("test", testOnDebug);
  api.onFlow("log-init", logInit);
  api.onFlow("log-stop", logStop); ///
})();
},{}]},{},["js/page-api.js"], null)
//# sourceMappingURL=/js/page-api.js.map
/*!
 * liveview Titanium CommonJS require with some Node.js love and dirty hacks
 * Copyright (c) 2013-2017 Appcelerator
 */
(function (globalScope) {

  Object.setPrototypeOf = Object.setPrototypeOf || function (obj, proto) {
    obj.__proto__ = proto;
    return obj;
  };
  /* globals Emitter */
  /**
                         * Initialize a new `Process`.
                         * @returns {Process}
                         * @public
                         */
  function Process() {
    if (!(this instanceof Process)) {
      return new Process();
    }
    this.title = 'titanium';
    this.version = '';
    this.moduleLoadList = [];
    this.versions = {};
    this.arch = Ti.Platform.architecture;
    this.platform = Ti.Platform.osname;
    this.hardware = ('' + Ti.Platform.model).replace('google_');
  }

  // inherit from EventEmitter
  Object.setPrototypeOf(Process.prototype, Emitter.prototype);

  /*
                                                                * Event Emitters
                                                                */

  /**
                                                                    * Initialize a new `Emitter`.
                                                                    *
                                                                    * @param {Object} obj Object to be mixed in to emitter
                                                                    * @returns {Emitter}
                                                                    * @public
                                                                    */
  function Emitter(obj) {
    if (obj) {
      return mixin(obj);
    }
  }

  /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj object to be mixed in
     * @return {Object} object with Emitter properties mixed in
     * @private
     */
  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }

  /**
     * Listen on the given `event` with `fn`.
     *
     * @param {string} event event name to hook callback to
     * @param {Function} fn callback function
     * @return {Emitter} this
     * @public
     */
  Emitter.prototype.on = function (event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks[event] = this._callbacks[event] || []).push(fn);
    return this;
  };

  /**
      * Adds an `event` listener that will be invoked a single
      * time then automatically removed.
      *
      * @param {string} event event name to hook callback to
      * @param {Function} fn callback function
      * @return {Emitter} this
      * @public
      */
  Emitter.prototype.once = function (event, fn) {
    var self = this;
    this._callbacks = this._callbacks || {};

    /**
                                              * single-fire callback for event
                                              */
    function on() {
      self.off(event, on);
      fn.apply(this, arguments);
    }

    fn._off = on;
    this.on(event, on);
    return this;
  };

  /**
      * Remove the given callback for `event` or all
      * registered callbacks.
      *
      * @param {string} event event name to remove callback from
      * @param {Function} fn callback function
      * @return {Emitter} this
      * @public
      */
  Emitter.prototype.off = function (event, fn) {
    this._callbacks = this._callbacks || {};
    var callbacks = this._callbacks[event];
    if (!callbacks) {
      return this;
    }

    // remove all handlers
    if (arguments.length === 1) {
      delete this._callbacks[event];
      return this;
    }

    // remove specific handler
    var i = callbacks.indexOf(fn._off || fn);
    if (~i) {
      callbacks.splice(i, 1);
    }
    return this;
  };

  /**
      * Emit `event` with the given args.
      *
      * @param {string} event event name
      * @return {Emitter}
      * @public
      */
  Emitter.prototype.emit = function (event) {
    this._callbacks = this._callbacks || {};
    var args = [].slice.call(arguments, 1);
    var callbacks = this._callbacks[event];

    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }

    return this;
  };

  /**
      * Return array of callbacks for `event`.
      *
      * @param {string} event event name
      * @return {Array} array of callbacks registered for that event
      * @public
      */
  Emitter.prototype.listeners = function (event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks[event] || [];
  };

  /**
      * Check if this emitter has `event` handlers.
      *
      * @param {string} event event name
      * @return {boolean}
      * @public
      */
  Emitter.prototype.hasListeners = function (event) {
    return !!this.listeners(event).length;
  };
  /* globals Emitter */
  /**
                         * Expose `Socket`.
                         */
  if (typeof module !== 'undefined') {
    module.exports = Socket;
  }

  /**
     * [Socket description]
     * @param {Object} opts [description]
     * @returns {Socket}
     */
  function Socket(opts) {
    if (!(this instanceof Socket)) {
      return new Socket(opts);
    }
    opts = opts || {};
    this.timeout = 5000;
    this.host = opts.host;
    this.port = opts.port;
    this.retry = opts.retry;
    this.bytesRead = 0;
    this.bytesWritten = 0;
    this.ignore = [];
  }

  /**
     * Inherit from `Emitter.prototype`.
     */
  Object.setPrototypeOf(Socket.prototype, Emitter.prototype);

  /**
                                                               * [connect description]
                                                               * @param  {Object}   opts [description]
                                                               * @param  {Function} fn   [description]
                                                               */
  Socket.prototype.connect = function (opts, fn) {
    opts = opts || {};
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }

    var self = this;
    self.host = opts.host || self.host || '127.0.0.1';
    self.port = opts.port || self.port;
    self.retry = opts.retry || self.retry;

    var reConnect = !!opts.reConnect;
    this._proxy = Ti.Network.Socket.createTCP({
      host: self.host,
      port: self.port,
      /**
                        * [description]
                        * @param  {Object} e [description]
                        */
      connected: function connected(e) {
        self.connected = true;
        self._connection = e.socket;
        fn && fn(e);
        self.emit(reConnect ? 'reconnect' : 'connect', e);

        Ti.Stream.pump(e.socket, function (e) {
          if (e.bytesProcessed < 0 || !!e.errorStatus) {
            self._proxy.close();
            self.close(true);
            return;
          } else {
            self.emit('data', '' + e.buffer);
          }
        }, 1024, true);
      },
      /**
          * [description]
          * @param  {Object} e [description]
          * @returns {undefined}
          */
      error: function error(e) {
        var err = { code: e.errorCode, error: e.error };
        if (!~self.ignore.indexOf(err.code)) {
          return self.emit('error', err);
        }
        self.emit('error ignored', err);
      } });


    this._proxy.connect();
  };

  /**
      * [close description]
      * @param {boolean} serverEnded [description]
      */
  Socket.prototype.close = function (serverEnded) {
    var self = this;

    self.connected = false;
    self.closing = !serverEnded;

    if (self.closing) {
      self.write(function () {
        self._proxy.close();
        self.emit('close');
      });
      return;
    }

    var retry = ~~self.retry;

    self.emit('end');
    if (!retry) {
      return;
    }

    setTimeout(function () {
      self.emit('reconnecting');
      self.connect({ reConnect: true });
    }, retry);
  };

  /**
      * [description]
      * @param  {string}   data [description]
      * @param  {Function} fn   [description]
      */
  Socket.prototype.write = function (data, fn) {
    if (typeof data === 'function') {
      fn = data;
      data = null;
    }

    data = data ? '' + data : '';

    var msg = Ti.createBuffer({ value: data });

    var callback = fn || function () {};

    Ti.Stream.write(this._connection, msg, function () {
      callback([].slice(arguments));
    });
  };

  /**
      * [setKeepAlive description]
      * @param {boolean} enable       [description]
      * @param {number} initialDelay [description]
      */
  Socket.prototype.setKeepAlive = function (enable, initialDelay) {
    var self = this;
    if (!enable) {
      self._keepAlive && clearInterval(self._keepAlive);
      self._keepAlive = null;
      return;
    }
    self._keepAlive = setInterval(function () {
      self.write('ping');
    }, initialDelay || 300000);
  };
  /* globals Process, Socket */
  var global, process;

  /**
                        * Initialize a new `Module`.
                        * @param {string} id The module identifier
                        * @public
                        */
  function Module(id) {
    this.filename = id + '.js';
    this.id = id;
    if (process.platform === 'ipad') {
      this.platform = 'iphone';
    } else if (process.platform === 'windowsphone' || process.platform === 'windowsstore') {
      this.platform = 'windows';
    } else {
      this.platform = process.platform;
    }
    this.exports = {};
    this.loaded = false;
  }

  function L(name, filler) {
    return (Module._globalCtx.localeStrings[Ti.Locale.currentLanguage] || {})[name] || filler || name;
  }

  // global namespace
  global = Module._global = Module.global = {};

  // main process
  process = global.process = new Process();

  // set environment type
  global.ENV = 'liveview';

  // set logging
  global.logging = false;

  // catch uncaught errors
  global.CATCH_ERRORS = true;

  // module cache
  Module._cache = {};

  /**
                       * place holder for native require until patched
                       *
                       * @private
                       */
  Module._requireNative = function () {
    throw new Error('Module.patch must be run first');
  };

  /**
      * place holder for native require until patched
      *
      * @private
      */
  Module._includeNative = function () {
    throw new Error('Module.patch must be run first');
  };

  /**
      * replace built in `require` function
      *
      * @param  {Object} globalCtx Global context
      * @param  {string} url The URL to use (default is '127.0.0.1', or '10.0.2.2' on android emulator)
      * @param  {number} port The port to use (default is 8324)
      * @private
      */
  Module.patch = function (globalCtx, url, port) {
    var defaultURL = process.platform === 'android' && process.hardware === 'sdk' ? '10.0.2.2' : Ti.Platform.model === 'Simulator' ? '127.0.0.1' : '192.168.0.15';
    Module._globalCtx = globalCtx;
    global._globalCtx = globalCtx;
    Module._url = url || defaultURL;
    Module._port = parseInt(port, 10) || 8324;
    Module._requireNative = globalCtx.require;
    Module.evtServer && Module.evtServer.close();
    Module._compileList = [];

    // FIX for android bug
    try {
      Ti.App.Properties.setBool('ti.android.bug2373.finishfalseroot', false);
    } catch (e) {
      // ignore
    }

    globalCtx.localeStrings = Module.require('localeStrings');
    Module.connectServer();
  };

  /**
      * [reload description]
      */
  Module.global.reload = function () {
    try {
      Module.evtServer._proxy.close();
      console.log('[LiveView] Reloading App');
      Ti.App._restart();
    } catch (e) {
      console.log('[LiveView] Reloading App via Legacy Method');
      Module.require('app');
    }
  };

  /**
      * [description]
      */
  Module.connectServer = function () {
    var retryInterval = null;
    var client = Module.evtServer = new Socket({ host: Module._url, port: parseInt('8323', 10) }, function () {
      console.log('[LiveView]', 'Connected to Event Server');
    });

    client.on('close', function () {
      console.log('[LiveView]', 'Closed Previous Event Server client');
    });

    client.on('connect', function () {
      if (retryInterval) {
        clearInterval(retryInterval);
        console.log('[LiveView]', 'Reconnected to Event Server');
      }
    });

    client.on('data', function (data) {
      if (!data) {
        return;
      }
      try {
        var evt = JSON.parse('' + data);
        if (evt.type === 'event' && evt.name === 'reload') {
          Module._cache = {};
          Module.global.reload();
        }
      } catch (e) {/* discard non JSON data for now */}
    });

    client.on('end', function () {
      console.error('[LiveView]', 'Disconnected from Event Server');
      retryInterval = setInterval(function () {
        console.log('[LiveView]', 'Attempting reconnect to Event Server');
        client.connect();
      }, 2000);
    });

    client.on('error', function (e) {
      var err = e.error;
      var code = ~~e.code;
      if (code === 61) {
        err = 'Event Server unavailable. Connection Refused @ ' + Module._url + ':' + Module._port + '\n[LiveView] Please ensure your device and computer are on the same network and the port is not blocked.';
      }
      throw new Error('[LiveView] ' + err);
    });

    client.connect();
    Module.require('app');
  };

  /**
      * include script loader
      * @param  {string} ctx context
      * @param  {string} id module identifier
      * @public
      */
  Module.include = function (ctx, id) {
    var file = id.replace('.js', ''),
    src = Module.prototype._getRemoteSource(file, 10000);
    eval.call(ctx, src); // eslint-disable-line no-eval
  };

  /**
      * convert relative to absolute path
      * @param  {string} parent parent file path
      * @param  {string} relative relative path in require
      * @return {string} absolute path of the required file
      * @public
      */
  Module.toAbsolute = function (parent, relative) {
    var newPath = parent.split('/'),
    parts = relative.split('/');

    newPath.pop();

    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '.') {
        continue;
      }

      if (parts[i] === '..') {
        newPath.pop();
      } else {
        newPath.push(parts[i]);
      }
    }
    return newPath.join('/');
  };

  /**
      * commonjs module loader
      * @param  {string} id module identifier
      * @returns {Object}
      * @public
      */
  Module.require = function (id) {
    var fullPath = id;

    if (fullPath.indexOf('./') === 0 || fullPath.indexOf('../') === 0) {
      var parent = Module._compileList[Module._compileList.length - 1];
      fullPath = Module.toAbsolute(parent, fullPath);
    }

    var cached = Module.getCached(fullPath) || Module.getCached(fullPath.replace('/index', '')) || Module.getCached(fullPath + '/index');

    if (cached) {
      return cached.exports;
    }

    if (!Module.exists(fullPath)) {
      if (fullPath.indexOf('/') === 0 && Module.exists(fullPath + '/index')) {
        fullPath += '/index';
      } else {
        var hlDir = '/hyperloop/';
        if (fullPath.indexOf('.*') !== -1) {
          fullPath = id.slice(0, id.length - 2);
        }

        var modLowerCase = fullPath.toLowerCase();
        if (Module.exists(hlDir + fullPath)) {
          fullPath = hlDir + fullPath;
        } else if (Module.exists(hlDir + modLowerCase)) {
          fullPath = hlDir + modLowerCase;
        } else if (fullPath.indexOf('.') === -1 && Module.exists(hlDir + fullPath + '/' + fullPath)) {
          fullPath = hlDir + fullPath + '/' + fullPath;
        } else if (fullPath.indexOf('.') === -1 && Module.exists(hlDir + modLowerCase + '/' + modLowerCase)) {
          fullPath = hlDir + modLowerCase + '/' + modLowerCase;
        } else {
          var lastIndex = fullPath.lastIndexOf('.');
          var tempPath = hlDir + fullPath.slice(0, lastIndex) + '$' + fullPath.slice(lastIndex + 1);
          if (Module.exists(fullPath)) {
            fullPath = tempPath;
          }
        }
      }
    }

    var freshModule = new Module(fullPath);

    freshModule.cache();
    freshModule._compile();

    while (!freshModule.loaded) {/* no-op */}

    return freshModule.exports;
  };

  /**
      * [getCached description]
      * @param  {string} id moduel identifier
      * @return {Module} cached module
      *
      * @public
      */
  Module.getCached = function (id) {
    return Module._cache[id];
  };

  /**
      * check if module file exists
      *
      * @param  {string} id module identifier
      * @return {boolean} whether the module exists
      * @public
      */
  Module.exists = function (id) {
    var path = Ti.Filesystem.resourcesDirectory + id + '.js',
    file = Ti.Filesystem.getFile(path);

    if (file.exists()) {
      return true;
    }
    if (!this.platform) {
      return false;
    }

    var pFolderPath = Ti.Filesystem.resourcesDirectory + '/' + this.platform + '/' + id + '.js';
    var pFile = Ti.Filesystem.getFile(pFolderPath);
    return pFile.exists();
  };

  /**
      * shady xhrSync request
      *
      * @param  {string} file file to load
      * @param  {number} timeout in milliseconds
      * @return {(string|boolean)} file contents if successful, false if not
      * @private
      */
  Module.prototype._getRemoteSource = function (file, timeout) {
    var expireTime = new Date().getTime() + timeout;
    var request = Ti.Network.createHTTPClient();
    var rsp = null;
    var done = false;
    var url = 'http://' + Module._url + ':' + Module._port + '/' + (file || this.id) + '.js';
    request.cache = false;
    request.open('GET', url);
    request.setRequestHeader('x-platform', this.platform);
    request.send();

    //
    // Windows only private API: _waitForResponse() waits for the response from the server.
    //
    if (this.platform === 'windows' && request._waitForResponse) {
      request._waitForResponse();
      if (request.readyState === 4 || request.status === 404) {
        rsp = request.status === 200 ? request.responseText : false;
      } else {
        throw new Error('[LiveView] File Server unavailable. Host Unreachable @ ' + Module._url + ':' + Module._port + '\n[LiveView] Please ensure your device and computer are on the same network and the port is not blocked.');
      }
      done = true;
    }

    while (!done) {
      if (request.readyState === 4 || request.status === 404) {
        rsp = request.status === 200 ? request.responseText : false;
        done = true;
      } else if (expireTime - new Date().getTime() <= 0) {
        rsp = false;
        done = true;
        throw new Error('[LiveView] File Server unavailable. Host Unreachable @ ' + Module._url + ':' + Module._port + '\n[LiveView] Please ensure your device and computer are on the same network and the port is not blocked.');
      }
    }

    return rsp;
  };

  /**
      * get module file source text
      * @return {string}
      * @private
      */
  Module.prototype._getSource = function () {
    var id = this.id;
    var isRemote = /^(http|https)$/.test(id) || global.ENV === 'liveview';
    if (isRemote) {
      return this._getRemoteSource(null, 10000);
    } else {
      if (id === 'app') {
        id = '_app';
      }
      var file = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, id + '.js');
      return (file.read() || {}).text;
    }
  };

  /**
      * wrap module source text in commonjs anon function wrapper
      *
      * @param  {string} source The raw source we're wrapping in an IIFE
      * @return {string}
      * @private
      */
  Module._wrap = function (source) {
    source = source.replace(/T[i||itanium]+.include\(['|"]([^"'\r\n$]*)['|"]\)/g, function (exp, val) {
      var file = ('' + val).replace('.js', '');
      var _src = Module.prototype._getRemoteSource(file, 10000);
      var evalSrc = 'try {\n' + _src + '\n} catch (err) {\n' + 'lvGlobal.process.emit("uncaughtException", {module: "' + val + '", error: err});' + '\n}';
      return evalSrc;
    });
    return global.CATCH_ERRORS ? Module._errWrapper[0] + source + Module._errWrapper[1] : source;
  };

  // uncaught exception handler wrapper
  Module._errWrapper = ['try {\n', '\n} catch (err) {\nlvGlobal.process.emit("uncaughtException", {module: __filename, error: err, source: module.source});\n}'];

  /**
                                                                                                                                                                   * compile commonjs module and string to js
                                                                                                                                                                   *
                                                                                                                                                                   * @private
                                                                                                                                                                   */
  Module.prototype._compile = function () {
    var src = this._getSource();
    if (!src) {
      this.exports = Module._requireNative(this.id);
      this.loaded = true;
      return;
    }
    Module._compileList.push(this.id);
    this.source = Module._wrap(src);
    try {
      var fn = new Function('exports, require, module, __filename, __dirname, lvGlobal, L', this.source); // eslint-disable-line no-new-func
      fn(this.exports, Module.require, this, this.filename, this.__dirname, global, L);
    } catch (err) {
      process.emit('uncaughtException', { module: this.id, error: err, source: ('' + this.source).split('\n') });
    }

    Module._compileList.pop();
    this.loaded = true;
  };

  /**
      * cache current module
      *
      * @public
      */
  Module.prototype.cache = function () {
    this.timestamp = new Date().getTime();
    Module._cache[this.id] = this;
  };

  /**
      * [ description]
      * @param  {[type]} [description]
      * @return {[type]} [description]
      */

  process.on('uncaughtException', function (err) {
    console.log('[LiveView] Error Evaluating', err.module, '@ Line:', err.error.line);
    // console.error('Line ' + err.error.line, ':', err.source[err.error.line]);
    console.error('' + err.error);
    console.error('File:', err.module);
    console.error('Line:', err.error.line);
    console.error('SourceId:', err.error.sourceId);
    console.error('Backtrace:\n', ('' + err.error.backtrace).replace(/'\n'/g, '\n'));
  });

  Module.patch(globalScope, '192.168.0.15', '8324');

  // Prevent display from sleeping

  Titanium.App.idleTimerDisabled = true;
})(global);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpdmV2aWV3LmpzIl0sIm5hbWVzIjpbImdsb2JhbFNjb3BlIiwiT2JqZWN0Iiwic2V0UHJvdG90eXBlT2YiLCJvYmoiLCJwcm90byIsIl9fcHJvdG9fXyIsIlByb2Nlc3MiLCJ0aXRsZSIsInZlcnNpb24iLCJtb2R1bGVMb2FkTGlzdCIsInZlcnNpb25zIiwiYXJjaCIsIlRpIiwiUGxhdGZvcm0iLCJhcmNoaXRlY3R1cmUiLCJwbGF0Zm9ybSIsIm9zbmFtZSIsImhhcmR3YXJlIiwibW9kZWwiLCJyZXBsYWNlIiwicHJvdG90eXBlIiwiRW1pdHRlciIsIm1peGluIiwia2V5Iiwib24iLCJldmVudCIsImZuIiwiX2NhbGxiYWNrcyIsInB1c2giLCJvbmNlIiwic2VsZiIsIm9mZiIsImFwcGx5IiwiYXJndW1lbnRzIiwiX29mZiIsImNhbGxiYWNrcyIsImxlbmd0aCIsImkiLCJpbmRleE9mIiwic3BsaWNlIiwiZW1pdCIsImFyZ3MiLCJzbGljZSIsImNhbGwiLCJsZW4iLCJsaXN0ZW5lcnMiLCJoYXNMaXN0ZW5lcnMiLCJtb2R1bGUiLCJleHBvcnRzIiwiU29ja2V0Iiwib3B0cyIsInRpbWVvdXQiLCJob3N0IiwicG9ydCIsInJldHJ5IiwiYnl0ZXNSZWFkIiwiYnl0ZXNXcml0dGVuIiwiaWdub3JlIiwiY29ubmVjdCIsInJlQ29ubmVjdCIsIl9wcm94eSIsIk5ldHdvcmsiLCJjcmVhdGVUQ1AiLCJjb25uZWN0ZWQiLCJlIiwiX2Nvbm5lY3Rpb24iLCJzb2NrZXQiLCJTdHJlYW0iLCJwdW1wIiwiYnl0ZXNQcm9jZXNzZWQiLCJlcnJvclN0YXR1cyIsImNsb3NlIiwiYnVmZmVyIiwiZXJyb3IiLCJlcnIiLCJjb2RlIiwiZXJyb3JDb2RlIiwic2VydmVyRW5kZWQiLCJjbG9zaW5nIiwid3JpdGUiLCJzZXRUaW1lb3V0IiwiZGF0YSIsIm1zZyIsImNyZWF0ZUJ1ZmZlciIsInZhbHVlIiwiY2FsbGJhY2siLCJzZXRLZWVwQWxpdmUiLCJlbmFibGUiLCJpbml0aWFsRGVsYXkiLCJfa2VlcEFsaXZlIiwiY2xlYXJJbnRlcnZhbCIsInNldEludGVydmFsIiwiZ2xvYmFsIiwicHJvY2VzcyIsIk1vZHVsZSIsImlkIiwiZmlsZW5hbWUiLCJsb2FkZWQiLCJMIiwibmFtZSIsImZpbGxlciIsIl9nbG9iYWxDdHgiLCJsb2NhbGVTdHJpbmdzIiwiTG9jYWxlIiwiY3VycmVudExhbmd1YWdlIiwiX2dsb2JhbCIsIkVOViIsImxvZ2dpbmciLCJDQVRDSF9FUlJPUlMiLCJfY2FjaGUiLCJfcmVxdWlyZU5hdGl2ZSIsIkVycm9yIiwiX2luY2x1ZGVOYXRpdmUiLCJwYXRjaCIsImdsb2JhbEN0eCIsInVybCIsImRlZmF1bHRVUkwiLCJfdXJsIiwiX3BvcnQiLCJwYXJzZUludCIsInJlcXVpcmUiLCJldnRTZXJ2ZXIiLCJfY29tcGlsZUxpc3QiLCJBcHAiLCJQcm9wZXJ0aWVzIiwic2V0Qm9vbCIsImNvbm5lY3RTZXJ2ZXIiLCJyZWxvYWQiLCJjb25zb2xlIiwibG9nIiwiX3Jlc3RhcnQiLCJyZXRyeUludGVydmFsIiwiY2xpZW50IiwiZXZ0IiwiSlNPTiIsInBhcnNlIiwidHlwZSIsImluY2x1ZGUiLCJjdHgiLCJmaWxlIiwic3JjIiwiX2dldFJlbW90ZVNvdXJjZSIsImV2YWwiLCJ0b0Fic29sdXRlIiwicGFyZW50IiwicmVsYXRpdmUiLCJuZXdQYXRoIiwic3BsaXQiLCJwYXJ0cyIsInBvcCIsImpvaW4iLCJmdWxsUGF0aCIsImNhY2hlZCIsImdldENhY2hlZCIsImV4aXN0cyIsImhsRGlyIiwibW9kTG93ZXJDYXNlIiwidG9Mb3dlckNhc2UiLCJsYXN0SW5kZXgiLCJsYXN0SW5kZXhPZiIsInRlbXBQYXRoIiwiZnJlc2hNb2R1bGUiLCJjYWNoZSIsIl9jb21waWxlIiwicGF0aCIsIkZpbGVzeXN0ZW0iLCJyZXNvdXJjZXNEaXJlY3RvcnkiLCJnZXRGaWxlIiwicEZvbGRlclBhdGgiLCJwRmlsZSIsImV4cGlyZVRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsInJlcXVlc3QiLCJjcmVhdGVIVFRQQ2xpZW50IiwicnNwIiwiZG9uZSIsIm9wZW4iLCJzZXRSZXF1ZXN0SGVhZGVyIiwic2VuZCIsIl93YWl0Rm9yUmVzcG9uc2UiLCJyZWFkeVN0YXRlIiwic3RhdHVzIiwicmVzcG9uc2VUZXh0IiwiX2dldFNvdXJjZSIsImlzUmVtb3RlIiwidGVzdCIsInJlYWQiLCJ0ZXh0IiwiX3dyYXAiLCJzb3VyY2UiLCJleHAiLCJ2YWwiLCJfc3JjIiwiZXZhbFNyYyIsIl9lcnJXcmFwcGVyIiwiRnVuY3Rpb24iLCJfX2Rpcm5hbWUiLCJ0aW1lc3RhbXAiLCJsaW5lIiwic291cmNlSWQiLCJiYWNrdHJhY2UiLCJUaXRhbml1bSIsImlkbGVUaW1lckRpc2FibGVkIl0sIm1hcHBpbmdzIjoiQUFBQTs7OztBQUlBLENBQUMsVUFBVUEsV0FBVixFQUF1Qjs7QUFFdkJDLEVBQUFBLE1BQU0sQ0FBQ0MsY0FBUCxHQUF3QkQsTUFBTSxDQUFDQyxjQUFQLElBQXlCLFVBQVVDLEdBQVYsRUFBZUMsS0FBZixFQUFzQjtBQUN0RUQsSUFBQUEsR0FBRyxDQUFDRSxTQUFKLEdBQWdCRCxLQUFoQjtBQUNBLFdBQU9ELEdBQVA7QUFDQSxHQUhEO0FBSUE7QUFDQTs7Ozs7QUFLQSxXQUFTRyxPQUFULEdBQW1CO0FBQ2xCLFFBQUksRUFBRSxnQkFBZ0JBLE9BQWxCLENBQUosRUFBZ0M7QUFDL0IsYUFBTyxJQUFJQSxPQUFKLEVBQVA7QUFDQTtBQUNELFNBQUtDLEtBQUwsR0FBYSxVQUFiO0FBQ0EsU0FBS0MsT0FBTCxHQUFlLEVBQWY7QUFDQSxTQUFLQyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixFQUFoQjtBQUNBLFNBQUtDLElBQUwsR0FBWUMsRUFBRSxDQUFDQyxRQUFILENBQVlDLFlBQXhCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkgsRUFBRSxDQUFDQyxRQUFILENBQVlHLE1BQTVCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixDQUFDLEtBQUtMLEVBQUUsQ0FBQ0MsUUFBSCxDQUFZSyxLQUFsQixF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QUExQixFQUEwQyxNQUExQzs7QUFFQTs7QUFFQTBNLEVBQUFBLFFBQVEsQ0FBQy9FLEdBQVQsQ0FBYWdGLGlCQUFiLEdBQWlDLElBQWpDO0FBQ0EsQ0EzdkJEIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBsaXZldmlldyBUaXRhbml1bSBDb21tb25KUyByZXF1aXJlIHdpdGggc29tZSBOb2RlLmpzIGxvdmUgYW5kIGRpcnR5IGhhY2tzXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAxNyBBcHBjZWxlcmF0b3JcbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWxTY29wZSkge1xuXG5cdE9iamVjdC5zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiAob2JqLCBwcm90bykge1xuXHRcdG9iai5fX3Byb3RvX18gPSBwcm90bztcblx0XHRyZXR1cm4gb2JqO1xuXHR9O1xuXHQvKiBnbG9iYWxzIEVtaXR0ZXIgKi9cblx0LyoqXG4gICogSW5pdGlhbGl6ZSBhIG5ldyBgUHJvY2Vzc2AuXG4gICogQHJldHVybnMge1Byb2Nlc3N9XG4gICogQHB1YmxpY1xuICAqL1xuXHRmdW5jdGlvbiBQcm9jZXNzKCkge1xuXHRcdGlmICghKHRoaXMgaW5zdGFuY2VvZiBQcm9jZXNzKSkge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9jZXNzKCk7XG5cdFx0fVxuXHRcdHRoaXMudGl0bGUgPSAndGl0YW5pdW0nO1xuXHRcdHRoaXMudmVyc2lvbiA9ICcnO1xuXHRcdHRoaXMubW9kdWxlTG9hZExpc3QgPSBbXTtcblx0XHR0aGlzLnZlcnNpb25zID0ge307XG5cdFx0dGhpcy5hcmNoID0gVGkuUGxhdGZvcm0uYXJjaGl0ZWN0dXJlO1xuXHRcdHRoaXMucGxhdGZvcm0gPSBUaS5QbGF0Zm9ybS5vc25hbWU7XG5cdFx0dGhpcy5oYXJkd2FyZSA9ICgnJyArIFRpLlBsYXRmb3JtLm1vZGVsKS5yZXBsYWNlKCdnb29nbGVfJyk7XG5cdH1cblxuXHQvLyBpbmhlcml0IGZyb20gRXZlbnRFbWl0dGVyXG5cdE9iamVjdC5zZXRQcm90b3R5cGVPZihQcm9jZXNzLnByb3RvdHlwZSwgRW1pdHRlci5wcm90b3R5cGUpO1xuXG5cdC8qXG4gICogRXZlbnQgRW1pdHRlcnNcbiAgKi9cblxuXHQvKipcbiAgKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAgKlxuICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogT2JqZWN0IHRvIGJlIG1peGVkIGluIHRvIGVtaXR0ZXJcbiAgKiBAcmV0dXJucyB7RW1pdHRlcn1cbiAgKiBAcHVibGljXG4gICovXG5cdGZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG5cdFx0aWYgKG9iaikge1xuXHRcdFx0cmV0dXJuIG1peGluKG9iaik7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG4gICogTWl4aW4gdGhlIGVtaXR0ZXIgcHJvcGVydGllcy5cbiAgKlxuICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogb2JqZWN0IHRvIGJlIG1peGVkIGluXG4gICogQHJldHVybiB7T2JqZWN0fSBvYmplY3Qgd2l0aCBFbWl0dGVyIHByb3BlcnRpZXMgbWl4ZWQgaW5cbiAgKiBAcHJpdmF0ZVxuICAqL1xuXHRmdW5jdGlvbiBtaXhpbihvYmopIHtcblx0XHRmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcblx0XHRcdG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iajtcblx0fVxuXG5cdC8qKlxuICAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gICpcbiAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnQgZXZlbnQgbmFtZSB0byBob29rIGNhbGxiYWNrIHRvXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2sgZnVuY3Rpb25cbiAgKiBAcmV0dXJuIHtFbWl0dGVyfSB0aGlzXG4gICogQHB1YmxpY1xuICAqL1xuXHRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcblx0XHR0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cdFx0KHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdKS5wdXNoKGZuKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvKipcbiAgKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAgKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxuICAqXG4gICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50IGV2ZW50IG5hbWUgdG8gaG9vayBjYWxsYmFjayB0b1xuICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICogQHJldHVybiB7RW1pdHRlcn0gdGhpc1xuICAqIEBwdWJsaWNcbiAgKi9cblx0RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG5cdFx0LyoqXG4gICAqIHNpbmdsZS1maXJlIGNhbGxiYWNrIGZvciBldmVudFxuICAgKi9cblx0XHRmdW5jdGlvbiBvbigpIHtcblx0XHRcdHNlbGYub2ZmKGV2ZW50LCBvbik7XG5cdFx0XHRmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdH1cblxuXHRcdGZuLl9vZmYgPSBvbjtcblx0XHR0aGlzLm9uKGV2ZW50LCBvbik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0LyoqXG4gICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAgKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgKlxuICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudCBldmVudCBuYW1lIHRvIHJlbW92ZSBjYWxsYmFjayBmcm9tXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2sgZnVuY3Rpb25cbiAgKiBAcmV0dXJuIHtFbWl0dGVyfSB0aGlzXG4gICogQHB1YmxpY1xuICAqL1xuXHRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XG5cdFx0dGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXHRcdHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuXHRcdGlmICghY2FsbGJhY2tzKSB7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHQvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0Ly8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcblx0XHR2YXIgaSA9IGNhbGxiYWNrcy5pbmRleE9mKGZuLl9vZmYgfHwgZm4pO1xuXHRcdGlmICh+aSkge1xuXHRcdFx0Y2FsbGJhY2tzLnNwbGljZShpLCAxKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0LyoqXG4gICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXG4gICpcbiAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnQgZXZlbnQgbmFtZVxuICAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gICogQHB1YmxpY1xuICAqL1xuXHRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0dGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXHRcdHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuXG5cdFx0aWYgKGNhbGxiYWNrcykge1xuXHRcdFx0Y2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuXHRcdFx0XHRjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0LyoqXG4gICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAgKlxuICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudCBldmVudCBuYW1lXG4gICogQHJldHVybiB7QXJyYXl9IGFycmF5IG9mIGNhbGxiYWNrcyByZWdpc3RlcmVkIGZvciB0aGF0IGV2ZW50XG4gICogQHB1YmxpY1xuICAqL1xuXHRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHR0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cdFx0cmV0dXJuIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gfHwgW107XG5cdH07XG5cblx0LyoqXG4gICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxuICAqXG4gICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50IGV2ZW50IG5hbWVcbiAgKiBAcmV0dXJuIHtib29sZWFufVxuICAqIEBwdWJsaWNcbiAgKi9cblx0RW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0cmV0dXJuICEhdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcblx0fTtcblx0LyogZ2xvYmFscyBFbWl0dGVyICovXG5cdC8qKlxuICAqIEV4cG9zZSBgU29ja2V0YC5cbiAgKi9cblx0aWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBTb2NrZXQ7XG5cdH1cblxuXHQvKipcbiAgKiBbU29ja2V0IGRlc2NyaXB0aW9uXVxuICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIFtkZXNjcmlwdGlvbl1cbiAgKiBAcmV0dXJucyB7U29ja2V0fVxuICAqL1xuXHRmdW5jdGlvbiBTb2NrZXQob3B0cykge1xuXHRcdGlmICghKHRoaXMgaW5zdGFuY2VvZiBTb2NrZXQpKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFNvY2tldChvcHRzKTtcblx0XHR9XG5cdFx0b3B0cyA9IG9wdHMgfHwge307XG5cdFx0dGhpcy50aW1lb3V0ID0gNTAwMDtcblx0XHR0aGlzLmhvc3QgPSBvcHRzLmhvc3Q7XG5cdFx0dGhpcy5wb3J0ID0gb3B0cy5wb3J0O1xuXHRcdHRoaXMucmV0cnkgPSBvcHRzLnJldHJ5O1xuXHRcdHRoaXMuYnl0ZXNSZWFkID0gMDtcblx0XHR0aGlzLmJ5dGVzV3JpdHRlbiA9IDA7XG5cdFx0dGhpcy5pZ25vcmUgPSBbXTtcblx0fVxuXG5cdC8qKlxuICAqIEluaGVyaXQgZnJvbSBgRW1pdHRlci5wcm90b3R5cGVgLlxuICAqL1xuXHRPYmplY3Quc2V0UHJvdG90eXBlT2YoU29ja2V0LnByb3RvdHlwZSwgRW1pdHRlci5wcm90b3R5cGUpO1xuXG5cdC8qKlxuICAqIFtjb25uZWN0IGRlc2NyaXB0aW9uXVxuICAqIEBwYXJhbSAge09iamVjdH0gICBvcHRzIFtkZXNjcmlwdGlvbl1cbiAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gICBbZGVzY3JpcHRpb25dXG4gICovXG5cdFNvY2tldC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIChvcHRzLCBmbikge1xuXHRcdG9wdHMgPSBvcHRzIHx8IHt9O1xuXHRcdGlmICh0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Zm4gPSBvcHRzO1xuXHRcdFx0b3B0cyA9IHt9O1xuXHRcdH1cblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRzZWxmLmhvc3QgPSBvcHRzLmhvc3QgfHwgc2VsZi5ob3N0IHx8ICcxMjcuMC4wLjEnO1xuXHRcdHNlbGYucG9ydCA9IG9wdHMucG9ydCB8fCBzZWxmLnBvcnQ7XG5cdFx0c2VsZi5yZXRyeSA9IG9wdHMucmV0cnkgfHwgc2VsZi5yZXRyeTtcblxuXHRcdHZhciByZUNvbm5lY3QgPSAhIW9wdHMucmVDb25uZWN0O1xuXHRcdHRoaXMuX3Byb3h5ID0gVGkuTmV0d29yay5Tb2NrZXQuY3JlYXRlVENQKHtcblx0XHRcdGhvc3Q6IHNlbGYuaG9zdCxcblx0XHRcdHBvcnQ6IHNlbGYucG9ydCxcblx0XHRcdC8qKlxuICAgICogW2Rlc2NyaXB0aW9uXVxuICAgICogQHBhcmFtICB7T2JqZWN0fSBlIFtkZXNjcmlwdGlvbl1cbiAgICAqL1xuXHRcdFx0Y29ubmVjdGVkOiBmdW5jdGlvbiBjb25uZWN0ZWQoZSkge1xuXHRcdFx0XHRzZWxmLmNvbm5lY3RlZCA9IHRydWU7XG5cdFx0XHRcdHNlbGYuX2Nvbm5lY3Rpb24gPSBlLnNvY2tldDtcblx0XHRcdFx0Zm4gJiYgZm4oZSk7XG5cdFx0XHRcdHNlbGYuZW1pdChyZUNvbm5lY3QgPyAncmVjb25uZWN0JyA6ICdjb25uZWN0JywgZSk7XG5cblx0XHRcdFx0VGkuU3RyZWFtLnB1bXAoZS5zb2NrZXQsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0aWYgKGUuYnl0ZXNQcm9jZXNzZWQgPCAwIHx8ICEhZS5lcnJvclN0YXR1cykge1xuXHRcdFx0XHRcdFx0c2VsZi5fcHJveHkuY2xvc2UoKTtcblx0XHRcdFx0XHRcdHNlbGYuY2xvc2UodHJ1ZSk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHNlbGYuZW1pdCgnZGF0YScsICcnICsgZS5idWZmZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgMTAyNCwgdHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0LyoqXG4gICAgKiBbZGVzY3JpcHRpb25dXG4gICAgKiBAcGFyYW0gIHtPYmplY3R9IGUgW2Rlc2NyaXB0aW9uXVxuICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAqL1xuXHRcdFx0ZXJyb3I6IGZ1bmN0aW9uIGVycm9yKGUpIHtcblx0XHRcdFx0dmFyIGVyciA9IHsgY29kZTogZS5lcnJvckNvZGUsIGVycm9yOiBlLmVycm9yIH07XG5cdFx0XHRcdGlmICghfnNlbGYuaWdub3JlLmluZGV4T2YoZXJyLmNvZGUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYuZW1pdCgnZXJyb3IgaWdub3JlZCcsIGVycik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLl9wcm94eS5jb25uZWN0KCk7XG5cdH07XG5cblx0LyoqXG4gICogW2Nsb3NlIGRlc2NyaXB0aW9uXVxuICAqIEBwYXJhbSB7Ym9vbGVhbn0gc2VydmVyRW5kZWQgW2Rlc2NyaXB0aW9uXVxuICAqL1xuXHRTb2NrZXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKHNlcnZlckVuZGVkKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0c2VsZi5jb25uZWN0ZWQgPSBmYWxzZTtcblx0XHRzZWxmLmNsb3NpbmcgPSAhc2VydmVyRW5kZWQ7XG5cblx0XHRpZiAoc2VsZi5jbG9zaW5nKSB7XG5cdFx0XHRzZWxmLndyaXRlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0c2VsZi5fcHJveHkuY2xvc2UoKTtcblx0XHRcdFx0c2VsZi5lbWl0KCdjbG9zZScpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHJldHJ5ID0gfn5zZWxmLnJldHJ5O1xuXG5cdFx0c2VsZi5lbWl0KCdlbmQnKTtcblx0XHRpZiAoIXJldHJ5KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLmVtaXQoJ3JlY29ubmVjdGluZycpO1xuXHRcdFx0c2VsZi5jb25uZWN0KHsgcmVDb25uZWN0OiB0cnVlIH0pO1xuXHRcdH0sIHJldHJ5KTtcblx0fTtcblxuXHQvKipcbiAgKiBbZGVzY3JpcHRpb25dXG4gICogQHBhcmFtICB7c3RyaW5nfSAgIGRhdGEgW2Rlc2NyaXB0aW9uXVxuICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgIFtkZXNjcmlwdGlvbl1cbiAgKi9cblx0U29ja2V0LnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChkYXRhLCBmbikge1xuXHRcdGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Zm4gPSBkYXRhO1xuXHRcdFx0ZGF0YSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0ZGF0YSA9IGRhdGEgPyAnJyArIGRhdGEgOiAnJztcblxuXHRcdHZhciBtc2cgPSBUaS5jcmVhdGVCdWZmZXIoeyB2YWx1ZTogZGF0YSB9KTtcblxuXHRcdHZhciBjYWxsYmFjayA9IGZuIHx8IGZ1bmN0aW9uICgpIHt9O1xuXG5cdFx0VGkuU3RyZWFtLndyaXRlKHRoaXMuX2Nvbm5lY3Rpb24sIG1zZywgZnVuY3Rpb24gKCkge1xuXHRcdFx0Y2FsbGJhY2soW10uc2xpY2UoYXJndW1lbnRzKSk7XG5cdFx0fSk7XG5cdH07XG5cblx0LyoqXG4gICogW3NldEtlZXBBbGl2ZSBkZXNjcmlwdGlvbl1cbiAgKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZSAgICAgICBbZGVzY3JpcHRpb25dXG4gICogQHBhcmFtIHtudW1iZXJ9IGluaXRpYWxEZWxheSBbZGVzY3JpcHRpb25dXG4gICovXG5cdFNvY2tldC5wcm90b3R5cGUuc2V0S2VlcEFsaXZlID0gZnVuY3Rpb24gKGVuYWJsZSwgaW5pdGlhbERlbGF5KSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdGlmICghZW5hYmxlKSB7XG5cdFx0XHRzZWxmLl9rZWVwQWxpdmUgJiYgY2xlYXJJbnRlcnZhbChzZWxmLl9rZWVwQWxpdmUpO1xuXHRcdFx0c2VsZi5fa2VlcEFsaXZlID0gbnVsbDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0c2VsZi5fa2VlcEFsaXZlID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi53cml0ZSgncGluZycpO1xuXHRcdH0sIGluaXRpYWxEZWxheSB8fCAzMDAwMDApO1xuXHR9O1xuXHQvKiBnbG9iYWxzIFByb2Nlc3MsIFNvY2tldCAqL1xuXHR2YXIgZ2xvYmFsLCBwcm9jZXNzO1xuXG5cdC8qKlxuICAqIEluaXRpYWxpemUgYSBuZXcgYE1vZHVsZWAuXG4gICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSBtb2R1bGUgaWRlbnRpZmllclxuICAqIEBwdWJsaWNcbiAgKi9cblx0ZnVuY3Rpb24gTW9kdWxlKGlkKSB7XG5cdFx0dGhpcy5maWxlbmFtZSA9IGlkICsgJy5qcyc7XG5cdFx0dGhpcy5pZCA9IGlkO1xuXHRcdGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnaXBhZCcpIHtcblx0XHRcdHRoaXMucGxhdGZvcm0gPSAnaXBob25lJztcblx0XHR9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW5kb3dzcGhvbmUnIHx8IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW5kb3dzc3RvcmUnKSB7XG5cdFx0XHR0aGlzLnBsYXRmb3JtID0gJ3dpbmRvd3MnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnBsYXRmb3JtID0gcHJvY2Vzcy5wbGF0Zm9ybTtcblx0XHR9XG5cdFx0dGhpcy5leHBvcnRzID0ge307XG5cdFx0dGhpcy5sb2FkZWQgPSBmYWxzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIEwobmFtZSwgZmlsbGVyKSB7XG5cdFx0cmV0dXJuIChNb2R1bGUuX2dsb2JhbEN0eC5sb2NhbGVTdHJpbmdzW1RpLkxvY2FsZS5jdXJyZW50TGFuZ3VhZ2VdIHx8IHt9KVtuYW1lXSB8fCBmaWxsZXIgfHwgbmFtZTtcblx0fVxuXG5cdC8vIGdsb2JhbCBuYW1lc3BhY2Vcblx0Z2xvYmFsID0gTW9kdWxlLl9nbG9iYWwgPSBNb2R1bGUuZ2xvYmFsID0ge307XG5cblx0Ly8gbWFpbiBwcm9jZXNzXG5cdHByb2Nlc3MgPSBnbG9iYWwucHJvY2VzcyA9IG5ldyBQcm9jZXNzKCk7XG5cblx0Ly8gc2V0IGVudmlyb25tZW50IHR5cGVcblx0Z2xvYmFsLkVOViA9ICdsaXZldmlldyc7XG5cblx0Ly8gc2V0IGxvZ2dpbmdcblx0Z2xvYmFsLmxvZ2dpbmcgPSBmYWxzZTtcblxuXHQvLyBjYXRjaCB1bmNhdWdodCBlcnJvcnNcblx0Z2xvYmFsLkNBVENIX0VSUk9SUyA9IHRydWU7XG5cblx0Ly8gbW9kdWxlIGNhY2hlXG5cdE1vZHVsZS5fY2FjaGUgPSB7fTtcblxuXHQvKipcbiAgKiBwbGFjZSBob2xkZXIgZm9yIG5hdGl2ZSByZXF1aXJlIHVudGlsIHBhdGNoZWRcbiAgKlxuICAqIEBwcml2YXRlXG4gICovXG5cdE1vZHVsZS5fcmVxdWlyZU5hdGl2ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ01vZHVsZS5wYXRjaCBtdXN0IGJlIHJ1biBmaXJzdCcpO1xuXHR9O1xuXG5cdC8qKlxuICAqIHBsYWNlIGhvbGRlciBmb3IgbmF0aXZlIHJlcXVpcmUgdW50aWwgcGF0Y2hlZFxuICAqXG4gICogQHByaXZhdGVcbiAgKi9cblx0TW9kdWxlLl9pbmNsdWRlTmF0aXZlID0gZnVuY3Rpb24gKCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignTW9kdWxlLnBhdGNoIG11c3QgYmUgcnVuIGZpcnN0Jyk7XG5cdH07XG5cblx0LyoqXG4gICogcmVwbGFjZSBidWlsdCBpbiBgcmVxdWlyZWAgZnVuY3Rpb25cbiAgKlxuICAqIEBwYXJhbSAge09iamVjdH0gZ2xvYmFsQ3R4IEdsb2JhbCBjb250ZXh0XG4gICogQHBhcmFtICB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB1c2UgKGRlZmF1bHQgaXMgJzEyNy4wLjAuMScsIG9yICcxMC4wLjIuMicgb24gYW5kcm9pZCBlbXVsYXRvcilcbiAgKiBAcGFyYW0gIHtudW1iZXJ9IHBvcnQgVGhlIHBvcnQgdG8gdXNlIChkZWZhdWx0IGlzIDgzMjQpXG4gICogQHByaXZhdGVcbiAgKi9cblx0TW9kdWxlLnBhdGNoID0gZnVuY3Rpb24gKGdsb2JhbEN0eCwgdXJsLCBwb3J0KSB7XG5cdFx0dmFyIGRlZmF1bHRVUkwgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnYW5kcm9pZCcgJiYgcHJvY2Vzcy5oYXJkd2FyZSA9PT0gJ3NkaycgPyAnMTAuMC4yLjInIDogVGkuUGxhdGZvcm0ubW9kZWwgPT09ICdTaW11bGF0b3InID8gJzEyNy4wLjAuMScgOiAnMTkyLjE2OC4wLjE1Jztcblx0XHRNb2R1bGUuX2dsb2JhbEN0eCA9IGdsb2JhbEN0eDtcblx0XHRnbG9iYWwuX2dsb2JhbEN0eCA9IGdsb2JhbEN0eDtcblx0XHRNb2R1bGUuX3VybCA9IHVybCB8fCBkZWZhdWx0VVJMO1xuXHRcdE1vZHVsZS5fcG9ydCA9IHBhcnNlSW50KHBvcnQsIDEwKSB8fCA4MzI0O1xuXHRcdE1vZHVsZS5fcmVxdWlyZU5hdGl2ZSA9IGdsb2JhbEN0eC5yZXF1aXJlO1xuXHRcdE1vZHVsZS5ldnRTZXJ2ZXIgJiYgTW9kdWxlLmV2dFNlcnZlci5jbG9zZSgpO1xuXHRcdE1vZHVsZS5fY29tcGlsZUxpc3QgPSBbXTtcblxuXHRcdC8vIEZJWCBmb3IgYW5kcm9pZCBidWdcblx0XHR0cnkge1xuXHRcdFx0VGkuQXBwLlByb3BlcnRpZXMuc2V0Qm9vbCgndGkuYW5kcm9pZC5idWcyMzczLmZpbmlzaGZhbHNlcm9vdCcsIGZhbHNlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvLyBpZ25vcmVcblx0XHR9XG5cblx0XHRnbG9iYWxDdHgubG9jYWxlU3RyaW5ncyA9IE1vZHVsZS5yZXF1aXJlKCdsb2NhbGVTdHJpbmdzJyk7XG5cdFx0TW9kdWxlLmNvbm5lY3RTZXJ2ZXIoKTtcblx0fTtcblxuXHQvKipcbiAgKiBbcmVsb2FkIGRlc2NyaXB0aW9uXVxuICAqL1xuXHRNb2R1bGUuZ2xvYmFsLnJlbG9hZCA9IGZ1bmN0aW9uICgpIHtcblx0XHR0cnkge1xuXHRcdFx0TW9kdWxlLmV2dFNlcnZlci5fcHJveHkuY2xvc2UoKTtcblx0XHRcdGNvbnNvbGUubG9nKCdbTGl2ZVZpZXddIFJlbG9hZGluZyBBcHAnKTtcblx0XHRcdFRpLkFwcC5fcmVzdGFydCgpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbTGl2ZVZpZXddIFJlbG9hZGluZyBBcHAgdmlhIExlZ2FjeSBNZXRob2QnKTtcblx0XHRcdE1vZHVsZS5yZXF1aXJlKCdhcHAnKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG4gICogW2Rlc2NyaXB0aW9uXVxuICAqL1xuXHRNb2R1bGUuY29ubmVjdFNlcnZlciA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgcmV0cnlJbnRlcnZhbCA9IG51bGw7XG5cdFx0dmFyIGNsaWVudCA9IE1vZHVsZS5ldnRTZXJ2ZXIgPSBuZXcgU29ja2V0KHsgaG9zdDogTW9kdWxlLl91cmwsIHBvcnQ6IHBhcnNlSW50KCc4MzIzJywgMTApIH0sIGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbTGl2ZVZpZXddJywgJ0Nvbm5lY3RlZCB0byBFdmVudCBTZXJ2ZXInKTtcblx0XHR9KTtcblxuXHRcdGNsaWVudC5vbignY2xvc2UnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW0xpdmVWaWV3XScsICdDbG9zZWQgUHJldmlvdXMgRXZlbnQgU2VydmVyIGNsaWVudCcpO1xuXHRcdH0pO1xuXG5cdFx0Y2xpZW50Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHJldHJ5SW50ZXJ2YWwpIHtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChyZXRyeUludGVydmFsKTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tMaXZlVmlld10nLCAnUmVjb25uZWN0ZWQgdG8gRXZlbnQgU2VydmVyJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRjbGllbnQub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0aWYgKCFkYXRhKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhciBldnQgPSBKU09OLnBhcnNlKCcnICsgZGF0YSk7XG5cdFx0XHRcdGlmIChldnQudHlwZSA9PT0gJ2V2ZW50JyAmJiBldnQubmFtZSA9PT0gJ3JlbG9hZCcpIHtcblx0XHRcdFx0XHRNb2R1bGUuX2NhY2hlID0ge307XG5cdFx0XHRcdFx0TW9kdWxlLmdsb2JhbC5yZWxvYWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaCAoZSkgey8qIGRpc2NhcmQgbm9uIEpTT04gZGF0YSBmb3Igbm93ICovfVxuXHRcdH0pO1xuXG5cdFx0Y2xpZW50Lm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdbTGl2ZVZpZXddJywgJ0Rpc2Nvbm5lY3RlZCBmcm9tIEV2ZW50IFNlcnZlcicpO1xuXHRcdFx0cmV0cnlJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tMaXZlVmlld10nLCAnQXR0ZW1wdGluZyByZWNvbm5lY3QgdG8gRXZlbnQgU2VydmVyJyk7XG5cdFx0XHRcdGNsaWVudC5jb25uZWN0KCk7XG5cdFx0XHR9LCAyMDAwKTtcblx0XHR9KTtcblxuXHRcdGNsaWVudC5vbignZXJyb3InLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dmFyIGVyciA9IGUuZXJyb3I7XG5cdFx0XHR2YXIgY29kZSA9IH5+ZS5jb2RlO1xuXHRcdFx0aWYgKGNvZGUgPT09IDYxKSB7XG5cdFx0XHRcdGVyciA9ICdFdmVudCBTZXJ2ZXIgdW5hdmFpbGFibGUuIENvbm5lY3Rpb24gUmVmdXNlZCBAICcgKyBNb2R1bGUuX3VybCArICc6JyArIE1vZHVsZS5fcG9ydCArICdcXG5bTGl2ZVZpZXddIFBsZWFzZSBlbnN1cmUgeW91ciBkZXZpY2UgYW5kIGNvbXB1dGVyIGFyZSBvbiB0aGUgc2FtZSBuZXR3b3JrIGFuZCB0aGUgcG9ydCBpcyBub3QgYmxvY2tlZC4nO1xuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdbTGl2ZVZpZXddICcgKyBlcnIpO1xuXHRcdH0pO1xuXG5cdFx0Y2xpZW50LmNvbm5lY3QoKTtcblx0XHRNb2R1bGUucmVxdWlyZSgnYXBwJyk7XG5cdH07XG5cblx0LyoqXG4gICogaW5jbHVkZSBzY3JpcHQgbG9hZGVyXG4gICogQHBhcmFtICB7c3RyaW5nfSBjdHggY29udGV4dFxuICAqIEBwYXJhbSAge3N0cmluZ30gaWQgbW9kdWxlIGlkZW50aWZpZXJcbiAgKiBAcHVibGljXG4gICovXG5cdE1vZHVsZS5pbmNsdWRlID0gZnVuY3Rpb24gKGN0eCwgaWQpIHtcblx0XHR2YXIgZmlsZSA9IGlkLnJlcGxhY2UoJy5qcycsICcnKSxcblx0XHQgICAgc3JjID0gTW9kdWxlLnByb3RvdHlwZS5fZ2V0UmVtb3RlU291cmNlKGZpbGUsIDEwMDAwKTtcblx0XHRldmFsLmNhbGwoY3R4LCBzcmMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcblx0fTtcblxuXHQvKipcbiAgKiBjb252ZXJ0IHJlbGF0aXZlIHRvIGFic29sdXRlIHBhdGhcbiAgKiBAcGFyYW0gIHtzdHJpbmd9IHBhcmVudCBwYXJlbnQgZmlsZSBwYXRoXG4gICogQHBhcmFtICB7c3RyaW5nfSByZWxhdGl2ZSByZWxhdGl2ZSBwYXRoIGluIHJlcXVpcmVcbiAgKiBAcmV0dXJuIHtzdHJpbmd9IGFic29sdXRlIHBhdGggb2YgdGhlIHJlcXVpcmVkIGZpbGVcbiAgKiBAcHVibGljXG4gICovXG5cdE1vZHVsZS50b0Fic29sdXRlID0gZnVuY3Rpb24gKHBhcmVudCwgcmVsYXRpdmUpIHtcblx0XHR2YXIgbmV3UGF0aCA9IHBhcmVudC5zcGxpdCgnLycpLFxuXHRcdCAgICBwYXJ0cyA9IHJlbGF0aXZlLnNwbGl0KCcvJyk7XG5cblx0XHRuZXdQYXRoLnBvcCgpO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHBhcnRzW2ldID09PSAnLicpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwYXJ0c1tpXSA9PT0gJy4uJykge1xuXHRcdFx0XHRuZXdQYXRoLnBvcCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bmV3UGF0aC5wdXNoKHBhcnRzW2ldKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG5ld1BhdGguam9pbignLycpO1xuXHR9O1xuXG5cdC8qKlxuICAqIGNvbW1vbmpzIG1vZHVsZSBsb2FkZXJcbiAgKiBAcGFyYW0gIHtzdHJpbmd9IGlkIG1vZHVsZSBpZGVudGlmaWVyXG4gICogQHJldHVybnMge09iamVjdH1cbiAgKiBAcHVibGljXG4gICovXG5cdE1vZHVsZS5yZXF1aXJlID0gZnVuY3Rpb24gKGlkKSB7XG5cdFx0dmFyIGZ1bGxQYXRoID0gaWQ7XG5cblx0XHRpZiAoZnVsbFBhdGguaW5kZXhPZignLi8nKSA9PT0gMCB8fCBmdWxsUGF0aC5pbmRleE9mKCcuLi8nKSA9PT0gMCkge1xuXHRcdFx0dmFyIHBhcmVudCA9IE1vZHVsZS5fY29tcGlsZUxpc3RbTW9kdWxlLl9jb21waWxlTGlzdC5sZW5ndGggLSAxXTtcblx0XHRcdGZ1bGxQYXRoID0gTW9kdWxlLnRvQWJzb2x1dGUocGFyZW50LCBmdWxsUGF0aCk7XG5cdFx0fVxuXG5cdFx0dmFyIGNhY2hlZCA9IE1vZHVsZS5nZXRDYWNoZWQoZnVsbFBhdGgpIHx8IE1vZHVsZS5nZXRDYWNoZWQoZnVsbFBhdGgucmVwbGFjZSgnL2luZGV4JywgJycpKSB8fCBNb2R1bGUuZ2V0Q2FjaGVkKGZ1bGxQYXRoICsgJy9pbmRleCcpO1xuXG5cdFx0aWYgKGNhY2hlZCkge1xuXHRcdFx0cmV0dXJuIGNhY2hlZC5leHBvcnRzO1xuXHRcdH1cblxuXHRcdGlmICghTW9kdWxlLmV4aXN0cyhmdWxsUGF0aCkpIHtcblx0XHRcdGlmIChmdWxsUGF0aC5pbmRleE9mKCcvJykgPT09IDAgJiYgTW9kdWxlLmV4aXN0cyhmdWxsUGF0aCArICcvaW5kZXgnKSkge1xuXHRcdFx0XHRmdWxsUGF0aCArPSAnL2luZGV4Jztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBobERpciA9ICcvaHlwZXJsb29wLyc7XG5cdFx0XHRcdGlmIChmdWxsUGF0aC5pbmRleE9mKCcuKicpICE9PSAtMSkge1xuXHRcdFx0XHRcdGZ1bGxQYXRoID0gaWQuc2xpY2UoMCwgaWQubGVuZ3RoIC0gMik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgbW9kTG93ZXJDYXNlID0gZnVsbFBhdGgudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0aWYgKE1vZHVsZS5leGlzdHMoaGxEaXIgKyBmdWxsUGF0aCkpIHtcblx0XHRcdFx0XHRmdWxsUGF0aCA9IGhsRGlyICsgZnVsbFBhdGg7XG5cdFx0XHRcdH0gZWxzZSBpZiAoTW9kdWxlLmV4aXN0cyhobERpciArIG1vZExvd2VyQ2FzZSkpIHtcblx0XHRcdFx0XHRmdWxsUGF0aCA9IGhsRGlyICsgbW9kTG93ZXJDYXNlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZ1bGxQYXRoLmluZGV4T2YoJy4nKSA9PT0gLTEgJiYgTW9kdWxlLmV4aXN0cyhobERpciArIGZ1bGxQYXRoICsgJy8nICsgZnVsbFBhdGgpKSB7XG5cdFx0XHRcdFx0ZnVsbFBhdGggPSBobERpciArIGZ1bGxQYXRoICsgJy8nICsgZnVsbFBhdGg7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnVsbFBhdGguaW5kZXhPZignLicpID09PSAtMSAmJiBNb2R1bGUuZXhpc3RzKGhsRGlyICsgbW9kTG93ZXJDYXNlICsgJy8nICsgbW9kTG93ZXJDYXNlKSkge1xuXHRcdFx0XHRcdGZ1bGxQYXRoID0gaGxEaXIgKyBtb2RMb3dlckNhc2UgKyAnLycgKyBtb2RMb3dlckNhc2U7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIGxhc3RJbmRleCA9IGZ1bGxQYXRoLmxhc3RJbmRleE9mKCcuJyk7XG5cdFx0XHRcdFx0dmFyIHRlbXBQYXRoID0gaGxEaXIgKyBmdWxsUGF0aC5zbGljZSgwLCBsYXN0SW5kZXgpICsgJyQnICsgZnVsbFBhdGguc2xpY2UobGFzdEluZGV4ICsgMSk7XG5cdFx0XHRcdFx0aWYgKE1vZHVsZS5leGlzdHMoZnVsbFBhdGgpKSB7XG5cdFx0XHRcdFx0XHRmdWxsUGF0aCA9IHRlbXBQYXRoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBmcmVzaE1vZHVsZSA9IG5ldyBNb2R1bGUoZnVsbFBhdGgpO1xuXG5cdFx0ZnJlc2hNb2R1bGUuY2FjaGUoKTtcblx0XHRmcmVzaE1vZHVsZS5fY29tcGlsZSgpO1xuXG5cdFx0d2hpbGUgKCFmcmVzaE1vZHVsZS5sb2FkZWQpIHsvKiBuby1vcCAqL31cblxuXHRcdHJldHVybiBmcmVzaE1vZHVsZS5leHBvcnRzO1xuXHR9O1xuXG5cdC8qKlxuICAqIFtnZXRDYWNoZWQgZGVzY3JpcHRpb25dXG4gICogQHBhcmFtICB7c3RyaW5nfSBpZCBtb2R1ZWwgaWRlbnRpZmllclxuICAqIEByZXR1cm4ge01vZHVsZX0gY2FjaGVkIG1vZHVsZVxuICAqXG4gICogQHB1YmxpY1xuICAqL1xuXHRNb2R1bGUuZ2V0Q2FjaGVkID0gZnVuY3Rpb24gKGlkKSB7XG5cdFx0cmV0dXJuIE1vZHVsZS5fY2FjaGVbaWRdO1xuXHR9O1xuXG5cdC8qKlxuICAqIGNoZWNrIGlmIG1vZHVsZSBmaWxlIGV4aXN0c1xuICAqXG4gICogQHBhcmFtICB7c3RyaW5nfSBpZCBtb2R1bGUgaWRlbnRpZmllclxuICAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgdGhlIG1vZHVsZSBleGlzdHNcbiAgKiBAcHVibGljXG4gICovXG5cdE1vZHVsZS5leGlzdHMgPSBmdW5jdGlvbiAoaWQpIHtcblx0XHR2YXIgcGF0aCA9IFRpLkZpbGVzeXN0ZW0ucmVzb3VyY2VzRGlyZWN0b3J5ICsgaWQgKyAnLmpzJyxcblx0XHQgICAgZmlsZSA9IFRpLkZpbGVzeXN0ZW0uZ2V0RmlsZShwYXRoKTtcblxuXHRcdGlmIChmaWxlLmV4aXN0cygpKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLnBsYXRmb3JtKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dmFyIHBGb2xkZXJQYXRoID0gVGkuRmlsZXN5c3RlbS5yZXNvdXJjZXNEaXJlY3RvcnkgKyAnLycgKyB0aGlzLnBsYXRmb3JtICsgJy8nICsgaWQgKyAnLmpzJztcblx0XHR2YXIgcEZpbGUgPSBUaS5GaWxlc3lzdGVtLmdldEZpbGUocEZvbGRlclBhdGgpO1xuXHRcdHJldHVybiBwRmlsZS5leGlzdHMoKTtcblx0fTtcblxuXHQvKipcbiAgKiBzaGFkeSB4aHJTeW5jIHJlcXVlc3RcbiAgKlxuICAqIEBwYXJhbSAge3N0cmluZ30gZmlsZSBmaWxlIHRvIGxvYWRcbiAgKiBAcGFyYW0gIHtudW1iZXJ9IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzXG4gICogQHJldHVybiB7KHN0cmluZ3xib29sZWFuKX0gZmlsZSBjb250ZW50cyBpZiBzdWNjZXNzZnVsLCBmYWxzZSBpZiBub3RcbiAgKiBAcHJpdmF0ZVxuICAqL1xuXHRNb2R1bGUucHJvdG90eXBlLl9nZXRSZW1vdGVTb3VyY2UgPSBmdW5jdGlvbiAoZmlsZSwgdGltZW91dCkge1xuXHRcdHZhciBleHBpcmVUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyB0aW1lb3V0O1xuXHRcdHZhciByZXF1ZXN0ID0gVGkuTmV0d29yay5jcmVhdGVIVFRQQ2xpZW50KCk7XG5cdFx0dmFyIHJzcCA9IG51bGw7XG5cdFx0dmFyIGRvbmUgPSBmYWxzZTtcblx0XHR2YXIgdXJsID0gJ2h0dHA6Ly8nICsgTW9kdWxlLl91cmwgKyAnOicgKyBNb2R1bGUuX3BvcnQgKyAnLycgKyAoZmlsZSB8fCB0aGlzLmlkKSArICcuanMnO1xuXHRcdHJlcXVlc3QuY2FjaGUgPSBmYWxzZTtcblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCk7XG5cdFx0cmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKCd4LXBsYXRmb3JtJywgdGhpcy5wbGF0Zm9ybSk7XG5cdFx0cmVxdWVzdC5zZW5kKCk7XG5cblx0XHQvL1xuXHRcdC8vIFdpbmRvd3Mgb25seSBwcml2YXRlIEFQSTogX3dhaXRGb3JSZXNwb25zZSgpIHdhaXRzIGZvciB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuXHRcdC8vXG5cdFx0aWYgKHRoaXMucGxhdGZvcm0gPT09ICd3aW5kb3dzJyAmJiByZXF1ZXN0Ll93YWl0Rm9yUmVzcG9uc2UpIHtcblx0XHRcdHJlcXVlc3QuX3dhaXRGb3JSZXNwb25zZSgpO1xuXHRcdFx0aWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gNCB8fCByZXF1ZXN0LnN0YXR1cyA9PT0gNDA0KSB7XG5cdFx0XHRcdHJzcCA9IHJlcXVlc3Quc3RhdHVzID09PSAyMDAgPyByZXF1ZXN0LnJlc3BvbnNlVGV4dCA6IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdbTGl2ZVZpZXddIEZpbGUgU2VydmVyIHVuYXZhaWxhYmxlLiBIb3N0IFVucmVhY2hhYmxlIEAgJyArIE1vZHVsZS5fdXJsICsgJzonICsgTW9kdWxlLl9wb3J0ICsgJ1xcbltMaXZlVmlld10gUGxlYXNlIGVuc3VyZSB5b3VyIGRldmljZSBhbmQgY29tcHV0ZXIgYXJlIG9uIHRoZSBzYW1lIG5ldHdvcmsgYW5kIHRoZSBwb3J0IGlzIG5vdCBibG9ja2VkLicpO1xuXHRcdFx0fVxuXHRcdFx0ZG9uZSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0d2hpbGUgKCFkb25lKSB7XG5cdFx0XHRpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09PSA0IHx8IHJlcXVlc3Quc3RhdHVzID09PSA0MDQpIHtcblx0XHRcdFx0cnNwID0gcmVxdWVzdC5zdGF0dXMgPT09IDIwMCA/IHJlcXVlc3QucmVzcG9uc2VUZXh0IDogZmFsc2U7XG5cdFx0XHRcdGRvbmUgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIGlmIChleHBpcmVUaW1lIC0gbmV3IERhdGUoKS5nZXRUaW1lKCkgPD0gMCkge1xuXHRcdFx0XHRyc3AgPSBmYWxzZTtcblx0XHRcdFx0ZG9uZSA9IHRydWU7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignW0xpdmVWaWV3XSBGaWxlIFNlcnZlciB1bmF2YWlsYWJsZS4gSG9zdCBVbnJlYWNoYWJsZSBAICcgKyBNb2R1bGUuX3VybCArICc6JyArIE1vZHVsZS5fcG9ydCArICdcXG5bTGl2ZVZpZXddIFBsZWFzZSBlbnN1cmUgeW91ciBkZXZpY2UgYW5kIGNvbXB1dGVyIGFyZSBvbiB0aGUgc2FtZSBuZXR3b3JrIGFuZCB0aGUgcG9ydCBpcyBub3QgYmxvY2tlZC4nKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcnNwO1xuXHR9O1xuXG5cdC8qKlxuICAqIGdldCBtb2R1bGUgZmlsZSBzb3VyY2UgdGV4dFxuICAqIEByZXR1cm4ge3N0cmluZ31cbiAgKiBAcHJpdmF0ZVxuICAqL1xuXHRNb2R1bGUucHJvdG90eXBlLl9nZXRTb3VyY2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGlkID0gdGhpcy5pZDtcblx0XHR2YXIgaXNSZW1vdGUgPSAvXihodHRwfGh0dHBzKSQvLnRlc3QoaWQpIHx8IGdsb2JhbC5FTlYgPT09ICdsaXZldmlldyc7XG5cdFx0aWYgKGlzUmVtb3RlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZ2V0UmVtb3RlU291cmNlKG51bGwsIDEwMDAwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGlkID09PSAnYXBwJykge1xuXHRcdFx0XHRpZCA9ICdfYXBwJztcblx0XHRcdH1cblx0XHRcdHZhciBmaWxlID0gVGkuRmlsZXN5c3RlbS5nZXRGaWxlKFRpLkZpbGVzeXN0ZW0ucmVzb3VyY2VzRGlyZWN0b3J5LCBpZCArICcuanMnKTtcblx0XHRcdHJldHVybiAoZmlsZS5yZWFkKCkgfHwge30pLnRleHQ7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuICAqIHdyYXAgbW9kdWxlIHNvdXJjZSB0ZXh0IGluIGNvbW1vbmpzIGFub24gZnVuY3Rpb24gd3JhcHBlclxuICAqXG4gICogQHBhcmFtICB7c3RyaW5nfSBzb3VyY2UgVGhlIHJhdyBzb3VyY2Ugd2UncmUgd3JhcHBpbmcgaW4gYW4gSUlGRVxuICAqIEByZXR1cm4ge3N0cmluZ31cbiAgKiBAcHJpdmF0ZVxuICAqL1xuXHRNb2R1bGUuX3dyYXAgPSBmdW5jdGlvbiAoc291cmNlKSB7XG5cdFx0c291cmNlID0gc291cmNlLnJlcGxhY2UoL1RbaXx8aXRhbml1bV0rLmluY2x1ZGVcXChbJ3xcIl0oW15cIidcXHJcXG4kXSopWyd8XCJdXFwpL2csIGZ1bmN0aW9uIChleHAsIHZhbCkge1xuXHRcdFx0dmFyIGZpbGUgPSAoJycgKyB2YWwpLnJlcGxhY2UoJy5qcycsICcnKTtcblx0XHRcdHZhciBfc3JjID0gTW9kdWxlLnByb3RvdHlwZS5fZ2V0UmVtb3RlU291cmNlKGZpbGUsIDEwMDAwKTtcblx0XHRcdHZhciBldmFsU3JjID0gJ3RyeSB7XFxuJyArIF9zcmMgKyAnXFxufSBjYXRjaCAoZXJyKSB7XFxuJyArICdsdkdsb2JhbC5wcm9jZXNzLmVtaXQoXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCB7bW9kdWxlOiBcIicgKyB2YWwgKyAnXCIsIGVycm9yOiBlcnJ9KTsnICsgJ1xcbn0nO1xuXHRcdFx0cmV0dXJuIGV2YWxTcmM7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGdsb2JhbC5DQVRDSF9FUlJPUlMgPyBNb2R1bGUuX2VycldyYXBwZXJbMF0gKyBzb3VyY2UgKyBNb2R1bGUuX2VycldyYXBwZXJbMV0gOiBzb3VyY2U7XG5cdH07XG5cblx0Ly8gdW5jYXVnaHQgZXhjZXB0aW9uIGhhbmRsZXIgd3JhcHBlclxuXHRNb2R1bGUuX2VycldyYXBwZXIgPSBbJ3RyeSB7XFxuJywgJ1xcbn0gY2F0Y2ggKGVycikge1xcbmx2R2xvYmFsLnByb2Nlc3MuZW1pdChcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIHttb2R1bGU6IF9fZmlsZW5hbWUsIGVycm9yOiBlcnIsIHNvdXJjZTogbW9kdWxlLnNvdXJjZX0pO1xcbn0nXTtcblxuXHQvKipcbiAgKiBjb21waWxlIGNvbW1vbmpzIG1vZHVsZSBhbmQgc3RyaW5nIHRvIGpzXG4gICpcbiAgKiBAcHJpdmF0ZVxuICAqL1xuXHRNb2R1bGUucHJvdG90eXBlLl9jb21waWxlID0gZnVuY3Rpb24gKCkge1xuXHRcdHZhciBzcmMgPSB0aGlzLl9nZXRTb3VyY2UoKTtcblx0XHRpZiAoIXNyYykge1xuXHRcdFx0dGhpcy5leHBvcnRzID0gTW9kdWxlLl9yZXF1aXJlTmF0aXZlKHRoaXMuaWQpO1xuXHRcdFx0dGhpcy5sb2FkZWQgPSB0cnVlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRNb2R1bGUuX2NvbXBpbGVMaXN0LnB1c2godGhpcy5pZCk7XG5cdFx0dGhpcy5zb3VyY2UgPSBNb2R1bGUuX3dyYXAoc3JjKTtcblx0XHR0cnkge1xuXHRcdFx0dmFyIGZuID0gbmV3IEZ1bmN0aW9uKCdleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUsIF9fZmlsZW5hbWUsIF9fZGlybmFtZSwgbHZHbG9iYWwsIEwnLCB0aGlzLnNvdXJjZSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LWZ1bmNcblx0XHRcdGZuKHRoaXMuZXhwb3J0cywgTW9kdWxlLnJlcXVpcmUsIHRoaXMsIHRoaXMuZmlsZW5hbWUsIHRoaXMuX19kaXJuYW1lLCBnbG9iYWwsIEwpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0cHJvY2Vzcy5lbWl0KCd1bmNhdWdodEV4Y2VwdGlvbicsIHsgbW9kdWxlOiB0aGlzLmlkLCBlcnJvcjogZXJyLCBzb3VyY2U6ICgnJyArIHRoaXMuc291cmNlKS5zcGxpdCgnXFxuJykgfSk7XG5cdFx0fVxuXG5cdFx0TW9kdWxlLl9jb21waWxlTGlzdC5wb3AoKTtcblx0XHR0aGlzLmxvYWRlZCA9IHRydWU7XG5cdH07XG5cblx0LyoqXG4gICogY2FjaGUgY3VycmVudCBtb2R1bGVcbiAgKlxuICAqIEBwdWJsaWNcbiAgKi9cblx0TW9kdWxlLnByb3RvdHlwZS5jYWNoZSA9IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLnRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdE1vZHVsZS5fY2FjaGVbdGhpcy5pZF0gPSB0aGlzO1xuXHR9O1xuXG5cdC8qKlxuICAqIFsgZGVzY3JpcHRpb25dXG4gICogQHBhcmFtICB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICovXG5cblx0cHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbiAoZXJyKSB7XG5cdFx0Y29uc29sZS5sb2coJ1tMaXZlVmlld10gRXJyb3IgRXZhbHVhdGluZycsIGVyci5tb2R1bGUsICdAIExpbmU6JywgZXJyLmVycm9yLmxpbmUpO1xuXHRcdC8vIGNvbnNvbGUuZXJyb3IoJ0xpbmUgJyArIGVyci5lcnJvci5saW5lLCAnOicsIGVyci5zb3VyY2VbZXJyLmVycm9yLmxpbmVdKTtcblx0XHRjb25zb2xlLmVycm9yKCcnICsgZXJyLmVycm9yKTtcblx0XHRjb25zb2xlLmVycm9yKCdGaWxlOicsIGVyci5tb2R1bGUpO1xuXHRcdGNvbnNvbGUuZXJyb3IoJ0xpbmU6JywgZXJyLmVycm9yLmxpbmUpO1xuXHRcdGNvbnNvbGUuZXJyb3IoJ1NvdXJjZUlkOicsIGVyci5lcnJvci5zb3VyY2VJZCk7XG5cdFx0Y29uc29sZS5lcnJvcignQmFja3RyYWNlOlxcbicsICgnJyArIGVyci5lcnJvci5iYWNrdHJhY2UpLnJlcGxhY2UoLydcXG4nL2csICdcXG4nKSk7XG5cdH0pO1xuXG5cdE1vZHVsZS5wYXRjaChnbG9iYWxTY29wZSwgJzE5Mi4xNjguMC4xNScsICc4MzI0Jyk7XG5cblx0Ly8gUHJldmVudCBkaXNwbGF5IGZyb20gc2xlZXBpbmdcblxuXHRUaXRhbml1bS5BcHAuaWRsZVRpbWVyRGlzYWJsZWQgPSB0cnVlO1xufSkodGhpcyk7XG4iXSwic291cmNlUm9vdCI6Ii92YXIvZm9sZGVycy9jMy84Y3ByN3g3ZDVxNV8zMWxiNjk4NnQ4dncwMDAwZ24vVCJ9

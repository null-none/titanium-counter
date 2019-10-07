//     Backbone.js 0.9.2

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function () {

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `global`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to slice/splice.
  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && typeof require !== 'undefined') _ = require('/alloy/underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  var $ = root.jQuery || root.Zepto || root.ender;

  // Set the JavaScript library that will be used for DOM manipulation and
  // Ajax calls (a.k.a. the `$` variable). By default Backbone will use: jQuery,
  // Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
  // alternate JavaScript library (or a mock library for testing your views
  // outside of a browser).
  Backbone.setDomLibrary = function (lib) {
    $ = lib;
  };

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function () {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function on(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = { tail: tail, next: list ? list.next : node };
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function off(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if (callback && cb !== callback || context && ctx !== context) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function trigger(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    } };



  // Aliases for backwards compatibility.
  Events.bind = Events.on;
  Events.unbind = Events.off;

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function (attributes, options) {
    var defaults;
    attributes || (attributes = {});
    if (options && options.parse) attributes = this.parse(attributes);
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    if (options && options.collection) this.collection = options.collection;
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, { silent: true });
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function initialize() {},

    // Return a copy of the model's `attributes` object.
    toJSON: function toJSON(options) {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function get(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function escape(attr) {
      var html;
      if (html = this._escapedAttributes[attr]) return html;
      var val = this.get(attr);
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function has(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function set(key, value, options) {
      var attrs, attr, val;

      // Handle both
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      // Extract attributes and options.
      options || (options = {});
      if (!attrs) return this;
      if (attrs instanceof Model) attrs = attrs.attributes;
      if (options.unset) for (attr in attrs) {attrs[attr] = void 0;}

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var changes = options.changes = {};
      var now = this.attributes;
      var escaped = this._escapedAttributes;
      var prev = this._previousAttributes || {};

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(now[attr], val) || options.unset && _.has(now, attr)) {
          delete escaped[attr];
          (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete now[attr] : now[attr] = val;

        // If the new and previous value differ, record the change.  If not,
        // then remove changes for this attribute.
        if (!_.isEqual(prev[attr], val) || _.has(now, attr) != _.has(prev, attr)) {
          this.changed[attr] = val;
          if (!options.silent) this._pending[attr] = true;
        } else {
          delete this.changed[attr];
          delete this._pending[attr];
        }
      }

      // Fire the `"change"` events.
      if (!options.silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function unset(attr, options) {
      (options || (options = {})).unset = true;
      return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function clear(options) {
      (options || (options = {})).unset = true;
      return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function fetch(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      options.success = function (resp, status, xhr) {
        if (!model.set(model.parse(resp, xhr), options)) return false;
        if (success) success(model, resp);
      };
      options.error = Backbone.wrapError(options.error, model, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function save(key, value, options) {
      var attrs, current;

      // Handle both `("key", value)` and `({key: value})` -style calls.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (!this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, { silent: true });
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function (resp, status, xhr) {
        var serverAttrs = model.parse(resp, xhr);
        if (options.wait) {
          delete options.wait;
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (!model.set(serverAttrs, options)) return false;
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      // Finish configuring and sending the Ajax request.
      options.error = Backbone.wrapError(options.error, model, options);
      var method = this.isNew() ? 'create' : 'update';
      var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
      if (options.wait) this.set(current, silentOptions);
      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function destroy(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var triggerDestroy = function triggerDestroy() {
        model.trigger('destroy', model, model.collection, options);
      };

      if (this.isNew()) {
        triggerDestroy();
        return false;
      }

      options.success = function (resp) {
        if (options.wait) triggerDestroy();
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      options.error = Backbone.wrapError(options.error, model, options);
      var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
      if (!options.wait) triggerDestroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function url() {
      var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function parse(resp, xhr) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function clone() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function isNew() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function change(options) {
      options || (options = {});
      var changing = this._changing;
      this._changing = true;

      // Silent changes become pending changes.
      for (var attr in this._silent) {this._pending[attr] = true;}

      // Silent changes are triggered.
      var changes = _.extend({}, options.changes, this._silent);
      this._silent = {};
      for (var attr in changes) {
        this.trigger('change:' + attr, this, this.get(attr), options);
      }
      if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
      while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.trigger('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
          if (this._pending[attr] || this._silent[attr]) continue;
          delete this.changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function hasChanged(attr) {
      if (!arguments.length) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function changedAttributes(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val,changed = false,old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], val = diff[attr])) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function previous(attr) {
      if (!arguments.length || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function previousAttributes() {
      return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function isValid() {
      return !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function _validate(attrs, options) {
      if (options.silent || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) {
        options.error(this, error, options);
      } else {
        this.trigger('error', this, error, options);
      }
      return false;
    } });



  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function (models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, { silent: true, parse: options.parse });
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function initialize() {},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function toJSON(options) {
      return this.map(function (model) {return model.toJSON(options);});
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function add(models, options) {
      var i,index,length,model,cid,id,cids = {},ids = {},dups = [];
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];

      // Begin by turning bare objects into model references, and preventing
      // invalid models or duplicate models from being added.
      for (i = 0, length = models.length; i < length; i++) {
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }
        cid = model.cid;
        id = model.id;
        if (cids[cid] || this._byCid[cid] || id != null && (ids[id] || this._byId[id])) {
          dups.push(i);
          continue;
        }
        cids[cid] = ids[id] = model;
      }

      // Remove duplicates.
      i = dups.length;
      while (i--) {
        models.splice(dups[i], 1);
      }

      // Listen to added models' events, and index models for lookup by
      // `id` and by `cid`.
      for (i = 0, length = models.length; i < length; i++) {
        (model = models[i]).on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // Insert models into the collection, re-sorting if needed, and triggering
      // `add` events unless silenced.
      this.length += length;
      index = options.at != null ? options.at : this.models.length;
      splice.apply(this.models, [index, 0].concat(models));
      if (this.comparator) this.sort({ silent: true });
      if (options.silent) return this;
      for (i = 0, length = this.models.length; i < length; i++) {
        if (!cids[(model = this.models[i]).cid]) continue;
        options.index = i;
        model.trigger('add', model, this, options);
      }
      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function remove(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.getByCid(models[i]) || this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function push(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, options);
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function pop(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function unshift(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({ at: 0 }, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function shift(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Get a model from the set by id.
    get: function get(id) {
      if (id == null) return void 0;
      return this._byId[id.id != null ? id.id : id];
    },

    // Get a model from the set by client id.
    getByCid: function getByCid(cid) {
      return cid && this._byCid[cid.cid || cid];
    },

    // Get the model at the given index.
    at: function at(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function where(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function (model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function sort(options) {
      options || (options = {});
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(this.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function pluck(attr) {
      return _.map(this.models, function (model) {return model.get(attr);});
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function reset(models, options) {
      models || (models = []);
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      this._reset();
      this.add(models, _.extend({ silent: true }, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function fetch(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function (resp, status, xhr) {
        collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function create(model, options) {
      var coll = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) coll.add(model, options);
      var success = options.success;
      options.success = function (nextModel, resp, xhr) {
        if (options.wait) coll.add(nextModel, options);
        if (success) {
          success(nextModel, resp);
        } else {
          nextModel.trigger('sync', model, resp, options);
        }
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function parse(resp, xhr) {
      return resp;
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function chain() {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function _reset(options) {
      this.length = 0;
      this.models = [];
      this._byId = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function _prepareModel(model, options) {
      options || (options = {});
      if (!(model instanceof Model)) {
        var attrs = model;
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(model.attributes, options)) model = false;
      } else if (!model.collection) {
        model.collection = this;
      }
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function _removeReference(model) {
      if (this == model.collection) {
        delete model.collection;
      }
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function _onModelEvent(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    } });



  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
  'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
  'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
  'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
  'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function (method) {
    Collection.prototype[method] = function () {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Backbone.Router
  // -------------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function (options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var namedParam = /:\w+/g;
  var splatParam = /\*\w+/g;
  var escapeRegExp = /[-[\]{}()+?.,\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function initialize() {},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function route(_route, name, callback) {
      Backbone.history || (Backbone.history = new History());
      if (!_.isRegExp(_route)) _route = this._routeToRegExp(_route);
      if (!callback) callback = this[name];
      Backbone.history.route(_route, _.bind(function (fragment) {
        var args = this._extractParameters(_route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function navigate(fragment, options) {
      Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function _bindRoutes() {
      if (!this.routes) return;
      var routes = [];
      for (var route in this.routes) {
        routes.unshift([route, this.routes[route]]);
      }
      for (var i = 0, l = routes.length; i < l; i++) {
        this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function _routeToRegExp(route) {
      route = route.replace(escapeRegExp, '\\$&').
      replace(namedParam, '([^\/]+)').
      replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function _extractParameters(route, fragment) {
      return route.exec(fragment).slice(1);
    } });



  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function () {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning leading hashes and slashes .
  var routeStripper = /^[#\/]/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function getHash(windowOverride) {
      var loc = windowOverride ? windowOverride.location : window.location;
      var match = loc.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function getFragment(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = this.getHash();
        }
      }
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function start(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options = _.extend({}, { root: '/' }, this.options, options);
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState = !!this.options.pushState;
      this._hasPushState = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment = this.getFragment();
      var docMode = document.documentMode;
      var oldIE = isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7);

      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && 'onhashchange' in window && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = window.location;
      var atRoot = loc.pathname == this.options.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function stop() {
      $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function route(_route2, callback) {
      this.handlers.unshift({ route: _route2, callback: callback });
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function checkUrl(e) {
      var current = this.getFragment();
      if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
      if (current == this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function loadUrl(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function (handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function navigate(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = { trigger: options };
      var frag = (fragment || '').replace(routeStripper, '');
      if (this.fragment == frag) return;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;
        window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

        // If hash changes haven't been explicitly disabled, update the hash
        // fragment to store history.
      } else if (this._wantsHashChange) {
        this.fragment = frag;
        this._updateHash(window.location, frag, options.replace);
        if (this.iframe && frag != this.getFragment(this.getHash(this.iframe))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
          // When replace is true, we don't want this.
          if (!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, frag, options.replace);
        }

        // If you've told us that you explicitly don't want fallback hashchange-
        // based history, then `navigate` becomes a page refresh.
      } else {
        window.location.assign(this.options.root + fragment);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function _updateHash(location, fragment, replace) {
      if (replace) {
        location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
      } else {
        location.hash = fragment;
      }
    } });


  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function (options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function $(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function initialize() {},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function render() {
      return this;
    },

    // Remove this view from the DOM. Note that the view isn't present in the
    // DOM by default, so calling this method may be a no-op.
    remove: function remove() {
      this.$el.remove();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function make(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function setElement(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof $ ? element : $(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function delegateEvents(events) {
      if (!(events || (events = getValue(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1],selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function undelegateEvents() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function _configure(options) {
      if (this.options) options = _.extend({}, this.options, options);
      for (var i = 0, l = viewOptions.length; i < l; i++) {
        var attr = viewOptions[i];
        if (options[attr]) this[attr] = options[attr];
      }
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function _ensureElement() {
      if (!this.el) {
        var attrs = getValue(this, 'attributes') || {};
        if (this.id) attrs.id = this.id;
        if (this.className) attrs['class'] = this.className;
        this.setElement(this.make(this.tagName, attrs), false);
      } else {
        this.setElement(this.el, false);
      }
    } });



  // The self-propagating extend function that Backbone classes use.
  var extend = function extend(protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  // Set up inheritance for the model, collection, and view.
  Model.extend = Collection.extend = Router.extend = View.extend = extend;

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read': 'GET' };


  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function (method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = { type: type, dataType: 'json' };

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? { model: params.data } : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function (xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return $.ajax(_.extend(params, options));
  };

  // Wrap an optional error callback with a fallback error event.
  Backbone.wrapError = function (onError, originalModel, options) {
    return function (model, resp) {
      resp = model === originalModel ? resp : model;
      if (onError) {
        onError(originalModel, resp, options);
      } else {
        originalModel.trigger('error', originalModel, resp, options);
      }
    };
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function ctor() {};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function inherits(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function child() {parent.apply(this, arguments);};
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function getValue(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function urlError() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(global);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJhY2tib25lLmpzIl0sIm5hbWVzIjpbInJvb3QiLCJwcmV2aW91c0JhY2tib25lIiwiQmFja2JvbmUiLCJzbGljZSIsIkFycmF5IiwicHJvdG90eXBlIiwic3BsaWNlIiwiZXhwb3J0cyIsIlZFUlNJT04iLCJfIiwicmVxdWlyZSIsIiQiLCJqUXVlcnkiLCJaZXB0byIsImVuZGVyIiwic2V0RG9tTGlicmFyeSIsImxpYiIsIm5vQ29uZmxpY3QiLCJlbXVsYXRlSFRUUCIsImVtdWxhdGVKU09OIiwiZXZlbnRTcGxpdHRlciIsIkV2ZW50cyIsIm9uIiwiZXZlbnRzIiwiY2FsbGJhY2siLCJjb250ZXh0IiwiY2FsbHMiLCJldmVudCIsIm5vZGUiLCJ0YWlsIiwibGlzdCIsInNwbGl0IiwiX2NhbGxiYWNrcyIsInNoaWZ0IiwibmV4dCIsIm9mZiIsImNiIiwiY3R4Iiwia2V5cyIsInRyaWdnZXIiLCJhcmdzIiwiYWxsIiwicmVzdCIsImNhbGwiLCJhcmd1bWVudHMiLCJhcHBseSIsImNvbmNhdCIsImJpbmQiLCJ1bmJpbmQiLCJNb2RlbCIsImF0dHJpYnV0ZXMiLCJvcHRpb25zIiwiZGVmYXVsdHMiLCJwYXJzZSIsImdldFZhbHVlIiwiZXh0ZW5kIiwiY29sbGVjdGlvbiIsIl9lc2NhcGVkQXR0cmlidXRlcyIsImNpZCIsInVuaXF1ZUlkIiwiY2hhbmdlZCIsIl9zaWxlbnQiLCJfcGVuZGluZyIsInNldCIsInNpbGVudCIsIl9wcmV2aW91c0F0dHJpYnV0ZXMiLCJjbG9uZSIsImluaXRpYWxpemUiLCJpZEF0dHJpYnV0ZSIsInRvSlNPTiIsImdldCIsImF0dHIiLCJlc2NhcGUiLCJodG1sIiwidmFsIiwiaGFzIiwia2V5IiwidmFsdWUiLCJhdHRycyIsImlzT2JqZWN0IiwidW5zZXQiLCJfdmFsaWRhdGUiLCJpZCIsImNoYW5nZXMiLCJub3ciLCJlc2NhcGVkIiwicHJldiIsImlzRXF1YWwiLCJjaGFuZ2UiLCJjbGVhciIsImZldGNoIiwibW9kZWwiLCJzdWNjZXNzIiwicmVzcCIsInN0YXR1cyIsInhociIsImVycm9yIiwid3JhcEVycm9yIiwic3luYyIsInNhdmUiLCJjdXJyZW50Iiwid2FpdCIsInNpbGVudE9wdGlvbnMiLCJzZXJ2ZXJBdHRycyIsIm1ldGhvZCIsImlzTmV3IiwiZGVzdHJveSIsInRyaWdnZXJEZXN0cm95IiwidXJsIiwiYmFzZSIsInVybEVycm9yIiwiY2hhckF0IiwibGVuZ3RoIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiY29uc3RydWN0b3IiLCJjaGFuZ2luZyIsIl9jaGFuZ2luZyIsImlzRW1wdHkiLCJoYXNDaGFuZ2VkIiwiY2hhbmdlZEF0dHJpYnV0ZXMiLCJkaWZmIiwib2xkIiwicHJldmlvdXMiLCJwcmV2aW91c0F0dHJpYnV0ZXMiLCJpc1ZhbGlkIiwidmFsaWRhdGUiLCJDb2xsZWN0aW9uIiwibW9kZWxzIiwiY29tcGFyYXRvciIsIl9yZXNldCIsInJlc2V0IiwibWFwIiwiYWRkIiwiaSIsImluZGV4IiwiY2lkcyIsImlkcyIsImR1cHMiLCJpc0FycmF5IiwiX3ByZXBhcmVNb2RlbCIsIkVycm9yIiwiX2J5Q2lkIiwiX2J5SWQiLCJwdXNoIiwiX29uTW9kZWxFdmVudCIsImF0Iiwic29ydCIsInJlbW92ZSIsImwiLCJnZXRCeUNpZCIsImluZGV4T2YiLCJfcmVtb3ZlUmVmZXJlbmNlIiwicG9wIiwidW5zaGlmdCIsIndoZXJlIiwiZmlsdGVyIiwiYm91bmRDb21wYXJhdG9yIiwic29ydEJ5IiwicGx1Y2siLCJ1bmRlZmluZWQiLCJjcmVhdGUiLCJjb2xsIiwibmV4dE1vZGVsIiwiY2hhaW4iLCJtZXRob2RzIiwiZWFjaCIsInRvQXJyYXkiLCJSb3V0ZXIiLCJyb3V0ZXMiLCJfYmluZFJvdXRlcyIsIm5hbWVkUGFyYW0iLCJzcGxhdFBhcmFtIiwiZXNjYXBlUmVnRXhwIiwicm91dGUiLCJuYW1lIiwiaGlzdG9yeSIsIkhpc3RvcnkiLCJpc1JlZ0V4cCIsIl9yb3V0ZVRvUmVnRXhwIiwiZnJhZ21lbnQiLCJfZXh0cmFjdFBhcmFtZXRlcnMiLCJuYXZpZ2F0ZSIsInJlcGxhY2UiLCJSZWdFeHAiLCJleGVjIiwiaGFuZGxlcnMiLCJiaW5kQWxsIiwicm91dGVTdHJpcHBlciIsImlzRXhwbG9yZXIiLCJzdGFydGVkIiwiaW50ZXJ2YWwiLCJnZXRIYXNoIiwid2luZG93T3ZlcnJpZGUiLCJsb2MiLCJsb2NhdGlvbiIsIndpbmRvdyIsIm1hdGNoIiwiaHJlZiIsImdldEZyYWdtZW50IiwiZm9yY2VQdXNoU3RhdGUiLCJfaGFzUHVzaFN0YXRlIiwicGF0aG5hbWUiLCJzZWFyY2giLCJzdWJzdHIiLCJzdGFydCIsIl93YW50c0hhc2hDaGFuZ2UiLCJoYXNoQ2hhbmdlIiwiX3dhbnRzUHVzaFN0YXRlIiwicHVzaFN0YXRlIiwiZG9jTW9kZSIsImRvY3VtZW50IiwiZG9jdW1lbnRNb2RlIiwib2xkSUUiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJ0b0xvd2VyQ2FzZSIsImlmcmFtZSIsImhpZGUiLCJhcHBlbmRUbyIsImNvbnRlbnRXaW5kb3ciLCJjaGVja1VybCIsIl9jaGVja1VybEludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJhdFJvb3QiLCJoYXNoIiwicmVwbGFjZVN0YXRlIiwidGl0bGUiLCJwcm90b2NvbCIsImhvc3QiLCJsb2FkVXJsIiwic3RvcCIsImNsZWFySW50ZXJ2YWwiLCJlIiwiZnJhZ21lbnRPdmVycmlkZSIsIm1hdGNoZWQiLCJhbnkiLCJoYW5kbGVyIiwidGVzdCIsImZyYWciLCJfdXBkYXRlSGFzaCIsIm9wZW4iLCJjbG9zZSIsImFzc2lnbiIsInRvU3RyaW5nIiwiVmlldyIsIl9jb25maWd1cmUiLCJfZW5zdXJlRWxlbWVudCIsImRlbGVnYXRlRXZlbnRzIiwiZGVsZWdhdGVFdmVudFNwbGl0dGVyIiwidmlld09wdGlvbnMiLCJ0YWdOYW1lIiwic2VsZWN0b3IiLCIkZWwiLCJmaW5kIiwicmVuZGVyIiwibWFrZSIsImNvbnRlbnQiLCJlbCIsImNyZWF0ZUVsZW1lbnQiLCJzZXRFbGVtZW50IiwiZWxlbWVudCIsImRlbGVnYXRlIiwidW5kZWxlZ2F0ZUV2ZW50cyIsImlzRnVuY3Rpb24iLCJldmVudE5hbWUiLCJjbGFzc05hbWUiLCJwcm90b1Byb3BzIiwiY2xhc3NQcm9wcyIsImNoaWxkIiwiaW5oZXJpdHMiLCJtZXRob2RNYXAiLCJ0eXBlIiwicGFyYW1zIiwiZGF0YVR5cGUiLCJkYXRhIiwiY29udGVudFR5cGUiLCJKU09OIiwic3RyaW5naWZ5IiwiX21ldGhvZCIsImJlZm9yZVNlbmQiLCJzZXRSZXF1ZXN0SGVhZGVyIiwicHJvY2Vzc0RhdGEiLCJhamF4Iiwib25FcnJvciIsIm9yaWdpbmFsTW9kZWwiLCJjdG9yIiwicGFyZW50Iiwic3RhdGljUHJvcHMiLCJoYXNPd25Qcm9wZXJ0eSIsIl9fc3VwZXJfXyIsIm9iamVjdCIsInByb3AiXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLENBQUMsWUFBVTs7QUFFWDtBQUNBOztBQUVBO0FBQ0E7QUFDQSxNQUFJQSxJQUFJLEdBQUcsSUFBWDs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsZ0JBQWdCLEdBQUdELElBQUksQ0FBQ0UsUUFBNUI7O0FBRUE7QUFDQSxNQUFJQyxLQUFLLEdBQUdDLEtBQUssQ0FBQ0MsU0FBTixDQUFnQkYsS0FBNUI7QUFDQSxNQUFJRyxNQUFNLEdBQUdGLEtBQUssQ0FBQ0MsU0FBTixDQUFnQkMsTUFBN0I7O0FBRUE7QUFDQTtBQUNBLE1BQUlKLFFBQUo7QUFDQSxNQUFJLE9BQU9LLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbkNMLElBQUFBLFFBQVEsR0FBR0ssT0FBWDtBQUNBLEdBRkQsTUFFTztBQUNOTCxJQUFBQSxRQUFRLEdBQUdGLElBQUksQ0FBQ0UsUUFBTCxHQUFnQixFQUEzQjtBQUNBOztBQUVEO0FBQ0FBLEVBQUFBLFFBQVEsQ0FBQ00sT0FBVCxHQUFtQixPQUFuQjs7QUFFQTtBQUNBLE1BQUlDLENBQUMsR0FBR1QsSUFBSSxDQUFDUyxDQUFiO0FBQ0EsTUFBSSxDQUFDQSxDQUFELElBQU8sT0FB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QUM4UCxVQUFGLENBQWEyQixNQUFNLENBQUNDLElBQUQsQ0FBbkIsSUFBNkJELE1BQU0sQ0FBQ0MsSUFBRCxDQUFOLEVBQTdCLEdBQThDRCxNQUFNLENBQUNDLElBQUQsQ0FBM0Q7QUFDQSxHQUhEOztBQUtBO0FBQ0EsTUFBSXJMLFFBQVEsR0FBRyxTQUFYQSxRQUFXLEdBQVc7QUFDekIsVUFBTSxJQUFJOEIsS0FBSixDQUFVLGdEQUFWLENBQU47QUFDQSxHQUZEOztBQUlDLENBLzRDRCxFQSs0Q0dqRyxJQS80Q0giLCJzb3VyY2VzQ29udGVudCI6WyIvLyAgICAgQmFja2JvbmUuanMgMC45LjJcblxuLy8gICAgIChjKSAyMDEwLTIwMTIgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIEluYy5cbi8vICAgICBCYWNrYm9uZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbi8vICAgICBGb3IgYWxsIGRldGFpbHMgYW5kIGRvY3VtZW50YXRpb246XG4vLyAgICAgaHR0cDovL2JhY2tib25lanMub3JnXG5cbihmdW5jdGlvbigpe1xuXG4vLyBJbml0aWFsIFNldHVwXG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIFNhdmUgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QgKGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBgZ2xvYmFsYFxuLy8gb24gdGhlIHNlcnZlcikuXG52YXIgcm9vdCA9IHRoaXM7XG5cbi8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgQmFja2JvbmVgIHZhcmlhYmxlLCBzbyB0aGF0IGl0IGNhbiBiZVxuLy8gcmVzdG9yZWQgbGF0ZXIgb24sIGlmIGBub0NvbmZsaWN0YCBpcyB1c2VkLlxudmFyIHByZXZpb3VzQmFja2JvbmUgPSByb290LkJhY2tib25lO1xuXG4vLyBDcmVhdGUgYSBsb2NhbCByZWZlcmVuY2UgdG8gc2xpY2Uvc3BsaWNlLlxudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIHNwbGljZSA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2U7XG5cbi8vIFRoZSB0b3AtbGV2ZWwgbmFtZXNwYWNlLiBBbGwgcHVibGljIEJhY2tib25lIGNsYXNzZXMgYW5kIG1vZHVsZXMgd2lsbFxuLy8gYmUgYXR0YWNoZWQgdG8gdGhpcy4gRXhwb3J0ZWQgZm9yIGJvdGggQ29tbW9uSlMgYW5kIHRoZSBicm93c2VyLlxudmFyIEJhY2tib25lO1xuaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuXHRCYWNrYm9uZSA9IGV4cG9ydHM7XG59IGVsc2Uge1xuXHRCYWNrYm9uZSA9IHJvb3QuQmFja2JvbmUgPSB7fTtcbn1cblxuLy8gQ3VycmVudCB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5LiBLZWVwIGluIHN5bmMgd2l0aCBgcGFja2FnZS5qc29uYC5cbkJhY2tib25lLlZFUlNJT04gPSAnMC45LjInO1xuXG4vLyBSZXF1aXJlIFVuZGVyc2NvcmUsIGlmIHdlJ3JlIG9uIHRoZSBzZXJ2ZXIsIGFuZCBpdCdzIG5vdCBhbHJlYWR5IHByZXNlbnQuXG52YXIgXyA9IHJvb3QuXztcbmlmICghXyAmJiAodHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnKSkgXyA9IHJlcXVpcmUoJy9hbGxveS91bmRlcnNjb3JlJyk7XG5cbi8vIEZvciBCYWNrYm9uZSdzIHB1cnBvc2VzLCBqUXVlcnksIFplcHRvLCBvciBFbmRlciBvd25zIHRoZSBgJGAgdmFyaWFibGUuXG52YXIgJCA9IHJvb3QualF1ZXJ5IHx8IHJvb3QuWmVwdG8gfHwgcm9vdC5lbmRlcjtcblxuLy8gU2V0IHRoZSBKYXZhU2NyaXB0IGxpYnJhcnkgdGhhdCB3aWxsIGJlIHVzZWQgZm9yIERPTSBtYW5pcHVsYXRpb24gYW5kXG4vLyBBamF4IGNhbGxzIChhLmsuYS4gdGhlIGAkYCB2YXJpYWJsZSkuIEJ5IGRlZmF1bHQgQmFja2JvbmUgd2lsbCB1c2U6IGpRdWVyeSxcbi8vIFplcHRvLCBvciBFbmRlcjsgYnV0IHRoZSBgc2V0RG9tTGlicmFyeSgpYCBtZXRob2QgbGV0cyB5b3UgaW5qZWN0IGFuXG4vLyBhbHRlcm5hdGUgSmF2YVNjcmlwdCBsaWJyYXJ5IChvciBhIG1vY2sgbGlicmFyeSBmb3IgdGVzdGluZyB5b3VyIHZpZXdzXG4vLyBvdXRzaWRlIG9mIGEgYnJvd3NlcikuXG5CYWNrYm9uZS5zZXREb21MaWJyYXJ5ID0gZnVuY3Rpb24obGliKSB7XG5cdCQgPSBsaWI7XG59O1xuXG4vLyBSdW5zIEJhY2tib25lLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBCYWNrYm9uZWAgdmFyaWFibGVcbi8vIHRvIGl0cyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGlzIEJhY2tib25lIG9iamVjdC5cbkJhY2tib25lLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcblx0cm9vdC5CYWNrYm9uZSA9IHByZXZpb3VzQmFja2JvbmU7XG5cdHJldHVybiB0aGlzO1xufTtcblxuLy8gVHVybiBvbiBgZW11bGF0ZUhUVFBgIHRvIHN1cHBvcnQgbGVnYWN5IEhUVFAgc2VydmVycy4gU2V0dGluZyB0aGlzIG9wdGlvblxuLy8gd2lsbCBmYWtlIGBcIlBVVFwiYCBhbmQgYFwiREVMRVRFXCJgIHJlcXVlc3RzIHZpYSB0aGUgYF9tZXRob2RgIHBhcmFtZXRlciBhbmRcbi8vIHNldCBhIGBYLUh0dHAtTWV0aG9kLU92ZXJyaWRlYCBoZWFkZXIuXG5CYWNrYm9uZS5lbXVsYXRlSFRUUCA9IGZhbHNlO1xuXG4vLyBUdXJuIG9uIGBlbXVsYXRlSlNPTmAgdG8gc3VwcG9ydCBsZWdhY3kgc2VydmVycyB0aGF0IGNhbid0IGRlYWwgd2l0aCBkaXJlY3Rcbi8vIGBhcHBsaWNhdGlvbi9qc29uYCByZXF1ZXN0cyAuLi4gd2lsbCBlbmNvZGUgdGhlIGJvZHkgYXNcbi8vIGBhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRgIGluc3RlYWQgYW5kIHdpbGwgc2VuZCB0aGUgbW9kZWwgaW4gYVxuLy8gZm9ybSBwYXJhbSBuYW1lZCBgbW9kZWxgLlxuQmFja2JvbmUuZW11bGF0ZUpTT04gPSBmYWxzZTtcblxuLy8gQmFja2JvbmUuRXZlbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byBzcGxpdCBldmVudCBzdHJpbmdzXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxuLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFjayBmdW5jdGlvbnNcbi8vIHRvIGFuIGV2ZW50OyB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpbiBzdWNjZXNzaW9uLlxuLy9cbi8vICAgICB2YXIgb2JqZWN0ID0ge307XG4vLyAgICAgXy5leHRlbmQob2JqZWN0LCBCYWNrYm9uZS5FdmVudHMpO1xuLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuLy8gICAgIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbi8vXG52YXIgRXZlbnRzID0gQmFja2JvbmUuRXZlbnRzID0ge1xuXG5cdC8vIEJpbmQgb25lIG9yIG1vcmUgc3BhY2Ugc2VwYXJhdGVkIGV2ZW50cywgYGV2ZW50c2AsIHRvIGEgYGNhbGxiYWNrYFxuXHQvLyBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxuXHRvbjogZnVuY3Rpb24oZXZlbnRzLCBjYWxsYmFjaywgY29udGV4dCkge1xuXG5cdHZhciBjYWxscywgZXZlbnQsIG5vZGUsIHRhaWwsIGxpc3Q7XG5cdGlmICghY2FsbGJhY2spIHJldHVybiB0aGlzO1xuXHRldmVudHMgPSBldmVudHMuc3BsaXQoZXZlbnRTcGxpdHRlcik7XG5cdGNhbGxzID0gdGhpcy5fY2FsbGJhY2tzIHx8ICh0aGlzLl9jYWxsYmFja3MgPSB7fSk7XG5cblx0Ly8gQ3JlYXRlIGFuIGltbXV0YWJsZSBjYWxsYmFjayBsaXN0LCBhbGxvd2luZyB0cmF2ZXJzYWwgZHVyaW5nXG5cdC8vIG1vZGlmaWNhdGlvbi4gIFRoZSB0YWlsIGlzIGFuIGVtcHR5IG9iamVjdCB0aGF0IHdpbGwgYWx3YXlzIGJlIHVzZWRcblx0Ly8gYXMgdGhlIG5leHQgbm9kZS5cblx0d2hpbGUgKGV2ZW50ID0gZXZlbnRzLnNoaWZ0KCkpIHtcblx0XHRsaXN0ID0gY2FsbHNbZXZlbnRdO1xuXHRcdG5vZGUgPSBsaXN0ID8gbGlzdC50YWlsIDoge307XG5cdFx0bm9kZS5uZXh0ID0gdGFpbCA9IHt9O1xuXHRcdG5vZGUuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0bm9kZS5jYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdGNhbGxzW2V2ZW50XSA9IHt0YWlsOiB0YWlsLCBuZXh0OiBsaXN0ID8gbGlzdC5uZXh0IDogbm9kZX07XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgY2FsbGJhY2tzXG5cdC8vIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbCBjYWxsYmFja3MgZm9yIHRoZVxuXHQvLyBldmVudC4gSWYgYGV2ZW50c2AgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmQgY2FsbGJhY2tzIGZvciBhbGwgZXZlbnRzLlxuXHRvZmY6IGZ1bmN0aW9uKGV2ZW50cywgY2FsbGJhY2ssIGNvbnRleHQpIHtcblx0dmFyIGV2ZW50LCBjYWxscywgbm9kZSwgdGFpbCwgY2IsIGN0eDtcblxuXHQvLyBObyBldmVudHMsIG9yIHJlbW92aW5nICphbGwqIGV2ZW50cy5cblx0aWYgKCEoY2FsbHMgPSB0aGlzLl9jYWxsYmFja3MpKSByZXR1cm47XG5cdGlmICghKGV2ZW50cyB8fCBjYWxsYmFjayB8fCBjb250ZXh0KSkge1xuXHRcdGRlbGV0ZSB0aGlzLl9jYWxsYmFja3M7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBMb29wIHRocm91Z2ggdGhlIGxpc3RlZCBldmVudHMgYW5kIGNvbnRleHRzLCBzcGxpY2luZyB0aGVtIG91dCBvZiB0aGVcblx0Ly8gbGlua2VkIGxpc3Qgb2YgY2FsbGJhY2tzIGlmIGFwcHJvcHJpYXRlLlxuXHRldmVudHMgPSBldmVudHMgPyBldmVudHMuc3BsaXQoZXZlbnRTcGxpdHRlcikgOiBfLmtleXMoY2FsbHMpO1xuXHR3aGlsZSAoZXZlbnQgPSBldmVudHMuc2hpZnQoKSkge1xuXHRcdG5vZGUgPSBjYWxsc1tldmVudF07XG5cdFx0ZGVsZXRlIGNhbGxzW2V2ZW50XTtcblx0XHRpZiAoIW5vZGUgfHwgIShjYWxsYmFjayB8fCBjb250ZXh0KSkgY29udGludWU7XG5cdFx0Ly8gQ3JlYXRlIGEgbmV3IGxpc3QsIG9taXR0aW5nIHRoZSBpbmRpY2F0ZWQgY2FsbGJhY2tzLlxuXHRcdHRhaWwgPSBub2RlLnRhaWw7XG5cdFx0d2hpbGUgKChub2RlID0gbm9kZS5uZXh0KSAhPT0gdGFpbCkge1xuXHRcdGNiID0gbm9kZS5jYWxsYmFjaztcblx0XHRjdHggPSBub2RlLmNvbnRleHQ7XG5cdFx0aWYgKChjYWxsYmFjayAmJiBjYiAhPT0gY2FsbGJhY2spIHx8IChjb250ZXh0ICYmIGN0eCAhPT0gY29udGV4dCkpIHtcblx0XHRcdHRoaXMub24oZXZlbnQsIGNiLCBjdHgpO1xuXHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvLyBUcmlnZ2VyIG9uZSBvciBtYW55IGV2ZW50cywgZmlyaW5nIGFsbCBib3VuZCBjYWxsYmFja3MuIENhbGxiYWNrcyBhcmVcblx0Ly8gcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcblx0Ly8gKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXG5cdC8vIHJlY2VpdmUgdGhlIHRydWUgbmFtZSBvZiB0aGUgZXZlbnQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50KS5cblx0dHJpZ2dlcjogZnVuY3Rpb24oZXZlbnRzKSB7XG5cdHZhciBldmVudCwgbm9kZSwgY2FsbHMsIHRhaWwsIGFyZ3MsIGFsbCwgcmVzdDtcblx0aWYgKCEoY2FsbHMgPSB0aGlzLl9jYWxsYmFja3MpKSByZXR1cm4gdGhpcztcblx0YWxsID0gY2FsbHMuYWxsO1xuXHRldmVudHMgPSBldmVudHMuc3BsaXQoZXZlbnRTcGxpdHRlcik7XG5cdHJlc3QgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cblx0Ly8gRm9yIGVhY2ggZXZlbnQsIHdhbGsgdGhyb3VnaCB0aGUgbGlua2VkIGxpc3Qgb2YgY2FsbGJhY2tzIHR3aWNlLFxuXHQvLyBmaXJzdCB0byB0cmlnZ2VyIHRoZSBldmVudCwgdGhlbiB0byB0cmlnZ2VyIGFueSBgXCJhbGxcImAgY2FsbGJhY2tzLlxuXHR3aGlsZSAoZXZlbnQgPSBldmVudHMuc2hpZnQoKSkge1xuXHRcdGlmIChub2RlID0gY2FsbHNbZXZlbnRdKSB7XG5cdFx0dGFpbCA9IG5vZGUudGFpbDtcblx0XHR3aGlsZSAoKG5vZGUgPSBub2RlLm5leHQpICE9PSB0YWlsKSB7XG5cdFx0XHRub2RlLmNhbGxiYWNrLmFwcGx5KG5vZGUuY29udGV4dCB8fCB0aGlzLCByZXN0KTtcblx0XHR9XG5cdFx0fVxuXHRcdGlmIChub2RlID0gYWxsKSB7XG5cdFx0dGFpbCA9IG5vZGUudGFpbDtcblx0XHRhcmdzID0gW2V2ZW50XS5jb25jYXQocmVzdCk7XG5cdFx0d2hpbGUgKChub2RlID0gbm9kZS5uZXh0KSAhPT0gdGFpbCkge1xuXHRcdFx0bm9kZS5jYWxsYmFjay5hcHBseShub2RlLmNvbnRleHQgfHwgdGhpcywgYXJncyk7XG5cdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xuXHR9XG5cbn07XG5cbi8vIEFsaWFzZXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuRXZlbnRzLmJpbmQgICA9IEV2ZW50cy5vbjtcbkV2ZW50cy51bmJpbmQgPSBFdmVudHMub2ZmO1xuXG4vLyBCYWNrYm9uZS5Nb2RlbFxuLy8gLS0tLS0tLS0tLS0tLS1cblxuLy8gQ3JlYXRlIGEgbmV3IG1vZGVsLCB3aXRoIGRlZmluZWQgYXR0cmlidXRlcy4gQSBjbGllbnQgaWQgKGBjaWRgKVxuLy8gaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgYW5kIGFzc2lnbmVkIGZvciB5b3UuXG52YXIgTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcblx0dmFyIGRlZmF1bHRzO1xuXHRhdHRyaWJ1dGVzIHx8IChhdHRyaWJ1dGVzID0ge30pO1xuXHRpZiAob3B0aW9ucyAmJiBvcHRpb25zLnBhcnNlKSBhdHRyaWJ1dGVzID0gdGhpcy5wYXJzZShhdHRyaWJ1dGVzKTtcblx0aWYgKGRlZmF1bHRzID0gZ2V0VmFsdWUodGhpcywgJ2RlZmF1bHRzJykpIHtcblx0YXR0cmlidXRlcyA9IF8uZXh0ZW5kKHt9LCBkZWZhdWx0cywgYXR0cmlidXRlcyk7XG5cdH1cblx0aWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5jb2xsZWN0aW9uKSB0aGlzLmNvbGxlY3Rpb24gPSBvcHRpb25zLmNvbGxlY3Rpb247XG5cdHRoaXMuYXR0cmlidXRlcyA9IHt9O1xuXHR0aGlzLl9lc2NhcGVkQXR0cmlidXRlcyA9IHt9O1xuXHR0aGlzLmNpZCA9IF8udW5pcXVlSWQoJ2MnKTtcblx0dGhpcy5jaGFuZ2VkID0ge307XG5cdHRoaXMuX3NpbGVudCA9IHt9O1xuXHR0aGlzLl9wZW5kaW5nID0ge307XG5cdHRoaXMuc2V0KGF0dHJpYnV0ZXMsIHtzaWxlbnQ6IHRydWV9KTtcblx0Ly8gUmVzZXQgY2hhbmdlIHRyYWNraW5nLlxuXHR0aGlzLmNoYW5nZWQgPSB7fTtcblx0dGhpcy5fc2lsZW50ID0ge307XG5cdHRoaXMuX3BlbmRpbmcgPSB7fTtcblx0dGhpcy5fcHJldmlvdXNBdHRyaWJ1dGVzID0gXy5jbG9uZSh0aGlzLmF0dHJpYnV0ZXMpO1xuXHR0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8vIEF0dGFjaCBhbGwgaW5oZXJpdGFibGUgbWV0aG9kcyB0byB0aGUgTW9kZWwgcHJvdG90eXBlLlxuXy5leHRlbmQoTW9kZWwucHJvdG90eXBlLCBFdmVudHMsIHtcblxuXHQvLyBBIGhhc2ggb2YgYXR0cmlidXRlcyB3aG9zZSBjdXJyZW50IGFuZCBwcmV2aW91cyB2YWx1ZSBkaWZmZXIuXG5cdGNoYW5nZWQ6IG51bGwsXG5cblx0Ly8gQSBoYXNoIG9mIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIHNpbGVudGx5IGNoYW5nZWQgc2luY2UgdGhlIGxhc3QgdGltZVxuXHQvLyBgY2hhbmdlYCB3YXMgY2FsbGVkLiAgV2lsbCBiZWNvbWUgcGVuZGluZyBhdHRyaWJ1dGVzIG9uIHRoZSBuZXh0IGNhbGwuXG5cdF9zaWxlbnQ6IG51bGwsXG5cblx0Ly8gQSBoYXNoIG9mIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3QgYCdjaGFuZ2UnYCBldmVudFxuXHQvLyBiZWdhbi5cblx0X3BlbmRpbmc6IG51bGwsXG5cblx0Ly8gVGhlIGRlZmF1bHQgbmFtZSBmb3IgdGhlIEpTT04gYGlkYCBhdHRyaWJ1dGUgaXMgYFwiaWRcImAuIE1vbmdvREIgYW5kXG5cdC8vIENvdWNoREIgdXNlcnMgbWF5IHdhbnQgdG8gc2V0IHRoaXMgdG8gYFwiX2lkXCJgLlxuXHRpZEF0dHJpYnV0ZTogJ2lkJyxcblxuXHQvLyBJbml0aWFsaXplIGlzIGFuIGVtcHR5IGZ1bmN0aW9uIGJ5IGRlZmF1bHQuIE92ZXJyaWRlIGl0IHdpdGggeW91ciBvd25cblx0Ly8gaW5pdGlhbGl6YXRpb24gbG9naWMuXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7fSxcblxuXHQvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG5cdHRvSlNPTjogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRyZXR1cm4gXy5jbG9uZSh0aGlzLmF0dHJpYnV0ZXMpO1xuXHR9LFxuXG5cdC8vIEdldCB0aGUgdmFsdWUgb2YgYW4gYXR0cmlidXRlLlxuXHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0cmV0dXJuIHRoaXMuYXR0cmlidXRlc1thdHRyXTtcblx0fSxcblxuXHQvLyBHZXQgdGhlIEhUTUwtZXNjYXBlZCB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUuXG5cdGVzY2FwZTogZnVuY3Rpb24oYXR0cikge1xuXHR2YXIgaHRtbDtcblx0aWYgKGh0bWwgPSB0aGlzLl9lc2NhcGVkQXR0cmlidXRlc1thdHRyXSkgcmV0dXJuIGh0bWw7XG5cdHZhciB2YWwgPSB0aGlzLmdldChhdHRyKTtcblx0cmV0dXJuIHRoaXMuX2VzY2FwZWRBdHRyaWJ1dGVzW2F0dHJdID0gXy5lc2NhcGUodmFsID09IG51bGwgPyAnJyA6ICcnICsgdmFsKTtcblx0fSxcblxuXHQvLyBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYXR0cmlidXRlIGNvbnRhaW5zIGEgdmFsdWUgdGhhdCBpcyBub3QgbnVsbFxuXHQvLyBvciB1bmRlZmluZWQuXG5cdGhhczogZnVuY3Rpb24oYXR0cikge1xuXHRyZXR1cm4gdGhpcy5nZXQoYXR0cikgIT0gbnVsbDtcblx0fSxcblxuXHQvLyBTZXQgYSBoYXNoIG9mIG1vZGVsIGF0dHJpYnV0ZXMgb24gdGhlIG9iamVjdCwgZmlyaW5nIGBcImNoYW5nZVwiYCB1bmxlc3Ncblx0Ly8geW91IGNob29zZSB0byBzaWxlbmNlIGl0LlxuXHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcblx0dmFyIGF0dHJzLCBhdHRyLCB2YWw7XG5cblx0Ly8gSGFuZGxlIGJvdGhcblx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdGF0dHJzID0ga2V5O1xuXHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHRhdHRycyA9IHt9O1xuXHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0fVxuXG5cdC8vIEV4dHJhY3QgYXR0cmlidXRlcyBhbmQgb3B0aW9ucy5cblx0b3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcblx0aWYgKCFhdHRycykgcmV0dXJuIHRoaXM7XG5cdGlmIChhdHRycyBpbnN0YW5jZW9mIE1vZGVsKSBhdHRycyA9IGF0dHJzLmF0dHJpYnV0ZXM7XG5cdGlmIChvcHRpb25zLnVuc2V0KSBmb3IgKGF0dHIgaW4gYXR0cnMpIGF0dHJzW2F0dHJdID0gdm9pZCAwO1xuXG5cdC8vIFJ1biB2YWxpZGF0aW9uLlxuXHRpZiAoIXRoaXMuX3ZhbGlkYXRlKGF0dHJzLCBvcHRpb25zKSkgcmV0dXJuIGZhbHNlO1xuXG5cdC8vIENoZWNrIGZvciBjaGFuZ2VzIG9mIGBpZGAuXG5cdGlmICh0aGlzLmlkQXR0cmlidXRlIGluIGF0dHJzKSB0aGlzLmlkID0gYXR0cnNbdGhpcy5pZEF0dHJpYnV0ZV07XG5cblx0dmFyIGNoYW5nZXMgPSBvcHRpb25zLmNoYW5nZXMgPSB7fTtcblx0dmFyIG5vdyA9IHRoaXMuYXR0cmlidXRlcztcblx0dmFyIGVzY2FwZWQgPSB0aGlzLl9lc2NhcGVkQXR0cmlidXRlcztcblx0dmFyIHByZXYgPSB0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXMgfHwge307XG5cblx0Ly8gRm9yIGVhY2ggYHNldGAgYXR0cmlidXRlLi4uXG5cdGZvciAoYXR0ciBpbiBhdHRycykge1xuXHRcdHZhbCA9IGF0dHJzW2F0dHJdO1xuXG5cdFx0Ly8gSWYgdGhlIG5ldyBhbmQgY3VycmVudCB2YWx1ZSBkaWZmZXIsIHJlY29yZCB0aGUgY2hhbmdlLlxuXHRcdGlmICghXy5pc0VxdWFsKG5vd1thdHRyXSwgdmFsKSB8fCAob3B0aW9ucy51bnNldCAmJiBfLmhhcyhub3csIGF0dHIpKSkge1xuXHRcdGRlbGV0ZSBlc2NhcGVkW2F0dHJdO1xuXHRcdChvcHRpb25zLnNpbGVudCA/IHRoaXMuX3NpbGVudCA6IGNoYW5nZXMpW2F0dHJdID0gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgb3IgZGVsZXRlIHRoZSBjdXJyZW50IHZhbHVlLlxuXHRcdG9wdGlvbnMudW5zZXQgPyBkZWxldGUgbm93W2F0dHJdIDogbm93W2F0dHJdID0gdmFsO1xuXG5cdFx0Ly8gSWYgdGhlIG5ldyBhbmQgcHJldmlvdXMgdmFsdWUgZGlmZmVyLCByZWNvcmQgdGhlIGNoYW5nZS4gIElmIG5vdCxcblx0XHQvLyB0aGVuIHJlbW92ZSBjaGFuZ2VzIGZvciB0aGlzIGF0dHJpYnV0ZS5cblx0XHRpZiAoIV8uaXNFcXVhbChwcmV2W2F0dHJdLCB2YWwpIHx8IChfLmhhcyhub3csIGF0dHIpICE9IF8uaGFzKHByZXYsIGF0dHIpKSkge1xuXHRcdHRoaXMuY2hhbmdlZFthdHRyXSA9IHZhbDtcblx0XHRpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLl9wZW5kaW5nW2F0dHJdID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdGRlbGV0ZSB0aGlzLmNoYW5nZWRbYXR0cl07XG5cdFx0ZGVsZXRlIHRoaXMuX3BlbmRpbmdbYXR0cl07XG5cdFx0fVxuXHR9XG5cblx0Ly8gRmlyZSB0aGUgYFwiY2hhbmdlXCJgIGV2ZW50cy5cblx0aWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5jaGFuZ2Uob3B0aW9ucyk7XG5cdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8vIFJlbW92ZSBhbiBhdHRyaWJ1dGUgZnJvbSB0aGUgbW9kZWwsIGZpcmluZyBgXCJjaGFuZ2VcImAgdW5sZXNzIHlvdSBjaG9vc2Vcblx0Ly8gdG8gc2lsZW5jZSBpdC4gYHVuc2V0YCBpcyBhIG5vb3AgaWYgdGhlIGF0dHJpYnV0ZSBkb2Vzbid0IGV4aXN0LlxuXHR1bnNldDogZnVuY3Rpb24oYXR0ciwgb3B0aW9ucykge1xuXHQob3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KSkudW5zZXQgPSB0cnVlO1xuXHRyZXR1cm4gdGhpcy5zZXQoYXR0ciwgbnVsbCwgb3B0aW9ucyk7XG5cdH0sXG5cblx0Ly8gQ2xlYXIgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIG1vZGVsLCBmaXJpbmcgYFwiY2hhbmdlXCJgIHVubGVzcyB5b3UgY2hvb3NlXG5cdC8vIHRvIHNpbGVuY2UgaXQuXG5cdGNsZWFyOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdChvcHRpb25zIHx8IChvcHRpb25zID0ge30pKS51bnNldCA9IHRydWU7XG5cdHJldHVybiB0aGlzLnNldChfLmNsb25lKHRoaXMuYXR0cmlidXRlcyksIG9wdGlvbnMpO1xuXHR9LFxuXG5cdC8vIEZldGNoIHRoZSBtb2RlbCBmcm9tIHRoZSBzZXJ2ZXIuIElmIHRoZSBzZXJ2ZXIncyByZXByZXNlbnRhdGlvbiBvZiB0aGVcblx0Ly8gbW9kZWwgZGlmZmVycyBmcm9tIGl0cyBjdXJyZW50IGF0dHJpYnV0ZXMsIHRoZXkgd2lsbCBiZSBvdmVycmlkZW4sXG5cdC8vIHRyaWdnZXJpbmcgYSBgXCJjaGFuZ2VcImAgZXZlbnQuXG5cdGZldGNoOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdG9wdGlvbnMgPSBvcHRpb25zID8gXy5jbG9uZShvcHRpb25zKSA6IHt9O1xuXHR2YXIgbW9kZWwgPSB0aGlzO1xuXHR2YXIgc3VjY2VzcyA9IG9wdGlvbnMuc3VjY2Vzcztcblx0b3B0aW9ucy5zdWNjZXNzID0gZnVuY3Rpb24ocmVzcCwgc3RhdHVzLCB4aHIpIHtcblx0XHRpZiAoIW1vZGVsLnNldChtb2RlbC5wYXJzZShyZXNwLCB4aHIpLCBvcHRpb25zKSkgcmV0dXJuIGZhbHNlO1xuXHRcdGlmIChzdWNjZXNzKSBzdWNjZXNzKG1vZGVsLCByZXNwKTtcblx0fTtcblx0b3B0aW9ucy5lcnJvciA9IEJhY2tib25lLndyYXBFcnJvcihvcHRpb25zLmVycm9yLCBtb2RlbCwgb3B0aW9ucyk7XG5cdHJldHVybiAodGhpcy5zeW5jIHx8IEJhY2tib25lLnN5bmMpLmNhbGwodGhpcywgJ3JlYWQnLCB0aGlzLCBvcHRpb25zKTtcblx0fSxcblxuXHQvLyBTZXQgYSBoYXNoIG9mIG1vZGVsIGF0dHJpYnV0ZXMsIGFuZCBzeW5jIHRoZSBtb2RlbCB0byB0aGUgc2VydmVyLlxuXHQvLyBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Ncblx0Ly8gc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cblx0c2F2ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHR2YXIgYXR0cnMsIGN1cnJlbnQ7XG5cblx0Ly8gSGFuZGxlIGJvdGggYChcImtleVwiLCB2YWx1ZSlgIGFuZCBgKHtrZXk6IHZhbHVlfSlgIC1zdHlsZSBjYWxscy5cblx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdGF0dHJzID0ga2V5O1xuXHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHRhdHRycyA9IHt9O1xuXHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0fVxuXHRvcHRpb25zID0gb3B0aW9ucyA/IF8uY2xvbmUob3B0aW9ucykgOiB7fTtcblxuXHQvLyBJZiB3ZSdyZSBcIndhaXRcIi1pbmcgdG8gc2V0IGNoYW5nZWQgYXR0cmlidXRlcywgdmFsaWRhdGUgZWFybHkuXG5cdGlmIChvcHRpb25zLndhaXQpIHtcblx0XHRpZiAoIXRoaXMuX3ZhbGlkYXRlKGF0dHJzLCBvcHRpb25zKSkgcmV0dXJuIGZhbHNlO1xuXHRcdGN1cnJlbnQgPSBfLmNsb25lKHRoaXMuYXR0cmlidXRlcyk7XG5cdH1cblxuXHQvLyBSZWd1bGFyIHNhdmVzIGBzZXRgIGF0dHJpYnV0ZXMgYmVmb3JlIHBlcnNpc3RpbmcgdG8gdGhlIHNlcnZlci5cblx0dmFyIHNpbGVudE9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucywge3NpbGVudDogdHJ1ZX0pO1xuXHRpZiAoYXR0cnMgJiYgIXRoaXMuc2V0KGF0dHJzLCBvcHRpb25zLndhaXQgPyBzaWxlbnRPcHRpb25zIDogb3B0aW9ucykpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBBZnRlciBhIHN1Y2Nlc3NmdWwgc2VydmVyLXNpZGUgc2F2ZSwgdGhlIGNsaWVudCBpcyAob3B0aW9uYWxseSlcblx0Ly8gdXBkYXRlZCB3aXRoIHRoZSBzZXJ2ZXItc2lkZSBzdGF0ZS5cblx0dmFyIG1vZGVsID0gdGhpcztcblx0dmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG5cdG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3AsIHN0YXR1cywgeGhyKSB7XG5cdFx0dmFyIHNlcnZlckF0dHJzID0gbW9kZWwucGFyc2UocmVzcCwgeGhyKTtcblx0XHRpZiAob3B0aW9ucy53YWl0KSB7XG5cdFx0ZGVsZXRlIG9wdGlvbnMud2FpdDtcblx0XHRzZXJ2ZXJBdHRycyA9IF8uZXh0ZW5kKGF0dHJzIHx8IHt9LCBzZXJ2ZXJBdHRycyk7XG5cdFx0fVxuXHRcdGlmICghbW9kZWwuc2V0KHNlcnZlckF0dHJzLCBvcHRpb25zKSkgcmV0dXJuIGZhbHNlO1xuXHRcdGlmIChzdWNjZXNzKSB7XG5cdFx0c3VjY2Vzcyhtb2RlbCwgcmVzcCk7XG5cdFx0fSBlbHNlIHtcblx0XHRtb2RlbC50cmlnZ2VyKCdzeW5jJywgbW9kZWwsIHJlc3AsIG9wdGlvbnMpO1xuXHRcdH1cblx0fTtcblxuXHQvLyBGaW5pc2ggY29uZmlndXJpbmcgYW5kIHNlbmRpbmcgdGhlIEFqYXggcmVxdWVzdC5cblx0b3B0aW9ucy5lcnJvciA9IEJhY2tib25lLndyYXBFcnJvcihvcHRpb25zLmVycm9yLCBtb2RlbCwgb3B0aW9ucyk7XG5cdHZhciBtZXRob2QgPSB0aGlzLmlzTmV3KCkgPyAnY3JlYXRlJyA6ICd1cGRhdGUnO1xuXHR2YXIgeGhyID0gKHRoaXMuc3luYyB8fCBCYWNrYm9uZS5zeW5jKS5jYWxsKHRoaXMsIG1ldGhvZCwgdGhpcywgb3B0aW9ucyk7XG5cdGlmIChvcHRpb25zLndhaXQpIHRoaXMuc2V0KGN1cnJlbnQsIHNpbGVudE9wdGlvbnMpO1xuXHRyZXR1cm4geGhyO1xuXHR9LFxuXG5cdC8vIERlc3Ryb3kgdGhpcyBtb2RlbCBvbiB0aGUgc2VydmVyIGlmIGl0IHdhcyBhbHJlYWR5IHBlcnNpc3RlZC5cblx0Ly8gT3B0aW1pc3RpY2FsbHkgcmVtb3ZlcyB0aGUgbW9kZWwgZnJvbSBpdHMgY29sbGVjdGlvbiwgaWYgaXQgaGFzIG9uZS5cblx0Ly8gSWYgYHdhaXQ6IHRydWVgIGlzIHBhc3NlZCwgd2FpdHMgZm9yIHRoZSBzZXJ2ZXIgdG8gcmVzcG9uZCBiZWZvcmUgcmVtb3ZhbC5cblx0ZGVzdHJveTogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRpb25zID0gb3B0aW9ucyA/IF8uY2xvbmUob3B0aW9ucykgOiB7fTtcblx0dmFyIG1vZGVsID0gdGhpcztcblx0dmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG5cblx0dmFyIHRyaWdnZXJEZXN0cm95ID0gZnVuY3Rpb24oKSB7XG5cdFx0bW9kZWwudHJpZ2dlcignZGVzdHJveScsIG1vZGVsLCBtb2RlbC5jb2xsZWN0aW9uLCBvcHRpb25zKTtcblx0fTtcblxuXHRpZiAodGhpcy5pc05ldygpKSB7XG5cdFx0dHJpZ2dlckRlc3Ryb3koKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbihyZXNwKSB7XG5cdFx0aWYgKG9wdGlvbnMud2FpdCkgdHJpZ2dlckRlc3Ryb3koKTtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdHN1Y2Nlc3MobW9kZWwsIHJlc3ApO1xuXHRcdH0gZWxzZSB7XG5cdFx0bW9kZWwudHJpZ2dlcignc3luYycsIG1vZGVsLCByZXNwLCBvcHRpb25zKTtcblx0XHR9XG5cdH07XG5cblx0b3B0aW9ucy5lcnJvciA9IEJhY2tib25lLndyYXBFcnJvcihvcHRpb25zLmVycm9yLCBtb2RlbCwgb3B0aW9ucyk7XG5cdHZhciB4aHIgPSAodGhpcy5zeW5jIHx8IEJhY2tib25lLnN5bmMpLmNhbGwodGhpcywgJ2RlbGV0ZScsIHRoaXMsIG9wdGlvbnMpO1xuXHRpZiAoIW9wdGlvbnMud2FpdCkgdHJpZ2dlckRlc3Ryb3koKTtcblx0cmV0dXJuIHhocjtcblx0fSxcblxuXHQvLyBEZWZhdWx0IFVSTCBmb3IgdGhlIG1vZGVsJ3MgcmVwcmVzZW50YXRpb24gb24gdGhlIHNlcnZlciAtLSBpZiB5b3UncmVcblx0Ly8gdXNpbmcgQmFja2JvbmUncyByZXN0ZnVsIG1ldGhvZHMsIG92ZXJyaWRlIHRoaXMgdG8gY2hhbmdlIHRoZSBlbmRwb2ludFxuXHQvLyB0aGF0IHdpbGwgYmUgY2FsbGVkLlxuXHR1cmw6IGZ1bmN0aW9uKCkge1xuXHR2YXIgYmFzZSA9IGdldFZhbHVlKHRoaXMsICd1cmxSb290JykgfHwgZ2V0VmFsdWUodGhpcy5jb2xsZWN0aW9uLCAndXJsJykgfHwgdXJsRXJyb3IoKTtcblx0aWYgKHRoaXMuaXNOZXcoKSkgcmV0dXJuIGJhc2U7XG5cdHJldHVybiBiYXNlICsgKGJhc2UuY2hhckF0KGJhc2UubGVuZ3RoIC0gMSkgPT0gJy8nID8gJycgOiAnLycpICsgZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuaWQpO1xuXHR9LFxuXG5cdC8vICoqcGFyc2UqKiBjb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvblxuXHQvLyB0aGUgbW9kZWwuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG5cdHBhcnNlOiBmdW5jdGlvbihyZXNwLCB4aHIpIHtcblx0cmV0dXJuIHJlc3A7XG5cdH0sXG5cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZGVsIHdpdGggaWRlbnRpY2FsIGF0dHJpYnV0ZXMgdG8gdGhpcyBvbmUuXG5cdGNsb25lOiBmdW5jdGlvbigpIHtcblx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuYXR0cmlidXRlcyk7XG5cdH0sXG5cblx0Ly8gQSBtb2RlbCBpcyBuZXcgaWYgaXQgaGFzIG5ldmVyIGJlZW4gc2F2ZWQgdG8gdGhlIHNlcnZlciwgYW5kIGxhY2tzIGFuIGlkLlxuXHRpc05ldzogZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmlkID09IG51bGw7XG5cdH0sXG5cblx0Ly8gQ2FsbCB0aGlzIG1ldGhvZCB0byBtYW51YWxseSBmaXJlIGEgYFwiY2hhbmdlXCJgIGV2ZW50IGZvciB0aGlzIG1vZGVsIGFuZFxuXHQvLyBhIGBcImNoYW5nZTphdHRyaWJ1dGVcImAgZXZlbnQgZm9yIGVhY2ggY2hhbmdlZCBhdHRyaWJ1dGUuXG5cdC8vIENhbGxpbmcgdGhpcyB3aWxsIGNhdXNlIGFsbCBvYmplY3RzIG9ic2VydmluZyB0aGUgbW9kZWwgdG8gdXBkYXRlLlxuXHRjaGFuZ2U6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0b3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcblx0dmFyIGNoYW5naW5nID0gdGhpcy5fY2hhbmdpbmc7XG5cdHRoaXMuX2NoYW5naW5nID0gdHJ1ZTtcblxuXHQvLyBTaWxlbnQgY2hhbmdlcyBiZWNvbWUgcGVuZGluZyBjaGFuZ2VzLlxuXHRmb3IgKHZhciBhdHRyIGluIHRoaXMuX3NpbGVudCkgdGhpcy5fcGVuZGluZ1thdHRyXSA9IHRydWU7XG5cblx0Ly8gU2lsZW50IGNoYW5nZXMgYXJlIHRyaWdnZXJlZC5cblx0dmFyIGNoYW5nZXMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucy5jaGFuZ2VzLCB0aGlzLl9zaWxlbnQpO1xuXHR0aGlzLl9zaWxlbnQgPSB7fTtcblx0Zm9yICh2YXIgYXR0ciBpbiBjaGFuZ2VzKSB7XG5cdFx0dGhpcy50cmlnZ2VyKCdjaGFuZ2U6JyArIGF0dHIsIHRoaXMsIHRoaXMuZ2V0KGF0dHIpLCBvcHRpb25zKTtcblx0fVxuXHRpZiAoY2hhbmdpbmcpIHJldHVybiB0aGlzO1xuXG5cdC8vIENvbnRpbnVlIGZpcmluZyBgXCJjaGFuZ2VcImAgZXZlbnRzIHdoaWxlIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXMuXG5cdHdoaWxlICghXy5pc0VtcHR5KHRoaXMuX3BlbmRpbmcpKSB7XG5cdFx0dGhpcy5fcGVuZGluZyA9IHt9O1xuXHRcdHRoaXMudHJpZ2dlcignY2hhbmdlJywgdGhpcywgb3B0aW9ucyk7XG5cdFx0Ly8gUGVuZGluZyBhbmQgc2lsZW50IGNoYW5nZXMgc3RpbGwgcmVtYWluLlxuXHRcdGZvciAodmFyIGF0dHIgaW4gdGhpcy5jaGFuZ2VkKSB7XG5cdFx0aWYgKHRoaXMuX3BlbmRpbmdbYXR0cl0gfHwgdGhpcy5fc2lsZW50W2F0dHJdKSBjb250aW51ZTtcblx0XHRkZWxldGUgdGhpcy5jaGFuZ2VkW2F0dHJdO1xuXHRcdH1cblx0XHR0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXMgPSBfLmNsb25lKHRoaXMuYXR0cmlidXRlcyk7XG5cdH1cblxuXHR0aGlzLl9jaGFuZ2luZyA9IGZhbHNlO1xuXHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvLyBEZXRlcm1pbmUgaWYgdGhlIG1vZGVsIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IGBcImNoYW5nZVwiYCBldmVudC5cblx0Ly8gSWYgeW91IHNwZWNpZnkgYW4gYXR0cmlidXRlIG5hbWUsIGRldGVybWluZSBpZiB0aGF0IGF0dHJpYnV0ZSBoYXMgY2hhbmdlZC5cblx0aGFzQ2hhbmdlZDogZnVuY3Rpb24oYXR0cikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiAhXy5pc0VtcHR5KHRoaXMuY2hhbmdlZCk7XG5cdHJldHVybiBfLmhhcyh0aGlzLmNoYW5nZWQsIGF0dHIpO1xuXHR9LFxuXG5cdC8vIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQsIG9yXG5cdC8vIGZhbHNlIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VkIGF0dHJpYnV0ZXMuIFVzZWZ1bCBmb3IgZGV0ZXJtaW5pbmcgd2hhdFxuXHQvLyBwYXJ0cyBvZiBhIHZpZXcgbmVlZCB0byBiZSB1cGRhdGVkIGFuZC9vciB3aGF0IGF0dHJpYnV0ZXMgbmVlZCB0byBiZVxuXHQvLyBwZXJzaXN0ZWQgdG8gdGhlIHNlcnZlci4gVW5zZXQgYXR0cmlidXRlcyB3aWxsIGJlIHNldCB0byB1bmRlZmluZWQuXG5cdC8vIFlvdSBjYW4gYWxzbyBwYXNzIGFuIGF0dHJpYnV0ZXMgb2JqZWN0IHRvIGRpZmYgYWdhaW5zdCB0aGUgbW9kZWwsXG5cdC8vIGRldGVybWluaW5nIGlmIHRoZXJlICp3b3VsZCBiZSogYSBjaGFuZ2UuXG5cdGNoYW5nZWRBdHRyaWJ1dGVzOiBmdW5jdGlvbihkaWZmKSB7XG5cdGlmICghZGlmZikgcmV0dXJuIHRoaXMuaGFzQ2hhbmdlZCgpID8gXy5jbG9uZSh0aGlzLmNoYW5nZWQpIDogZmFsc2U7XG5cdHZhciB2YWwsIGNoYW5nZWQgPSBmYWxzZSwgb2xkID0gdGhpcy5fcHJldmlvdXNBdHRyaWJ1dGVzO1xuXHRmb3IgKHZhciBhdHRyIGluIGRpZmYpIHtcblx0XHRpZiAoXy5pc0VxdWFsKG9sZFthdHRyXSwgKHZhbCA9IGRpZmZbYXR0cl0pKSkgY29udGludWU7XG5cdFx0KGNoYW5nZWQgfHwgKGNoYW5nZWQgPSB7fSkpW2F0dHJdID0gdmFsO1xuXHR9XG5cdHJldHVybiBjaGFuZ2VkO1xuXHR9LFxuXG5cdC8vIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdFxuXHQvLyBgXCJjaGFuZ2VcImAgZXZlbnQgd2FzIGZpcmVkLlxuXHRwcmV2aW91czogZnVuY3Rpb24oYXR0cikge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGggfHwgIXRoaXMuX3ByZXZpb3VzQXR0cmlidXRlcykgcmV0dXJuIG51bGw7XG5cdHJldHVybiB0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXNbYXR0cl07XG5cdH0sXG5cblx0Ly8gR2V0IGFsbCBvZiB0aGUgYXR0cmlidXRlcyBvZiB0aGUgbW9kZWwgYXQgdGhlIHRpbWUgb2YgdGhlIHByZXZpb3VzXG5cdC8vIGBcImNoYW5nZVwiYCBldmVudC5cblx0cHJldmlvdXNBdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcblx0cmV0dXJuIF8uY2xvbmUodGhpcy5fcHJldmlvdXNBdHRyaWJ1dGVzKTtcblx0fSxcblxuXHQvLyBDaGVjayBpZiB0aGUgbW9kZWwgaXMgY3VycmVudGx5IGluIGEgdmFsaWQgc3RhdGUuIEl0J3Mgb25seSBwb3NzaWJsZSB0b1xuXHQvLyBnZXQgaW50byBhbiAqaW52YWxpZCogc3RhdGUgaWYgeW91J3JlIHVzaW5nIHNpbGVudCBjaGFuZ2VzLlxuXHRpc1ZhbGlkOiBmdW5jdGlvbigpIHtcblx0cmV0dXJuICF0aGlzLnZhbGlkYXRlKHRoaXMuYXR0cmlidXRlcyk7XG5cdH0sXG5cblx0Ly8gUnVuIHZhbGlkYXRpb24gYWdhaW5zdCB0aGUgbmV4dCBjb21wbGV0ZSBzZXQgb2YgbW9kZWwgYXR0cmlidXRlcyxcblx0Ly8gcmV0dXJuaW5nIGB0cnVlYCBpZiBhbGwgaXMgd2VsbC4gSWYgYSBzcGVjaWZpYyBgZXJyb3JgIGNhbGxiYWNrIGhhc1xuXHQvLyBiZWVuIHBhc3NlZCwgY2FsbCB0aGF0IGluc3RlYWQgb2YgZmlyaW5nIHRoZSBnZW5lcmFsIGBcImVycm9yXCJgIGV2ZW50LlxuXHRfdmFsaWRhdGU6IGZ1bmN0aW9uKGF0dHJzLCBvcHRpb25zKSB7XG5cdGlmIChvcHRpb25zLnNpbGVudCB8fCAhdGhpcy52YWxpZGF0ZSkgcmV0dXJuIHRydWU7XG5cdGF0dHJzID0gXy5leHRlbmQoe30sIHRoaXMuYXR0cmlidXRlcywgYXR0cnMpO1xuXHR2YXIgZXJyb3IgPSB0aGlzLnZhbGlkYXRlKGF0dHJzLCBvcHRpb25zKTtcblx0aWYgKCFlcnJvcikgcmV0dXJuIHRydWU7XG5cdGlmIChvcHRpb25zICYmIG9wdGlvbnMuZXJyb3IpIHtcblx0XHRvcHRpb25zLmVycm9yKHRoaXMsIGVycm9yLCBvcHRpb25zKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLnRyaWdnZXIoJ2Vycm9yJywgdGhpcywgZXJyb3IsIG9wdGlvbnMpO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcblx0fVxuXG59KTtcblxuLy8gQmFja2JvbmUuQ29sbGVjdGlvblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBQcm92aWRlcyBhIHN0YW5kYXJkIGNvbGxlY3Rpb24gY2xhc3MgZm9yIG91ciBzZXRzIG9mIG1vZGVscywgb3JkZXJlZFxuLy8gb3IgdW5vcmRlcmVkLiBJZiBhIGBjb21wYXJhdG9yYCBpcyBzcGVjaWZpZWQsIHRoZSBDb2xsZWN0aW9uIHdpbGwgbWFpbnRhaW5cbi8vIGl0cyBtb2RlbHMgaW4gc29ydCBvcmRlciwgYXMgdGhleSdyZSBhZGRlZCBhbmQgcmVtb3ZlZC5cbnZhciBDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuXHRvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXHRpZiAob3B0aW9ucy5tb2RlbCkgdGhpcy5tb2RlbCA9IG9wdGlvbnMubW9kZWw7XG5cdGlmIChvcHRpb25zLmNvbXBhcmF0b3IpIHRoaXMuY29tcGFyYXRvciA9IG9wdGlvbnMuY29tcGFyYXRvcjtcblx0dGhpcy5fcmVzZXQoKTtcblx0dGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdGlmIChtb2RlbHMpIHRoaXMucmVzZXQobW9kZWxzLCB7c2lsZW50OiB0cnVlLCBwYXJzZTogb3B0aW9ucy5wYXJzZX0pO1xufTtcblxuLy8gRGVmaW5lIHRoZSBDb2xsZWN0aW9uJ3MgaW5oZXJpdGFibGUgbWV0aG9kcy5cbl8uZXh0ZW5kKENvbGxlY3Rpb24ucHJvdG90eXBlLCBFdmVudHMsIHtcblxuXHQvLyBUaGUgZGVmYXVsdCBtb2RlbCBmb3IgYSBjb2xsZWN0aW9uIGlzIGp1c3QgYSAqKkJhY2tib25lLk1vZGVsKiouXG5cdC8vIFRoaXMgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gbW9zdCBjYXNlcy5cblx0bW9kZWw6IE1vZGVsLFxuXG5cdC8vIEluaXRpYWxpemUgaXMgYW4gZW1wdHkgZnVuY3Rpb24gYnkgZGVmYXVsdC4gT3ZlcnJpZGUgaXQgd2l0aCB5b3VyIG93blxuXHQvLyBpbml0aWFsaXphdGlvbiBsb2dpYy5cblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKXt9LFxuXG5cdC8vIFRoZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIGEgQ29sbGVjdGlvbiBpcyBhbiBhcnJheSBvZiB0aGVcblx0Ly8gbW9kZWxzJyBhdHRyaWJ1dGVzLlxuXHR0b0pTT046IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0cmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uKG1vZGVsKXsgcmV0dXJuIG1vZGVsLnRvSlNPTihvcHRpb25zKTsgfSk7XG5cdH0sXG5cblx0Ly8gQWRkIGEgbW9kZWwsIG9yIGxpc3Qgb2YgbW9kZWxzIHRvIHRoZSBzZXQuIFBhc3MgKipzaWxlbnQqKiB0byBhdm9pZFxuXHQvLyBmaXJpbmcgdGhlIGBhZGRgIGV2ZW50IGZvciBldmVyeSBuZXcgbW9kZWwuXG5cdGFkZDogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG5cdHZhciBpLCBpbmRleCwgbGVuZ3RoLCBtb2RlbCwgY2lkLCBpZCwgY2lkcyA9IHt9LCBpZHMgPSB7fSwgZHVwcyA9IFtdO1xuXHRvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXHRtb2RlbHMgPSBfLmlzQXJyYXkobW9kZWxzKSA/IG1vZGVscy5zbGljZSgpIDogW21vZGVsc107XG5cblx0Ly8gQmVnaW4gYnkgdHVybmluZyBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudGluZ1xuXHQvLyBpbnZhbGlkIG1vZGVscyBvciBkdXBsaWNhdGUgbW9kZWxzIGZyb20gYmVpbmcgYWRkZWQuXG5cdGZvciAoaSA9IDAsIGxlbmd0aCA9IG1vZGVscy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdGlmICghKG1vZGVsID0gbW9kZWxzW2ldID0gdGhpcy5fcHJlcGFyZU1vZGVsKG1vZGVsc1tpXSwgb3B0aW9ucykpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgYWRkIGFuIGludmFsaWQgbW9kZWwgdG8gYSBjb2xsZWN0aW9uXCIpO1xuXHRcdH1cblx0XHRjaWQgPSBtb2RlbC5jaWQ7XG5cdFx0aWQgPSBtb2RlbC5pZDtcblx0XHRpZiAoY2lkc1tjaWRdIHx8IHRoaXMuX2J5Q2lkW2NpZF0gfHwgKChpZCAhPSBudWxsKSAmJiAoaWRzW2lkXSB8fCB0aGlzLl9ieUlkW2lkXSkpKSB7XG5cdFx0ZHVwcy5wdXNoKGkpO1xuXHRcdGNvbnRpbnVlO1xuXHRcdH1cblx0XHRjaWRzW2NpZF0gPSBpZHNbaWRdID0gbW9kZWw7XG5cdH1cblxuXHQvLyBSZW1vdmUgZHVwbGljYXRlcy5cblx0aSA9IGR1cHMubGVuZ3RoO1xuXHR3aGlsZSAoaS0tKSB7XG5cdFx0bW9kZWxzLnNwbGljZShkdXBzW2ldLCAxKTtcblx0fVxuXG5cdC8vIExpc3RlbiB0byBhZGRlZCBtb2RlbHMnIGV2ZW50cywgYW5kIGluZGV4IG1vZGVscyBmb3IgbG9va3VwIGJ5XG5cdC8vIGBpZGAgYW5kIGJ5IGBjaWRgLlxuXHRmb3IgKGkgPSAwLCBsZW5ndGggPSBtb2RlbHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHQobW9kZWwgPSBtb2RlbHNbaV0pLm9uKCdhbGwnLCB0aGlzLl9vbk1vZGVsRXZlbnQsIHRoaXMpO1xuXHRcdHRoaXMuX2J5Q2lkW21vZGVsLmNpZF0gPSBtb2RlbDtcblx0XHRpZiAobW9kZWwuaWQgIT0gbnVsbCkgdGhpcy5fYnlJZFttb2RlbC5pZF0gPSBtb2RlbDtcblx0fVxuXG5cdC8vIEluc2VydCBtb2RlbHMgaW50byB0aGUgY29sbGVjdGlvbiwgcmUtc29ydGluZyBpZiBuZWVkZWQsIGFuZCB0cmlnZ2VyaW5nXG5cdC8vIGBhZGRgIGV2ZW50cyB1bmxlc3Mgc2lsZW5jZWQuXG5cdHRoaXMubGVuZ3RoICs9IGxlbmd0aDtcblx0aW5kZXggPSBvcHRpb25zLmF0ICE9IG51bGwgPyBvcHRpb25zLmF0IDogdGhpcy5tb2RlbHMubGVuZ3RoO1xuXHRzcGxpY2UuYXBwbHkodGhpcy5tb2RlbHMsIFtpbmRleCwgMF0uY29uY2F0KG1vZGVscykpO1xuXHRpZiAodGhpcy5jb21wYXJhdG9yKSB0aGlzLnNvcnQoe3NpbGVudDogdHJ1ZX0pO1xuXHRpZiAob3B0aW9ucy5zaWxlbnQpIHJldHVybiB0aGlzO1xuXHRmb3IgKGkgPSAwLCBsZW5ndGggPSB0aGlzLm1vZGVscy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuXHRcdGlmICghY2lkc1sobW9kZWwgPSB0aGlzLm1vZGVsc1tpXSkuY2lkXSkgY29udGludWU7XG5cdFx0b3B0aW9ucy5pbmRleCA9IGk7XG5cdFx0bW9kZWwudHJpZ2dlcignYWRkJywgbW9kZWwsIHRoaXMsIG9wdGlvbnMpO1xuXHR9XG5cdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8vIFJlbW92ZSBhIG1vZGVsLCBvciBhIGxpc3Qgb2YgbW9kZWxzIGZyb20gdGhlIHNldC4gUGFzcyBzaWxlbnQgdG8gYXZvaWRcblx0Ly8gZmlyaW5nIHRoZSBgcmVtb3ZlYCBldmVudCBmb3IgZXZlcnkgbW9kZWwgcmVtb3ZlZC5cblx0cmVtb3ZlOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcblx0dmFyIGksIGwsIGluZGV4LCBtb2RlbDtcblx0b3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcblx0bW9kZWxzID0gXy5pc0FycmF5KG1vZGVscykgPyBtb2RlbHMuc2xpY2UoKSA6IFttb2RlbHNdO1xuXHRmb3IgKGkgPSAwLCBsID0gbW9kZWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdG1vZGVsID0gdGhpcy5nZXRCeUNpZChtb2RlbHNbaV0pIHx8IHRoaXMuZ2V0KG1vZGVsc1tpXSk7XG5cdFx0aWYgKCFtb2RlbCkgY29udGludWU7XG5cdFx0ZGVsZXRlIHRoaXMuX2J5SWRbbW9kZWwuaWRdO1xuXHRcdGRlbGV0ZSB0aGlzLl9ieUNpZFttb2RlbC5jaWRdO1xuXHRcdGluZGV4ID0gdGhpcy5pbmRleE9mKG1vZGVsKTtcblx0XHR0aGlzLm1vZGVscy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdHRoaXMubGVuZ3RoLS07XG5cdFx0aWYgKCFvcHRpb25zLnNpbGVudCkge1xuXHRcdG9wdGlvbnMuaW5kZXggPSBpbmRleDtcblx0XHRtb2RlbC50cmlnZ2VyKCdyZW1vdmUnLCBtb2RlbCwgdGhpcywgb3B0aW9ucyk7XG5cdFx0fVxuXHRcdHRoaXMuX3JlbW92ZVJlZmVyZW5jZShtb2RlbCk7XG5cdH1cblx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Ly8gQWRkIGEgbW9kZWwgdG8gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cblx0cHVzaDogZnVuY3Rpb24obW9kZWwsIG9wdGlvbnMpIHtcblx0bW9kZWwgPSB0aGlzLl9wcmVwYXJlTW9kZWwobW9kZWwsIG9wdGlvbnMpO1xuXHR0aGlzLmFkZChtb2RlbCwgb3B0aW9ucyk7XG5cdHJldHVybiBtb2RlbDtcblx0fSxcblxuXHQvLyBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG5cdHBvcDogZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXIgbW9kZWwgPSB0aGlzLmF0KHRoaXMubGVuZ3RoIC0gMSk7XG5cdHRoaXMucmVtb3ZlKG1vZGVsLCBvcHRpb25zKTtcblx0cmV0dXJuIG1vZGVsO1xuXHR9LFxuXG5cdC8vIEFkZCBhIG1vZGVsIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG5cdHVuc2hpZnQ6IGZ1bmN0aW9uKG1vZGVsLCBvcHRpb25zKSB7XG5cdG1vZGVsID0gdGhpcy5fcHJlcGFyZU1vZGVsKG1vZGVsLCBvcHRpb25zKTtcblx0dGhpcy5hZGQobW9kZWwsIF8uZXh0ZW5kKHthdDogMH0sIG9wdGlvbnMpKTtcblx0cmV0dXJuIG1vZGVsO1xuXHR9LFxuXG5cdC8vIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cblx0c2hpZnQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyIG1vZGVsID0gdGhpcy5hdCgwKTtcblx0dGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuXHRyZXR1cm4gbW9kZWw7XG5cdH0sXG5cblx0Ly8gR2V0IGEgbW9kZWwgZnJvbSB0aGUgc2V0IGJ5IGlkLlxuXHRnZXQ6IGZ1bmN0aW9uKGlkKSB7XG5cdGlmIChpZCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuXHRyZXR1cm4gdGhpcy5fYnlJZFtpZC5pZCAhPSBudWxsID8gaWQuaWQgOiBpZF07XG5cdH0sXG5cblx0Ly8gR2V0IGEgbW9kZWwgZnJvbSB0aGUgc2V0IGJ5IGNsaWVudCBpZC5cblx0Z2V0QnlDaWQ6IGZ1bmN0aW9uKGNpZCkge1xuXHRyZXR1cm4gY2lkICYmIHRoaXMuX2J5Q2lkW2NpZC5jaWQgfHwgY2lkXTtcblx0fSxcblxuXHQvLyBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC5cblx0YXQ6IGZ1bmN0aW9uKGluZGV4KSB7XG5cdHJldHVybiB0aGlzLm1vZGVsc1tpbmRleF07XG5cdH0sXG5cblx0Ly8gUmV0dXJuIG1vZGVscyB3aXRoIG1hdGNoaW5nIGF0dHJpYnV0ZXMuIFVzZWZ1bCBmb3Igc2ltcGxlIGNhc2VzIG9mIGBmaWx0ZXJgLlxuXHR3aGVyZTogZnVuY3Rpb24oYXR0cnMpIHtcblx0aWYgKF8uaXNFbXB0eShhdHRycykpIHJldHVybiBbXTtcblx0cmV0dXJuIHRoaXMuZmlsdGVyKGZ1bmN0aW9uKG1vZGVsKSB7XG5cdFx0Zm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG5cdFx0aWYgKGF0dHJzW2tleV0gIT09IG1vZGVsLmdldChrZXkpKSByZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9KTtcblx0fSxcblxuXHQvLyBGb3JjZSB0aGUgY29sbGVjdGlvbiB0byByZS1zb3J0IGl0c2VsZi4gWW91IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIHVuZGVyXG5cdC8vIG5vcm1hbCBjaXJjdW1zdGFuY2VzLCBhcyB0aGUgc2V0IHdpbGwgbWFpbnRhaW4gc29ydCBvcmRlciBhcyBlYWNoIGl0ZW1cblx0Ly8gaXMgYWRkZWQuXG5cdHNvcnQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0b3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcblx0aWYgKCF0aGlzLmNvbXBhcmF0b3IpIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHNvcnQgYSBzZXQgd2l0aG91dCBhIGNvbXBhcmF0b3InKTtcblx0dmFyIGJvdW5kQ29tcGFyYXRvciA9IF8uYmluZCh0aGlzLmNvbXBhcmF0b3IsIHRoaXMpO1xuXHRpZiAodGhpcy5jb21wYXJhdG9yLmxlbmd0aCA9PSAxKSB7XG5cdFx0dGhpcy5tb2RlbHMgPSB0aGlzLnNvcnRCeShib3VuZENvbXBhcmF0b3IpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMubW9kZWxzLnNvcnQoYm91bmRDb21wYXJhdG9yKTtcblx0fVxuXHRpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLnRyaWdnZXIoJ3Jlc2V0JywgdGhpcywgb3B0aW9ucyk7XG5cdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8vIFBsdWNrIGFuIGF0dHJpYnV0ZSBmcm9tIGVhY2ggbW9kZWwgaW4gdGhlIGNvbGxlY3Rpb24uXG5cdHBsdWNrOiBmdW5jdGlvbihhdHRyKSB7XG5cdHJldHVybiBfLm1hcCh0aGlzLm1vZGVscywgZnVuY3Rpb24obW9kZWwpeyByZXR1cm4gbW9kZWwuZ2V0KGF0dHIpOyB9KTtcblx0fSxcblxuXHQvLyBXaGVuIHlvdSBoYXZlIG1vcmUgaXRlbXMgdGhhbiB5b3Ugd2FudCB0byBhZGQgb3IgcmVtb3ZlIGluZGl2aWR1YWxseSxcblx0Ly8geW91IGNhbiByZXNldCB0aGUgZW50aXJlIHNldCB3aXRoIGEgbmV3IGxpc3Qgb2YgbW9kZWxzLCB3aXRob3V0IGZpcmluZ1xuXHQvLyBhbnkgYGFkZGAgb3IgYHJlbW92ZWAgZXZlbnRzLiBGaXJlcyBgcmVzZXRgIHdoZW4gZmluaXNoZWQuXG5cdHJlc2V0OiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcblx0bW9kZWxzICB8fCAobW9kZWxzID0gW10pO1xuXHRvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXHRmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMubW9kZWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdHRoaXMuX3JlbW92ZVJlZmVyZW5jZSh0aGlzLm1vZGVsc1tpXSk7XG5cdH1cblx0dGhpcy5fcmVzZXQoKTtcblx0dGhpcy5hZGQobW9kZWxzLCBfLmV4dGVuZCh7c2lsZW50OiB0cnVlfSwgb3B0aW9ucykpO1xuXHRpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLnRyaWdnZXIoJ3Jlc2V0JywgdGhpcywgb3B0aW9ucyk7XG5cdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8vIEZldGNoIHRoZSBkZWZhdWx0IHNldCBvZiBtb2RlbHMgZm9yIHRoaXMgY29sbGVjdGlvbiwgcmVzZXR0aW5nIHRoZVxuXHQvLyBjb2xsZWN0aW9uIHdoZW4gdGhleSBhcnJpdmUuIElmIGBhZGQ6IHRydWVgIGlzIHBhc3NlZCwgYXBwZW5kcyB0aGVcblx0Ly8gbW9kZWxzIHRvIHRoZSBjb2xsZWN0aW9uIGluc3RlYWQgb2YgcmVzZXR0aW5nLlxuXHRmZXRjaDogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRpb25zID0gb3B0aW9ucyA/IF8uY2xvbmUob3B0aW9ucykgOiB7fTtcblx0aWYgKG9wdGlvbnMucGFyc2UgPT09IHVuZGVmaW5lZCkgb3B0aW9ucy5wYXJzZSA9IHRydWU7XG5cdHZhciBjb2xsZWN0aW9uID0gdGhpcztcblx0dmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG5cdG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3AsIHN0YXR1cywgeGhyKSB7XG5cdFx0Y29sbGVjdGlvbltvcHRpb25zLmFkZCA/ICdhZGQnIDogJ3Jlc2V0J10oY29sbGVjdGlvbi5wYXJzZShyZXNwLCB4aHIpLCBvcHRpb25zKTtcblx0XHRpZiAoc3VjY2Vzcykgc3VjY2Vzcyhjb2xsZWN0aW9uLCByZXNwKTtcblx0fTtcblx0b3B0aW9ucy5lcnJvciA9IEJhY2tib25lLndyYXBFcnJvcihvcHRpb25zLmVycm9yLCBjb2xsZWN0aW9uLCBvcHRpb25zKTtcblx0cmV0dXJuICh0aGlzLnN5bmMgfHwgQmFja2JvbmUuc3luYykuY2FsbCh0aGlzLCAncmVhZCcsIHRoaXMsIG9wdGlvbnMpO1xuXHR9LFxuXG5cdC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBhIG1vZGVsIGluIHRoaXMgY29sbGVjdGlvbi4gQWRkIHRoZSBtb2RlbCB0byB0aGVcblx0Ly8gY29sbGVjdGlvbiBpbW1lZGlhdGVseSwgdW5sZXNzIGB3YWl0OiB0cnVlYCBpcyBwYXNzZWQsIGluIHdoaWNoIGNhc2Ugd2Vcblx0Ly8gd2FpdCBmb3IgdGhlIHNlcnZlciB0byBhZ3JlZS5cblx0Y3JlYXRlOiBmdW5jdGlvbihtb2RlbCwgb3B0aW9ucykge1xuXHR2YXIgY29sbCA9IHRoaXM7XG5cdG9wdGlvbnMgPSBvcHRpb25zID8gXy5jbG9uZShvcHRpb25zKSA6IHt9O1xuXHRtb2RlbCA9IHRoaXMuX3ByZXBhcmVNb2RlbChtb2RlbCwgb3B0aW9ucyk7XG5cdGlmICghbW9kZWwpIHJldHVybiBmYWxzZTtcblx0aWYgKCFvcHRpb25zLndhaXQpIGNvbGwuYWRkKG1vZGVsLCBvcHRpb25zKTtcblx0dmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG5cdG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uKG5leHRNb2RlbCwgcmVzcCwgeGhyKSB7XG5cdFx0aWYgKG9wdGlvbnMud2FpdCkgY29sbC5hZGQobmV4dE1vZGVsLCBvcHRpb25zKTtcblx0XHRpZiAoc3VjY2Vzcykge1xuXHRcdHN1Y2Nlc3MobmV4dE1vZGVsLCByZXNwKTtcblx0XHR9IGVsc2Uge1xuXHRcdG5leHRNb2RlbC50cmlnZ2VyKCdzeW5jJywgbW9kZWwsIHJlc3AsIG9wdGlvbnMpO1xuXHRcdH1cblx0fTtcblx0bW9kZWwuc2F2ZShudWxsLCBvcHRpb25zKTtcblx0cmV0dXJuIG1vZGVsO1xuXHR9LFxuXG5cdC8vICoqcGFyc2UqKiBjb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gYSBsaXN0IG9mIG1vZGVscyB0byBiZSBhZGRlZCB0byB0aGVcblx0Ly8gY29sbGVjdGlvbi4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIGl0IHRocm91Z2guXG5cdHBhcnNlOiBmdW5jdGlvbihyZXNwLCB4aHIpIHtcblx0cmV0dXJuIHJlc3A7XG5cdH0sXG5cblx0Ly8gUHJveHkgdG8gXydzIGNoYWluLiBDYW4ndCBiZSBwcm94aWVkIHRoZSBzYW1lIHdheSB0aGUgcmVzdCBvZiB0aGVcblx0Ly8gdW5kZXJzY29yZSBtZXRob2RzIGFyZSBwcm94aWVkIGJlY2F1c2UgaXQgcmVsaWVzIG9uIHRoZSB1bmRlcnNjb3JlXG5cdC8vIGNvbnN0cnVjdG9yLlxuXHRjaGFpbjogZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gXyh0aGlzLm1vZGVscykuY2hhaW4oKTtcblx0fSxcblxuXHQvLyBSZXNldCBhbGwgaW50ZXJuYWwgc3RhdGUuIENhbGxlZCB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIHJlc2V0LlxuXHRfcmVzZXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dGhpcy5sZW5ndGggPSAwO1xuXHR0aGlzLm1vZGVscyA9IFtdO1xuXHR0aGlzLl9ieUlkICA9IHt9O1xuXHR0aGlzLl9ieUNpZCA9IHt9O1xuXHR9LFxuXG5cdC8vIFByZXBhcmUgYSBtb2RlbCBvciBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYWRkZWQgdG8gdGhpcyBjb2xsZWN0aW9uLlxuXHRfcHJlcGFyZU1vZGVsOiBmdW5jdGlvbihtb2RlbCwgb3B0aW9ucykge1xuXHRvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXHRpZiAoIShtb2RlbCBpbnN0YW5jZW9mIE1vZGVsKSkge1xuXHRcdHZhciBhdHRycyA9IG1vZGVsO1xuXHRcdG9wdGlvbnMuY29sbGVjdGlvbiA9IHRoaXM7XG5cdFx0bW9kZWwgPSBuZXcgdGhpcy5tb2RlbChhdHRycywgb3B0aW9ucyk7XG5cdFx0aWYgKCFtb2RlbC5fdmFsaWRhdGUobW9kZWwuYXR0cmlidXRlcywgb3B0aW9ucykpIG1vZGVsID0gZmFsc2U7XG5cdH0gZWxzZSBpZiAoIW1vZGVsLmNvbGxlY3Rpb24pIHtcblx0XHRtb2RlbC5jb2xsZWN0aW9uID0gdGhpcztcblx0fVxuXHRyZXR1cm4gbW9kZWw7XG5cdH0sXG5cblx0Ly8gSW50ZXJuYWwgbWV0aG9kIHRvIHJlbW92ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uXG5cdF9yZW1vdmVSZWZlcmVuY2U6IGZ1bmN0aW9uKG1vZGVsKSB7XG5cdGlmICh0aGlzID09IG1vZGVsLmNvbGxlY3Rpb24pIHtcblx0XHRkZWxldGUgbW9kZWwuY29sbGVjdGlvbjtcblx0fVxuXHRtb2RlbC5vZmYoJ2FsbCcsIHRoaXMuX29uTW9kZWxFdmVudCwgdGhpcyk7XG5cdH0sXG5cblx0Ly8gSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBldmVyeSB0aW1lIGEgbW9kZWwgaW4gdGhlIHNldCBmaXJlcyBhbiBldmVudC5cblx0Ly8gU2V0cyBuZWVkIHRvIHVwZGF0ZSB0aGVpciBpbmRleGVzIHdoZW4gbW9kZWxzIGNoYW5nZSBpZHMuIEFsbCBvdGhlclxuXHQvLyBldmVudHMgc2ltcGx5IHByb3h5IHRocm91Z2guIFwiYWRkXCIgYW5kIFwicmVtb3ZlXCIgZXZlbnRzIHRoYXQgb3JpZ2luYXRlXG5cdC8vIGluIG90aGVyIGNvbGxlY3Rpb25zIGFyZSBpZ25vcmVkLlxuXHRfb25Nb2RlbEV2ZW50OiBmdW5jdGlvbihldmVudCwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpIHtcblx0aWYgKChldmVudCA9PSAnYWRkJyB8fCBldmVudCA9PSAncmVtb3ZlJykgJiYgY29sbGVjdGlvbiAhPSB0aGlzKSByZXR1cm47XG5cdGlmIChldmVudCA9PSAnZGVzdHJveScpIHtcblx0XHR0aGlzLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG5cdH1cblx0aWYgKG1vZGVsICYmIGV2ZW50ID09PSAnY2hhbmdlOicgKyBtb2RlbC5pZEF0dHJpYnV0ZSkge1xuXHRcdGRlbGV0ZSB0aGlzLl9ieUlkW21vZGVsLnByZXZpb3VzKG1vZGVsLmlkQXR0cmlidXRlKV07XG5cdFx0dGhpcy5fYnlJZFttb2RlbC5pZF0gPSBtb2RlbDtcblx0fVxuXHR0aGlzLnRyaWdnZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0fVxuXG59KTtcblxuLy8gVW5kZXJzY29yZSBtZXRob2RzIHRoYXQgd2Ugd2FudCB0byBpbXBsZW1lbnQgb24gdGhlIENvbGxlY3Rpb24uXG52YXIgbWV0aG9kcyA9IFsnZm9yRWFjaCcsICdlYWNoJywgJ21hcCcsICdyZWR1Y2UnLCAncmVkdWNlUmlnaHQnLCAnZmluZCcsXG5cdCdkZXRlY3QnLCAnZmlsdGVyJywgJ3NlbGVjdCcsICdyZWplY3QnLCAnZXZlcnknLCAnYWxsJywgJ3NvbWUnLCAnYW55Jyxcblx0J2luY2x1ZGUnLCAnY29udGFpbnMnLCAnaW52b2tlJywgJ21heCcsICdtaW4nLCAnc29ydEJ5JywgJ3NvcnRlZEluZGV4Jyxcblx0J3RvQXJyYXknLCAnc2l6ZScsICdmaXJzdCcsICdpbml0aWFsJywgJ3Jlc3QnLCAnbGFzdCcsICd3aXRob3V0JywgJ2luZGV4T2YnLFxuXHQnc2h1ZmZsZScsICdsYXN0SW5kZXhPZicsICdpc0VtcHR5JywgJ2dyb3VwQnknXTtcblxuLy8gTWl4IGluIGVhY2ggVW5kZXJzY29yZSBtZXRob2QgYXMgYSBwcm94eSB0byBgQ29sbGVjdGlvbiNtb2RlbHNgLlxuXy5lYWNoKG1ldGhvZHMsIGZ1bmN0aW9uKG1ldGhvZCkge1xuXHRDb2xsZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBfW21ldGhvZF0uYXBwbHkoXywgW3RoaXMubW9kZWxzXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykpKTtcblx0fTtcbn0pO1xuXG4vLyBCYWNrYm9uZS5Sb3V0ZXJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gUm91dGVycyBtYXAgZmF1eC1VUkxzIHRvIGFjdGlvbnMsIGFuZCBmaXJlIGV2ZW50cyB3aGVuIHJvdXRlcyBhcmVcbi8vIG1hdGNoZWQuIENyZWF0aW5nIGEgbmV3IG9uZSBzZXRzIGl0cyBgcm91dGVzYCBoYXNoLCBpZiBub3Qgc2V0IHN0YXRpY2FsbHkuXG52YXIgUm91dGVyID0gQmFja2JvbmUuUm91dGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXHRpZiAob3B0aW9ucy5yb3V0ZXMpIHRoaXMucm91dGVzID0gb3B0aW9ucy5yb3V0ZXM7XG5cdHRoaXMuX2JpbmRSb3V0ZXMoKTtcblx0dGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vLyBDYWNoZWQgcmVndWxhciBleHByZXNzaW9ucyBmb3IgbWF0Y2hpbmcgbmFtZWQgcGFyYW0gcGFydHMgYW5kIHNwbGF0dGVkXG4vLyBwYXJ0cyBvZiByb3V0ZSBzdHJpbmdzLlxudmFyIG5hbWVkUGFyYW0gICAgPSAvOlxcdysvZztcbnZhciBzcGxhdFBhcmFtICAgID0gL1xcKlxcdysvZztcbnZhciBlc2NhcGVSZWdFeHAgID0gL1stW1xcXXt9KCkrPy4sXFxcXF4kfCNcXHNdL2c7XG5cbi8vIFNldCB1cCBhbGwgaW5oZXJpdGFibGUgKipCYWNrYm9uZS5Sb3V0ZXIqKiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzLlxuXy5leHRlbmQoUm91dGVyLnByb3RvdHlwZSwgRXZlbnRzLCB7XG5cblx0Ly8gSW5pdGlhbGl6ZSBpcyBhbiBlbXB0eSBmdW5jdGlvbiBieSBkZWZhdWx0LiBPdmVycmlkZSBpdCB3aXRoIHlvdXIgb3duXG5cdC8vIGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpe30sXG5cblx0Ly8gTWFudWFsbHkgYmluZCBhIHNpbmdsZSBuYW1lZCByb3V0ZSB0byBhIGNhbGxiYWNrLiBGb3IgZXhhbXBsZTpcblx0Ly9cblx0Ly8gICAgIHRoaXMucm91dGUoJ3NlYXJjaC86cXVlcnkvcDpudW0nLCAnc2VhcmNoJywgZnVuY3Rpb24ocXVlcnksIG51bSkge1xuXHQvLyAgICAgICAuLi5cblx0Ly8gICAgIH0pO1xuXHQvL1xuXHRyb3V0ZTogZnVuY3Rpb24ocm91dGUsIG5hbWUsIGNhbGxiYWNrKSB7XG5cdEJhY2tib25lLmhpc3RvcnkgfHwgKEJhY2tib25lLmhpc3RvcnkgPSBuZXcgSGlzdG9yeSk7XG5cdGlmICghXy5pc1JlZ0V4cChyb3V0ZSkpIHJvdXRlID0gdGhpcy5fcm91dGVUb1JlZ0V4cChyb3V0ZSk7XG5cdGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gdGhpc1tuYW1lXTtcblx0QmFja2JvbmUuaGlzdG9yeS5yb3V0ZShyb3V0ZSwgXy5iaW5kKGZ1bmN0aW9uKGZyYWdtZW50KSB7XG5cdFx0dmFyIGFyZ3MgPSB0aGlzLl9leHRyYWN0UGFyYW1ldGVycyhyb3V0ZSwgZnJhZ21lbnQpO1xuXHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdHRoaXMudHJpZ2dlci5hcHBseSh0aGlzLCBbJ3JvdXRlOicgKyBuYW1lXS5jb25jYXQoYXJncykpO1xuXHRcdEJhY2tib25lLmhpc3RvcnkudHJpZ2dlcigncm91dGUnLCB0aGlzLCBuYW1lLCBhcmdzKTtcblx0fSwgdGhpcykpO1xuXHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvLyBTaW1wbGUgcHJveHkgdG8gYEJhY2tib25lLmhpc3RvcnlgIHRvIHNhdmUgYSBmcmFnbWVudCBpbnRvIHRoZSBoaXN0b3J5LlxuXHRuYXZpZ2F0ZTogZnVuY3Rpb24oZnJhZ21lbnQsIG9wdGlvbnMpIHtcblx0QmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZShmcmFnbWVudCwgb3B0aW9ucyk7XG5cdH0sXG5cblx0Ly8gQmluZCBhbGwgZGVmaW5lZCByb3V0ZXMgdG8gYEJhY2tib25lLmhpc3RvcnlgLiBXZSBoYXZlIHRvIHJldmVyc2UgdGhlXG5cdC8vIG9yZGVyIG9mIHRoZSByb3V0ZXMgaGVyZSB0byBzdXBwb3J0IGJlaGF2aW9yIHdoZXJlIHRoZSBtb3N0IGdlbmVyYWxcblx0Ly8gcm91dGVzIGNhbiBiZSBkZWZpbmVkIGF0IHRoZSBib3R0b20gb2YgdGhlIHJvdXRlIG1hcC5cblx0X2JpbmRSb3V0ZXM6IGZ1bmN0aW9uKCkge1xuXHRpZiAoIXRoaXMucm91dGVzKSByZXR1cm47XG5cdHZhciByb3V0ZXMgPSBbXTtcblx0Zm9yICh2YXIgcm91dGUgaW4gdGhpcy5yb3V0ZXMpIHtcblx0XHRyb3V0ZXMudW5zaGlmdChbcm91dGUsIHRoaXMucm91dGVzW3JvdXRlXV0pO1xuXHR9XG5cdGZvciAodmFyIGkgPSAwLCBsID0gcm91dGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdHRoaXMucm91dGUocm91dGVzW2ldWzBdLCByb3V0ZXNbaV1bMV0sIHRoaXNbcm91dGVzW2ldWzFdXSk7XG5cdH1cblx0fSxcblxuXHQvLyBDb252ZXJ0IGEgcm91dGUgc3RyaW5nIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24sIHN1aXRhYmxlIGZvciBtYXRjaGluZ1xuXHQvLyBhZ2FpbnN0IHRoZSBjdXJyZW50IGxvY2F0aW9uIGhhc2guXG5cdF9yb3V0ZVRvUmVnRXhwOiBmdW5jdGlvbihyb3V0ZSkge1xuXHRyb3V0ZSA9IHJvdXRlLnJlcGxhY2UoZXNjYXBlUmVnRXhwLCAnXFxcXCQmJylcblx0XHRcdFx0LnJlcGxhY2UobmFtZWRQYXJhbSwgJyhbXlxcL10rKScpXG5cdFx0XHRcdC5yZXBsYWNlKHNwbGF0UGFyYW0sICcoLio/KScpO1xuXHRyZXR1cm4gbmV3IFJlZ0V4cCgnXicgKyByb3V0ZSArICckJyk7XG5cdH0sXG5cblx0Ly8gR2l2ZW4gYSByb3V0ZSwgYW5kIGEgVVJMIGZyYWdtZW50IHRoYXQgaXQgbWF0Y2hlcywgcmV0dXJuIHRoZSBhcnJheSBvZlxuXHQvLyBleHRyYWN0ZWQgcGFyYW1ldGVycy5cblx0X2V4dHJhY3RQYXJhbWV0ZXJzOiBmdW5jdGlvbihyb3V0ZSwgZnJhZ21lbnQpIHtcblx0cmV0dXJuIHJvdXRlLmV4ZWMoZnJhZ21lbnQpLnNsaWNlKDEpO1xuXHR9XG5cbn0pO1xuXG4vLyBCYWNrYm9uZS5IaXN0b3J5XG4vLyAtLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEhhbmRsZXMgY3Jvc3MtYnJvd3NlciBoaXN0b3J5IG1hbmFnZW1lbnQsIGJhc2VkIG9uIFVSTCBmcmFnbWVudHMuIElmIHRoZVxuLy8gYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGBvbmhhc2hjaGFuZ2VgLCBmYWxscyBiYWNrIHRvIHBvbGxpbmcuXG52YXIgSGlzdG9yeSA9IEJhY2tib25lLkhpc3RvcnkgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5oYW5kbGVycyA9IFtdO1xuXHRfLmJpbmRBbGwodGhpcywgJ2NoZWNrVXJsJyk7XG59O1xuXG4vLyBDYWNoZWQgcmVnZXggZm9yIGNsZWFuaW5nIGxlYWRpbmcgaGFzaGVzIGFuZCBzbGFzaGVzIC5cbnZhciByb3V0ZVN0cmlwcGVyID0gL15bI1xcL10vO1xuXG4vLyBDYWNoZWQgcmVnZXggZm9yIGRldGVjdGluZyBNU0lFLlxudmFyIGlzRXhwbG9yZXIgPSAvbXNpZSBbXFx3Ll0rLztcblxuLy8gSGFzIHRoZSBoaXN0b3J5IGhhbmRsaW5nIGFscmVhZHkgYmVlbiBzdGFydGVkP1xuSGlzdG9yeS5zdGFydGVkID0gZmFsc2U7XG5cbi8vIFNldCB1cCBhbGwgaW5oZXJpdGFibGUgKipCYWNrYm9uZS5IaXN0b3J5KiogcHJvcGVydGllcyBhbmQgbWV0aG9kcy5cbl8uZXh0ZW5kKEhpc3RvcnkucHJvdG90eXBlLCBFdmVudHMsIHtcblxuXHQvLyBUaGUgZGVmYXVsdCBpbnRlcnZhbCB0byBwb2xsIGZvciBoYXNoIGNoYW5nZXMsIGlmIG5lY2Vzc2FyeSwgaXNcblx0Ly8gdHdlbnR5IHRpbWVzIGEgc2Vjb25kLlxuXHRpbnRlcnZhbDogNTAsXG5cblx0Ly8gR2V0cyB0aGUgdHJ1ZSBoYXNoIHZhbHVlLiBDYW5ub3QgdXNlIGxvY2F0aW9uLmhhc2ggZGlyZWN0bHkgZHVlIHRvIGJ1Z1xuXHQvLyBpbiBGaXJlZm94IHdoZXJlIGxvY2F0aW9uLmhhc2ggd2lsbCBhbHdheXMgYmUgZGVjb2RlZC5cblx0Z2V0SGFzaDogZnVuY3Rpb24od2luZG93T3ZlcnJpZGUpIHtcblx0dmFyIGxvYyA9IHdpbmRvd092ZXJyaWRlID8gd2luZG93T3ZlcnJpZGUubG9jYXRpb24gOiB3aW5kb3cubG9jYXRpb247XG5cdHZhciBtYXRjaCA9IGxvYy5ocmVmLm1hdGNoKC8jKC4qKSQvKTtcblx0cmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiAnJztcblx0fSxcblxuXHQvLyBHZXQgdGhlIGNyb3NzLWJyb3dzZXIgbm9ybWFsaXplZCBVUkwgZnJhZ21lbnQsIGVpdGhlciBmcm9tIHRoZSBVUkwsXG5cdC8vIHRoZSBoYXNoLCBvciB0aGUgb3ZlcnJpZGUuXG5cdGdldEZyYWdtZW50OiBmdW5jdGlvbihmcmFnbWVudCwgZm9yY2VQdXNoU3RhdGUpIHtcblx0aWYgKGZyYWdtZW50ID09IG51bGwpIHtcblx0XHRpZiAodGhpcy5faGFzUHVzaFN0YXRlIHx8IGZvcmNlUHVzaFN0YXRlKSB7XG5cdFx0ZnJhZ21lbnQgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG5cdFx0dmFyIHNlYXJjaCA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2g7XG5cdFx0aWYgKHNlYXJjaCkgZnJhZ21lbnQgKz0gc2VhcmNoO1xuXHRcdH0gZWxzZSB7XG5cdFx0ZnJhZ21lbnQgPSB0aGlzLmdldEhhc2goKTtcblx0XHR9XG5cdH1cblx0aWYgKCFmcmFnbWVudC5pbmRleE9mKHRoaXMub3B0aW9ucy5yb290KSkgZnJhZ21lbnQgPSBmcmFnbWVudC5zdWJzdHIodGhpcy5vcHRpb25zLnJvb3QubGVuZ3RoKTtcblx0cmV0dXJuIGZyYWdtZW50LnJlcGxhY2Uocm91dGVTdHJpcHBlciwgJycpO1xuXHR9LFxuXG5cdC8vIFN0YXJ0IHRoZSBoYXNoIGNoYW5nZSBoYW5kbGluZywgcmV0dXJuaW5nIGB0cnVlYCBpZiB0aGUgY3VycmVudCBVUkwgbWF0Y2hlc1xuXHQvLyBhbiBleGlzdGluZyByb3V0ZSwgYW5kIGBmYWxzZWAgb3RoZXJ3aXNlLlxuXHRzdGFydDogZnVuY3Rpb24ob3B0aW9ucykge1xuXHRpZiAoSGlzdG9yeS5zdGFydGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJCYWNrYm9uZS5oaXN0b3J5IGhhcyBhbHJlYWR5IGJlZW4gc3RhcnRlZFwiKTtcblx0SGlzdG9yeS5zdGFydGVkID0gdHJ1ZTtcblxuXHQvLyBGaWd1cmUgb3V0IHRoZSBpbml0aWFsIGNvbmZpZ3VyYXRpb24uIERvIHdlIG5lZWQgYW4gaWZyYW1lP1xuXHQvLyBJcyBwdXNoU3RhdGUgZGVzaXJlZCAuLi4gaXMgaXQgYXZhaWxhYmxlP1xuXHR0aGlzLm9wdGlvbnMgICAgICAgICAgPSBfLmV4dGVuZCh7fSwge3Jvb3Q6ICcvJ30sIHRoaXMub3B0aW9ucywgb3B0aW9ucyk7XG5cdHRoaXMuX3dhbnRzSGFzaENoYW5nZSA9IHRoaXMub3B0aW9ucy5oYXNoQ2hhbmdlICE9PSBmYWxzZTtcblx0dGhpcy5fd2FudHNQdXNoU3RhdGUgID0gISF0aGlzLm9wdGlvbnMucHVzaFN0YXRlO1xuXHR0aGlzLl9oYXNQdXNoU3RhdGUgICAgPSAhISh0aGlzLm9wdGlvbnMucHVzaFN0YXRlICYmIHdpbmRvdy5oaXN0b3J5ICYmIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSk7XG5cdHZhciBmcmFnbWVudCAgICAgICAgICA9IHRoaXMuZ2V0RnJhZ21lbnQoKTtcblx0dmFyIGRvY01vZGUgICAgICAgICAgID0gZG9jdW1lbnQuZG9jdW1lbnRNb2RlO1xuXHR2YXIgb2xkSUUgICAgICAgICAgICAgPSAoaXNFeHBsb3Jlci5leGVjKG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSkgJiYgKCFkb2NNb2RlIHx8IGRvY01vZGUgPD0gNykpO1xuXG5cdGlmIChvbGRJRSkge1xuXHRcdHRoaXMuaWZyYW1lID0gJCgnPGlmcmFtZSBzcmM9XCJqYXZhc2NyaXB0OjBcIiB0YWJpbmRleD1cIi0xXCIgLz4nKS5oaWRlKCkuYXBwZW5kVG8oJ2JvZHknKVswXS5jb250ZW50V2luZG93O1xuXHRcdHRoaXMubmF2aWdhdGUoZnJhZ21lbnQpO1xuXHR9XG5cblx0Ly8gRGVwZW5kaW5nIG9uIHdoZXRoZXIgd2UncmUgdXNpbmcgcHVzaFN0YXRlIG9yIGhhc2hlcywgYW5kIHdoZXRoZXJcblx0Ly8gJ29uaGFzaGNoYW5nZScgaXMgc3VwcG9ydGVkLCBkZXRlcm1pbmUgaG93IHdlIGNoZWNrIHRoZSBVUkwgc3RhdGUuXG5cdGlmICh0aGlzLl9oYXNQdXNoU3RhdGUpIHtcblx0XHQkKHdpbmRvdykuYmluZCgncG9wc3RhdGUnLCB0aGlzLmNoZWNrVXJsKTtcblx0fSBlbHNlIGlmICh0aGlzLl93YW50c0hhc2hDaGFuZ2UgJiYgKCdvbmhhc2hjaGFuZ2UnIGluIHdpbmRvdykgJiYgIW9sZElFKSB7XG5cdFx0JCh3aW5kb3cpLmJpbmQoJ2hhc2hjaGFuZ2UnLCB0aGlzLmNoZWNrVXJsKTtcblx0fSBlbHNlIGlmICh0aGlzLl93YW50c0hhc2hDaGFuZ2UpIHtcblx0XHR0aGlzLl9jaGVja1VybEludGVydmFsID0gc2V0SW50ZXJ2YWwodGhpcy5jaGVja1VybCwgdGhpcy5pbnRlcnZhbCk7XG5cdH1cblxuXHQvLyBEZXRlcm1pbmUgaWYgd2UgbmVlZCB0byBjaGFuZ2UgdGhlIGJhc2UgdXJsLCBmb3IgYSBwdXNoU3RhdGUgbGlua1xuXHQvLyBvcGVuZWQgYnkgYSBub24tcHVzaFN0YXRlIGJyb3dzZXIuXG5cdHRoaXMuZnJhZ21lbnQgPSBmcmFnbWVudDtcblx0dmFyIGxvYyA9IHdpbmRvdy5sb2NhdGlvbjtcblx0dmFyIGF0Um9vdCAgPSBsb2MucGF0aG5hbWUgPT0gdGhpcy5vcHRpb25zLnJvb3Q7XG5cblx0Ly8gSWYgd2UndmUgc3RhcnRlZCBvZmYgd2l0aCBhIHJvdXRlIGZyb20gYSBgcHVzaFN0YXRlYC1lbmFibGVkIGJyb3dzZXIsXG5cdC8vIGJ1dCB3ZSdyZSBjdXJyZW50bHkgaW4gYSBicm93c2VyIHRoYXQgZG9lc24ndCBzdXBwb3J0IGl0Li4uXG5cdGlmICh0aGlzLl93YW50c0hhc2hDaGFuZ2UgJiYgdGhpcy5fd2FudHNQdXNoU3RhdGUgJiYgIXRoaXMuX2hhc1B1c2hTdGF0ZSAmJiAhYXRSb290KSB7XG5cdFx0dGhpcy5mcmFnbWVudCA9IHRoaXMuZ2V0RnJhZ21lbnQobnVsbCwgdHJ1ZSk7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UodGhpcy5vcHRpb25zLnJvb3QgKyAnIycgKyB0aGlzLmZyYWdtZW50KTtcblx0XHQvLyBSZXR1cm4gaW1tZWRpYXRlbHkgYXMgYnJvd3NlciB3aWxsIGRvIHJlZGlyZWN0IHRvIG5ldyB1cmxcblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHQvLyBPciBpZiB3ZSd2ZSBzdGFydGVkIG91dCB3aXRoIGEgaGFzaC1iYXNlZCByb3V0ZSwgYnV0IHdlJ3JlIGN1cnJlbnRseVxuXHQvLyBpbiBhIGJyb3dzZXIgd2hlcmUgaXQgY291bGQgYmUgYHB1c2hTdGF0ZWAtYmFzZWQgaW5zdGVhZC4uLlxuXHR9IGVsc2UgaWYgKHRoaXMuX3dhbnRzUHVzaFN0YXRlICYmIHRoaXMuX2hhc1B1c2hTdGF0ZSAmJiBhdFJvb3QgJiYgbG9jLmhhc2gpIHtcblx0XHR0aGlzLmZyYWdtZW50ID0gdGhpcy5nZXRIYXNoKCkucmVwbGFjZShyb3V0ZVN0cmlwcGVyLCAnJyk7XG5cdFx0d2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgbG9jLnByb3RvY29sICsgJy8vJyArIGxvYy5ob3N0ICsgdGhpcy5vcHRpb25zLnJvb3QgKyB0aGlzLmZyYWdtZW50KTtcblx0fVxuXG5cdGlmICghdGhpcy5vcHRpb25zLnNpbGVudCkge1xuXHRcdHJldHVybiB0aGlzLmxvYWRVcmwoKTtcblx0fVxuXHR9LFxuXG5cdC8vIERpc2FibGUgQmFja2JvbmUuaGlzdG9yeSwgcGVyaGFwcyB0ZW1wb3JhcmlseS4gTm90IHVzZWZ1bCBpbiBhIHJlYWwgYXBwLFxuXHQvLyBidXQgcG9zc2libHkgdXNlZnVsIGZvciB1bml0IHRlc3RpbmcgUm91dGVycy5cblx0c3RvcDogZnVuY3Rpb24oKSB7XG5cdCQod2luZG93KS51bmJpbmQoJ3BvcHN0YXRlJywgdGhpcy5jaGVja1VybCkudW5iaW5kKCdoYXNoY2hhbmdlJywgdGhpcy5jaGVja1VybCk7XG5cdGNsZWFySW50ZXJ2YWwodGhpcy5fY2hlY2tVcmxJbnRlcnZhbCk7XG5cdEhpc3Rvcnkuc3RhcnRlZCA9IGZhbHNlO1xuXHR9LFxuXG5cdC8vIEFkZCBhIHJvdXRlIHRvIGJlIHRlc3RlZCB3aGVuIHRoZSBmcmFnbWVudCBjaGFuZ2VzLiBSb3V0ZXMgYWRkZWQgbGF0ZXJcblx0Ly8gbWF5IG92ZXJyaWRlIHByZXZpb3VzIHJvdXRlcy5cblx0cm91dGU6IGZ1bmN0aW9uKHJvdXRlLCBjYWxsYmFjaykge1xuXHR0aGlzLmhhbmRsZXJzLnVuc2hpZnQoe3JvdXRlOiByb3V0ZSwgY2FsbGJhY2s6IGNhbGxiYWNrfSk7XG5cdH0sXG5cblx0Ly8gQ2hlY2tzIHRoZSBjdXJyZW50IFVSTCB0byBzZWUgaWYgaXQgaGFzIGNoYW5nZWQsIGFuZCBpZiBpdCBoYXMsXG5cdC8vIGNhbGxzIGBsb2FkVXJsYCwgbm9ybWFsaXppbmcgYWNyb3NzIHRoZSBoaWRkZW4gaWZyYW1lLlxuXHRjaGVja1VybDogZnVuY3Rpb24oZSkge1xuXHR2YXIgY3VycmVudCA9IHRoaXMuZ2V0RnJhZ21lbnQoKTtcblx0aWYgKGN1cnJlbnQgPT0gdGhpcy5mcmFnbWVudCAmJiB0aGlzLmlmcmFtZSkgY3VycmVudCA9IHRoaXMuZ2V0RnJhZ21lbnQodGhpcy5nZXRIYXNoKHRoaXMuaWZyYW1lKSk7XG5cdGlmIChjdXJyZW50ID09IHRoaXMuZnJhZ21lbnQpIHJldHVybiBmYWxzZTtcblx0aWYgKHRoaXMuaWZyYW1lKSB0aGlzLm5hdmlnYXRlKGN1cnJlbnQpO1xuXHR0aGlzLmxvYWRVcmwoKSB8fCB0aGlzLmxvYWRVcmwodGhpcy5nZXRIYXNoKCkpO1xuXHR9LFxuXG5cdC8vIEF0dGVtcHQgdG8gbG9hZCB0aGUgY3VycmVudCBVUkwgZnJhZ21lbnQuIElmIGEgcm91dGUgc3VjY2VlZHMgd2l0aCBhXG5cdC8vIG1hdGNoLCByZXR1cm5zIGB0cnVlYC4gSWYgbm8gZGVmaW5lZCByb3V0ZXMgbWF0Y2hlcyB0aGUgZnJhZ21lbnQsXG5cdC8vIHJldHVybnMgYGZhbHNlYC5cblx0bG9hZFVybDogZnVuY3Rpb24oZnJhZ21lbnRPdmVycmlkZSkge1xuXHR2YXIgZnJhZ21lbnQgPSB0aGlzLmZyYWdtZW50ID0gdGhpcy5nZXRGcmFnbWVudChmcmFnbWVudE92ZXJyaWRlKTtcblx0dmFyIG1hdGNoZWQgPSBfLmFueSh0aGlzLmhhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0aWYgKGhhbmRsZXIucm91dGUudGVzdChmcmFnbWVudCkpIHtcblx0XHRoYW5kbGVyLmNhbGxiYWNrKGZyYWdtZW50KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH0pO1xuXHRyZXR1cm4gbWF0Y2hlZDtcblx0fSxcblxuXHQvLyBTYXZlIGEgZnJhZ21lbnQgaW50byB0aGUgaGFzaCBoaXN0b3J5LCBvciByZXBsYWNlIHRoZSBVUkwgc3RhdGUgaWYgdGhlXG5cdC8vICdyZXBsYWNlJyBvcHRpb24gaXMgcGFzc2VkLiBZb3UgYXJlIHJlc3BvbnNpYmxlIGZvciBwcm9wZXJseSBVUkwtZW5jb2Rpbmdcblx0Ly8gdGhlIGZyYWdtZW50IGluIGFkdmFuY2UuXG5cdC8vXG5cdC8vIFRoZSBvcHRpb25zIG9iamVjdCBjYW4gY29udGFpbiBgdHJpZ2dlcjogdHJ1ZWAgaWYgeW91IHdpc2ggdG8gaGF2ZSB0aGVcblx0Ly8gcm91dGUgY2FsbGJhY2sgYmUgZmlyZWQgKG5vdCB1c3VhbGx5IGRlc2lyYWJsZSksIG9yIGByZXBsYWNlOiB0cnVlYCwgaWZcblx0Ly8geW91IHdpc2ggdG8gbW9kaWZ5IHRoZSBjdXJyZW50IFVSTCB3aXRob3V0IGFkZGluZyBhbiBlbnRyeSB0byB0aGUgaGlzdG9yeS5cblx0bmF2aWdhdGU6IGZ1bmN0aW9uKGZyYWdtZW50LCBvcHRpb25zKSB7XG5cdGlmICghSGlzdG9yeS5zdGFydGVkKSByZXR1cm4gZmFsc2U7XG5cdGlmICghb3B0aW9ucyB8fCBvcHRpb25zID09PSB0cnVlKSBvcHRpb25zID0ge3RyaWdnZXI6IG9wdGlvbnN9O1xuXHR2YXIgZnJhZyA9IChmcmFnbWVudCB8fCAnJykucmVwbGFjZShyb3V0ZVN0cmlwcGVyLCAnJyk7XG5cdGlmICh0aGlzLmZyYWdtZW50ID09IGZyYWcpIHJldHVybjtcblxuXHQvLyBJZiBwdXNoU3RhdGUgaXMgYXZhaWxhYmxlLCB3ZSB1c2UgaXQgdG8gc2V0IHRoZSBmcmFnbWVudCBhcyBhIHJlYWwgVVJMLlxuXHRpZiAodGhpcy5faGFzUHVzaFN0YXRlKSB7XG5cdFx0aWYgKGZyYWcuaW5kZXhPZih0aGlzLm9wdGlvbnMucm9vdCkgIT0gMCkgZnJhZyA9IHRoaXMub3B0aW9ucy5yb290ICsgZnJhZztcblx0XHR0aGlzLmZyYWdtZW50ID0gZnJhZztcblx0XHR3aW5kb3cuaGlzdG9yeVtvcHRpb25zLnJlcGxhY2UgPyAncmVwbGFjZVN0YXRlJyA6ICdwdXNoU3RhdGUnXSh7fSwgZG9jdW1lbnQudGl0bGUsIGZyYWcpO1xuXG5cdC8vIElmIGhhc2ggY2hhbmdlcyBoYXZlbid0IGJlZW4gZXhwbGljaXRseSBkaXNhYmxlZCwgdXBkYXRlIHRoZSBoYXNoXG5cdC8vIGZyYWdtZW50IHRvIHN0b3JlIGhpc3RvcnkuXG5cdH0gZWxzZSBpZiAodGhpcy5fd2FudHNIYXNoQ2hhbmdlKSB7XG5cdFx0dGhpcy5mcmFnbWVudCA9IGZyYWc7XG5cdFx0dGhpcy5fdXBkYXRlSGFzaCh3aW5kb3cubG9jYXRpb24sIGZyYWcsIG9wdGlvbnMucmVwbGFjZSk7XG5cdFx0aWYgKHRoaXMuaWZyYW1lICYmIChmcmFnICE9IHRoaXMuZ2V0RnJhZ21lbnQodGhpcy5nZXRIYXNoKHRoaXMuaWZyYW1lKSkpKSB7XG5cdFx0Ly8gT3BlbmluZyBhbmQgY2xvc2luZyB0aGUgaWZyYW1lIHRyaWNrcyBJRTcgYW5kIGVhcmxpZXIgdG8gcHVzaCBhIGhpc3RvcnkgZW50cnkgb24gaGFzaC10YWcgY2hhbmdlLlxuXHRcdC8vIFdoZW4gcmVwbGFjZSBpcyB0cnVlLCB3ZSBkb24ndCB3YW50IHRoaXMuXG5cdFx0aWYoIW9wdGlvbnMucmVwbGFjZSkgdGhpcy5pZnJhbWUuZG9jdW1lbnQub3BlbigpLmNsb3NlKCk7XG5cdFx0dGhpcy5fdXBkYXRlSGFzaCh0aGlzLmlmcmFtZS5sb2NhdGlvbiwgZnJhZywgb3B0aW9ucy5yZXBsYWNlKTtcblx0XHR9XG5cblx0Ly8gSWYgeW91J3ZlIHRvbGQgdXMgdGhhdCB5b3UgZXhwbGljaXRseSBkb24ndCB3YW50IGZhbGxiYWNrIGhhc2hjaGFuZ2UtXG5cdC8vIGJhc2VkIGhpc3RvcnksIHRoZW4gYG5hdmlnYXRlYCBiZWNvbWVzIGEgcGFnZSByZWZyZXNoLlxuXHR9IGVsc2Uge1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24odGhpcy5vcHRpb25zLnJvb3QgKyBmcmFnbWVudCk7XG5cdH1cblx0aWYgKG9wdGlvbnMudHJpZ2dlcikgdGhpcy5sb2FkVXJsKGZyYWdtZW50KTtcblx0fSxcblxuXHQvLyBVcGRhdGUgdGhlIGhhc2ggbG9jYXRpb24sIGVpdGhlciByZXBsYWNpbmcgdGhlIGN1cnJlbnQgZW50cnksIG9yIGFkZGluZ1xuXHQvLyBhIG5ldyBvbmUgdG8gdGhlIGJyb3dzZXIgaGlzdG9yeS5cblx0X3VwZGF0ZUhhc2g6IGZ1bmN0aW9uKGxvY2F0aW9uLCBmcmFnbWVudCwgcmVwbGFjZSkge1xuXHRpZiAocmVwbGFjZSkge1xuXHRcdGxvY2F0aW9uLnJlcGxhY2UobG9jYXRpb24udG9TdHJpbmcoKS5yZXBsYWNlKC8oamF2YXNjcmlwdDp8IykuKiQvLCAnJykgKyAnIycgKyBmcmFnbWVudCk7XG5cdH0gZWxzZSB7XG5cdFx0bG9jYXRpb24uaGFzaCA9IGZyYWdtZW50O1xuXHR9XG5cdH1cbn0pO1xuXG4vLyBCYWNrYm9uZS5WaWV3XG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIENyZWF0aW5nIGEgQmFja2JvbmUuVmlldyBjcmVhdGVzIGl0cyBpbml0aWFsIGVsZW1lbnQgb3V0c2lkZSBvZiB0aGUgRE9NLFxuLy8gaWYgYW4gZXhpc3RpbmcgZWxlbWVudCBpcyBub3QgcHJvdmlkZWQuLi5cbnZhciBWaWV3ID0gQmFja2JvbmUuVmlldyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dGhpcy5jaWQgPSBfLnVuaXF1ZUlkKCd2aWV3Jyk7XG5cdHRoaXMuX2NvbmZpZ3VyZShvcHRpb25zIHx8IHt9KTtcblx0dGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuXHR0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xufTtcblxuLy8gQ2FjaGVkIHJlZ2V4IHRvIHNwbGl0IGtleXMgZm9yIGBkZWxlZ2F0ZWAuXG52YXIgZGVsZWdhdGVFdmVudFNwbGl0dGVyID0gL14oXFxTKylcXHMqKC4qKSQvO1xuXG4vLyBMaXN0IG9mIHZpZXcgb3B0aW9ucyB0byBiZSBtZXJnZWQgYXMgcHJvcGVydGllcy5cbnZhciB2aWV3T3B0aW9ucyA9IFsnbW9kZWwnLCAnY29sbGVjdGlvbicsICdlbCcsICdpZCcsICdhdHRyaWJ1dGVzJywgJ2NsYXNzTmFtZScsICd0YWdOYW1lJ107XG5cbi8vIFNldCB1cCBhbGwgaW5oZXJpdGFibGUgKipCYWNrYm9uZS5WaWV3KiogcHJvcGVydGllcyBhbmQgbWV0aG9kcy5cbl8uZXh0ZW5kKFZpZXcucHJvdG90eXBlLCBFdmVudHMsIHtcblxuXHQvLyBUaGUgZGVmYXVsdCBgdGFnTmFtZWAgb2YgYSBWaWV3J3MgZWxlbWVudCBpcyBgXCJkaXZcImAuXG5cdHRhZ05hbWU6ICdkaXYnLFxuXG5cdC8vIGpRdWVyeSBkZWxlZ2F0ZSBmb3IgZWxlbWVudCBsb29rdXAsIHNjb3BlZCB0byBET00gZWxlbWVudHMgd2l0aGluIHRoZVxuXHQvLyBjdXJyZW50IHZpZXcuIFRoaXMgc2hvdWxkIGJlIHByZWZlcmVkIHRvIGdsb2JhbCBsb29rdXBzIHdoZXJlIHBvc3NpYmxlLlxuXHQkOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuXHRyZXR1cm4gdGhpcy4kZWwuZmluZChzZWxlY3Rvcik7XG5cdH0sXG5cblx0Ly8gSW5pdGlhbGl6ZSBpcyBhbiBlbXB0eSBmdW5jdGlvbiBieSBkZWZhdWx0LiBPdmVycmlkZSBpdCB3aXRoIHlvdXIgb3duXG5cdC8vIGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpe30sXG5cblx0Ly8gKipyZW5kZXIqKiBpcyB0aGUgY29yZSBmdW5jdGlvbiB0aGF0IHlvdXIgdmlldyBzaG91bGQgb3ZlcnJpZGUsIGluIG9yZGVyXG5cdC8vIHRvIHBvcHVsYXRlIGl0cyBlbGVtZW50IChgdGhpcy5lbGApLCB3aXRoIHRoZSBhcHByb3ByaWF0ZSBIVE1MLiBUaGVcblx0Ly8gY29udmVudGlvbiBpcyBmb3IgKipyZW5kZXIqKiB0byBhbHdheXMgcmV0dXJuIGB0aGlzYC5cblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Ly8gUmVtb3ZlIHRoaXMgdmlldyBmcm9tIHRoZSBET00uIE5vdGUgdGhhdCB0aGUgdmlldyBpc24ndCBwcmVzZW50IGluIHRoZVxuXHQvLyBET00gYnkgZGVmYXVsdCwgc28gY2FsbGluZyB0aGlzIG1ldGhvZCBtYXkgYmUgYSBuby1vcC5cblx0cmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0dGhpcy4kZWwucmVtb3ZlKCk7XG5cdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8vIEZvciBzbWFsbCBhbW91bnRzIG9mIERPTSBFbGVtZW50cywgd2hlcmUgYSBmdWxsLWJsb3duIHRlbXBsYXRlIGlzbid0XG5cdC8vIG5lZWRlZCwgdXNlICoqbWFrZSoqIHRvIG1hbnVmYWN0dXJlIGVsZW1lbnRzLCBvbmUgYXQgYSB0aW1lLlxuXHQvL1xuXHQvLyAgICAgdmFyIGVsID0gdGhpcy5tYWtlKCdsaScsIHsnY2xhc3MnOiAncm93J30sIHRoaXMubW9kZWwuZXNjYXBlKCd0aXRsZScpKTtcblx0Ly9cblx0bWFrZTogZnVuY3Rpb24odGFnTmFtZSwgYXR0cmlidXRlcywgY29udGVudCkge1xuXHR2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuXHRpZiAoYXR0cmlidXRlcykgJChlbCkuYXR0cihhdHRyaWJ1dGVzKTtcblx0aWYgKGNvbnRlbnQpICQoZWwpLmh0bWwoY29udGVudCk7XG5cdHJldHVybiBlbDtcblx0fSxcblxuXHQvLyBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpLCBpbmNsdWRpbmcgZXZlbnRcblx0Ly8gcmUtZGVsZWdhdGlvbi5cblx0c2V0RWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgZGVsZWdhdGUpIHtcblx0aWYgKHRoaXMuJGVsKSB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcblx0dGhpcy4kZWwgPSAoZWxlbWVudCBpbnN0YW5jZW9mICQpID8gZWxlbWVudCA6ICQoZWxlbWVudCk7XG5cdHRoaXMuZWwgPSB0aGlzLiRlbFswXTtcblx0aWYgKGRlbGVnYXRlICE9PSBmYWxzZSkgdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuXHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvLyBTZXQgY2FsbGJhY2tzLCB3aGVyZSBgdGhpcy5ldmVudHNgIGlzIGEgaGFzaCBvZlxuXHQvL1xuXHQvLyAqe1wiZXZlbnQgc2VsZWN0b3JcIjogXCJjYWxsYmFja1wifSpcblx0Ly9cblx0Ly8gICAgIHtcblx0Ly8gICAgICAgJ21vdXNlZG93biAudGl0bGUnOiAgJ2VkaXQnLFxuXHQvLyAgICAgICAnY2xpY2sgLmJ1dHRvbic6ICAgICAnc2F2ZSdcblx0Ly8gICAgICAgJ2NsaWNrIC5vcGVuJzogICAgICAgZnVuY3Rpb24oZSkgeyAuLi4gfVxuXHQvLyAgICAgfVxuXHQvL1xuXHQvLyBwYWlycy4gQ2FsbGJhY2tzIHdpbGwgYmUgYm91bmQgdG8gdGhlIHZpZXcsIHdpdGggYHRoaXNgIHNldCBwcm9wZXJseS5cblx0Ly8gVXNlcyBldmVudCBkZWxlZ2F0aW9uIGZvciBlZmZpY2llbmN5LlxuXHQvLyBPbWl0dGluZyB0aGUgc2VsZWN0b3IgYmluZHMgdGhlIGV2ZW50IHRvIGB0aGlzLmVsYC5cblx0Ly8gVGhpcyBvbmx5IHdvcmtzIGZvciBkZWxlZ2F0ZS1hYmxlIGV2ZW50czogbm90IGBmb2N1c2AsIGBibHVyYCwgYW5kXG5cdC8vIG5vdCBgY2hhbmdlYCwgYHN1Ym1pdGAsIGFuZCBgcmVzZXRgIGluIEludGVybmV0IEV4cGxvcmVyLlxuXHRkZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oZXZlbnRzKSB7XG5cdGlmICghKGV2ZW50cyB8fCAoZXZlbnRzID0gZ2V0VmFsdWUodGhpcywgJ2V2ZW50cycpKSkpIHJldHVybjtcblx0dGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG5cdGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcblx0XHR2YXIgbWV0aG9kID0gZXZlbnRzW2tleV07XG5cdFx0aWYgKCFfLmlzRnVuY3Rpb24obWV0aG9kKSkgbWV0aG9kID0gdGhpc1tldmVudHNba2V5XV07XG5cdFx0aWYgKCFtZXRob2QpIHRocm93IG5ldyBFcnJvcignTWV0aG9kIFwiJyArIGV2ZW50c1trZXldICsgJ1wiIGRvZXMgbm90IGV4aXN0Jyk7XG5cdFx0dmFyIG1hdGNoID0ga2V5Lm1hdGNoKGRlbGVnYXRlRXZlbnRTcGxpdHRlcik7XG5cdFx0dmFyIGV2ZW50TmFtZSA9IG1hdGNoWzFdLCBzZWxlY3RvciA9IG1hdGNoWzJdO1xuXHRcdG1ldGhvZCA9IF8uYmluZChtZXRob2QsIHRoaXMpO1xuXHRcdGV2ZW50TmFtZSArPSAnLmRlbGVnYXRlRXZlbnRzJyArIHRoaXMuY2lkO1xuXHRcdGlmIChzZWxlY3RvciA9PT0gJycpIHtcblx0XHR0aGlzLiRlbC5iaW5kKGV2ZW50TmFtZSwgbWV0aG9kKTtcblx0XHR9IGVsc2Uge1xuXHRcdHRoaXMuJGVsLmRlbGVnYXRlKHNlbGVjdG9yLCBldmVudE5hbWUsIG1ldGhvZCk7XG5cdFx0fVxuXHR9XG5cdH0sXG5cblx0Ly8gQ2xlYXJzIGFsbCBjYWxsYmFja3MgcHJldmlvdXNseSBib3VuZCB0byB0aGUgdmlldyB3aXRoIGBkZWxlZ2F0ZUV2ZW50c2AuXG5cdC8vIFlvdSB1c3VhbGx5IGRvbid0IG5lZWQgdG8gdXNlIHRoaXMsIGJ1dCBtYXkgd2lzaCB0byBpZiB5b3UgaGF2ZSBtdWx0aXBsZVxuXHQvLyBCYWNrYm9uZSB2aWV3cyBhdHRhY2hlZCB0byB0aGUgc2FtZSBET00gZWxlbWVudC5cblx0dW5kZWxlZ2F0ZUV2ZW50czogZnVuY3Rpb24oKSB7XG5cdHRoaXMuJGVsLnVuYmluZCgnLmRlbGVnYXRlRXZlbnRzJyArIHRoaXMuY2lkKTtcblx0fSxcblxuXHQvLyBQZXJmb3JtcyB0aGUgaW5pdGlhbCBjb25maWd1cmF0aW9uIG9mIGEgVmlldyB3aXRoIGEgc2V0IG9mIG9wdGlvbnMuXG5cdC8vIEtleXMgd2l0aCBzcGVjaWFsIG1lYW5pbmcgKihtb2RlbCwgY29sbGVjdGlvbiwgaWQsIGNsYXNzTmFtZSkqLCBhcmVcblx0Ly8gYXR0YWNoZWQgZGlyZWN0bHkgdG8gdGhlIHZpZXcuXG5cdF9jb25maWd1cmU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0aWYgKHRoaXMub3B0aW9ucykgb3B0aW9ucyA9IF8uZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMsIG9wdGlvbnMpO1xuXHRmb3IgKHZhciBpID0gMCwgbCA9IHZpZXdPcHRpb25zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuXHRcdHZhciBhdHRyID0gdmlld09wdGlvbnNbaV07XG5cdFx0aWYgKG9wdGlvbnNbYXR0cl0pIHRoaXNbYXR0cl0gPSBvcHRpb25zW2F0dHJdO1xuXHR9XG5cdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdH0sXG5cblx0Ly8gRW5zdXJlIHRoYXQgdGhlIFZpZXcgaGFzIGEgRE9NIGVsZW1lbnQgdG8gcmVuZGVyIGludG8uXG5cdC8vIElmIGB0aGlzLmVsYCBpcyBhIHN0cmluZywgcGFzcyBpdCB0aHJvdWdoIGAkKClgLCB0YWtlIHRoZSBmaXJzdFxuXHQvLyBtYXRjaGluZyBlbGVtZW50LCBhbmQgcmUtYXNzaWduIGl0IHRvIGBlbGAuIE90aGVyd2lzZSwgY3JlYXRlXG5cdC8vIGFuIGVsZW1lbnQgZnJvbSB0aGUgYGlkYCwgYGNsYXNzTmFtZWAgYW5kIGB0YWdOYW1lYCBwcm9wZXJ0aWVzLlxuXHRfZW5zdXJlRWxlbWVudDogZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy5lbCkge1xuXHRcdHZhciBhdHRycyA9IGdldFZhbHVlKHRoaXMsICdhdHRyaWJ1dGVzJykgfHwge307XG5cdFx0aWYgKHRoaXMuaWQpIGF0dHJzLmlkID0gdGhpcy5pZDtcblx0XHRpZiAodGhpcy5jbGFzc05hbWUpIGF0dHJzWydjbGFzcyddID0gdGhpcy5jbGFzc05hbWU7XG5cdFx0dGhpcy5zZXRFbGVtZW50KHRoaXMubWFrZSh0aGlzLnRhZ05hbWUsIGF0dHJzKSwgZmFsc2UpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuc2V0RWxlbWVudCh0aGlzLmVsLCBmYWxzZSk7XG5cdH1cblx0fVxuXG59KTtcblxuLy8gVGhlIHNlbGYtcHJvcGFnYXRpbmcgZXh0ZW5kIGZ1bmN0aW9uIHRoYXQgQmFja2JvbmUgY2xhc3NlcyB1c2UuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gKHByb3RvUHJvcHMsIGNsYXNzUHJvcHMpIHtcblx0dmFyIGNoaWxkID0gaW5oZXJpdHModGhpcywgcHJvdG9Qcm9wcywgY2xhc3NQcm9wcyk7XG5cdGNoaWxkLmV4dGVuZCA9IHRoaXMuZXh0ZW5kO1xuXHRyZXR1cm4gY2hpbGQ7XG59O1xuXG4vLyBTZXQgdXAgaW5oZXJpdGFuY2UgZm9yIHRoZSBtb2RlbCwgY29sbGVjdGlvbiwgYW5kIHZpZXcuXG5Nb2RlbC5leHRlbmQgPSBDb2xsZWN0aW9uLmV4dGVuZCA9IFJvdXRlci5leHRlbmQgPSBWaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxuLy8gQmFja2JvbmUuc3luY1xuLy8gLS0tLS0tLS0tLS0tLVxuXG4vLyBNYXAgZnJvbSBDUlVEIHRvIEhUVFAgZm9yIG91ciBkZWZhdWx0IGBCYWNrYm9uZS5zeW5jYCBpbXBsZW1lbnRhdGlvbi5cbnZhciBtZXRob2RNYXAgPSB7XG5cdCdjcmVhdGUnOiAnUE9TVCcsXG5cdCd1cGRhdGUnOiAnUFVUJyxcblx0J2RlbGV0ZSc6ICdERUxFVEUnLFxuXHQncmVhZCc6ICAgJ0dFVCdcbn07XG5cbi8vIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gY2hhbmdlIHRoZSBtYW5uZXIgaW4gd2hpY2ggQmFja2JvbmUgcGVyc2lzdHNcbi8vIG1vZGVscyB0byB0aGUgc2VydmVyLiBZb3Ugd2lsbCBiZSBwYXNzZWQgdGhlIHR5cGUgb2YgcmVxdWVzdCwgYW5kIHRoZVxuLy8gbW9kZWwgaW4gcXVlc3Rpb24uIEJ5IGRlZmF1bHQsIG1ha2VzIGEgUkVTVGZ1bCBBamF4IHJlcXVlc3Rcbi8vIHRvIHRoZSBtb2RlbCdzIGB1cmwoKWAuIFNvbWUgcG9zc2libGUgY3VzdG9taXphdGlvbnMgY291bGQgYmU6XG4vL1xuLy8gKiBVc2UgYHNldFRpbWVvdXRgIHRvIGJhdGNoIHJhcGlkLWZpcmUgdXBkYXRlcyBpbnRvIGEgc2luZ2xlIHJlcXVlc3QuXG4vLyAqIFNlbmQgdXAgdGhlIG1vZGVscyBhcyBYTUwgaW5zdGVhZCBvZiBKU09OLlxuLy8gKiBQZXJzaXN0IG1vZGVscyB2aWEgV2ViU29ja2V0cyBpbnN0ZWFkIG9mIEFqYXguXG4vL1xuLy8gVHVybiBvbiBgQmFja2JvbmUuZW11bGF0ZUhUVFBgIGluIG9yZGVyIHRvIHNlbmQgYFBVVGAgYW5kIGBERUxFVEVgIHJlcXVlc3RzXG4vLyBhcyBgUE9TVGAsIHdpdGggYSBgX21ldGhvZGAgcGFyYW1ldGVyIGNvbnRhaW5pbmcgdGhlIHRydWUgSFRUUCBtZXRob2QsXG4vLyBhcyB3ZWxsIGFzIGFsbCByZXF1ZXN0cyB3aXRoIHRoZSBib2R5IGFzIGBhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRgXG4vLyBpbnN0ZWFkIG9mIGBhcHBsaWNhdGlvbi9qc29uYCB3aXRoIHRoZSBtb2RlbCBpbiBhIHBhcmFtIG5hbWVkIGBtb2RlbGAuXG4vLyBVc2VmdWwgd2hlbiBpbnRlcmZhY2luZyB3aXRoIHNlcnZlci1zaWRlIGxhbmd1YWdlcyBsaWtlICoqUEhQKiogdGhhdCBtYWtlXG4vLyBpdCBkaWZmaWN1bHQgdG8gcmVhZCB0aGUgYm9keSBvZiBgUFVUYCByZXF1ZXN0cy5cbkJhY2tib25lLnN5bmMgPSBmdW5jdGlvbihtZXRob2QsIG1vZGVsLCBvcHRpb25zKSB7XG5cdHZhciB0eXBlID0gbWV0aG9kTWFwW21ldGhvZF07XG5cblx0Ly8gRGVmYXVsdCBvcHRpb25zLCB1bmxlc3Mgc3BlY2lmaWVkLlxuXHRvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXG5cdC8vIERlZmF1bHQgSlNPTi1yZXF1ZXN0IG9wdGlvbnMuXG5cdHZhciBwYXJhbXMgPSB7dHlwZTogdHlwZSwgZGF0YVR5cGU6ICdqc29uJ307XG5cblx0Ly8gRW5zdXJlIHRoYXQgd2UgaGF2ZSBhIFVSTC5cblx0aWYgKCFvcHRpb25zLnVybCkge1xuXHRwYXJhbXMudXJsID0gZ2V0VmFsdWUobW9kZWwsICd1cmwnKSB8fCB1cmxFcnJvcigpO1xuXHR9XG5cblx0Ly8gRW5zdXJlIHRoYXQgd2UgaGF2ZSB0aGUgYXBwcm9wcmlhdGUgcmVxdWVzdCBkYXRhLlxuXHRpZiAoIW9wdGlvbnMuZGF0YSAmJiBtb2RlbCAmJiAobWV0aG9kID09ICdjcmVhdGUnIHx8IG1ldGhvZCA9PSAndXBkYXRlJykpIHtcblx0cGFyYW1zLmNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuXHRwYXJhbXMuZGF0YSA9IEpTT04uc3RyaW5naWZ5KG1vZGVsLnRvSlNPTigpKTtcblx0fVxuXG5cdC8vIEZvciBvbGRlciBzZXJ2ZXJzLCBlbXVsYXRlIEpTT04gYnkgZW5jb2RpbmcgdGhlIHJlcXVlc3QgaW50byBhbiBIVE1MLWZvcm0uXG5cdGlmIChCYWNrYm9uZS5lbXVsYXRlSlNPTikge1xuXHRwYXJhbXMuY29udGVudFR5cGUgPSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJztcblx0cGFyYW1zLmRhdGEgPSBwYXJhbXMuZGF0YSA/IHttb2RlbDogcGFyYW1zLmRhdGF9IDoge307XG5cdH1cblxuXHQvLyBGb3Igb2xkZXIgc2VydmVycywgZW11bGF0ZSBIVFRQIGJ5IG1pbWlja2luZyB0aGUgSFRUUCBtZXRob2Qgd2l0aCBgX21ldGhvZGBcblx0Ly8gQW5kIGFuIGBYLUhUVFAtTWV0aG9kLU92ZXJyaWRlYCBoZWFkZXIuXG5cdGlmIChCYWNrYm9uZS5lbXVsYXRlSFRUUCkge1xuXHRpZiAodHlwZSA9PT0gJ1BVVCcgfHwgdHlwZSA9PT0gJ0RFTEVURScpIHtcblx0XHRpZiAoQmFja2JvbmUuZW11bGF0ZUpTT04pIHBhcmFtcy5kYXRhLl9tZXRob2QgPSB0eXBlO1xuXHRcdHBhcmFtcy50eXBlID0gJ1BPU1QnO1xuXHRcdHBhcmFtcy5iZWZvcmVTZW5kID0gZnVuY3Rpb24oeGhyKSB7XG5cdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoJ1gtSFRUUC1NZXRob2QtT3ZlcnJpZGUnLCB0eXBlKTtcblx0XHR9O1xuXHR9XG5cdH1cblxuXHQvLyBEb24ndCBwcm9jZXNzIGRhdGEgb24gYSBub24tR0VUIHJlcXVlc3QuXG5cdGlmIChwYXJhbXMudHlwZSAhPT0gJ0dFVCcgJiYgIUJhY2tib25lLmVtdWxhdGVKU09OKSB7XG5cdHBhcmFtcy5wcm9jZXNzRGF0YSA9IGZhbHNlO1xuXHR9XG5cblx0Ly8gTWFrZSB0aGUgcmVxdWVzdCwgYWxsb3dpbmcgdGhlIHVzZXIgdG8gb3ZlcnJpZGUgYW55IEFqYXggb3B0aW9ucy5cblx0cmV0dXJuICQuYWpheChfLmV4dGVuZChwYXJhbXMsIG9wdGlvbnMpKTtcbn07XG5cbi8vIFdyYXAgYW4gb3B0aW9uYWwgZXJyb3IgY2FsbGJhY2sgd2l0aCBhIGZhbGxiYWNrIGVycm9yIGV2ZW50LlxuQmFja2JvbmUud3JhcEVycm9yID0gZnVuY3Rpb24ob25FcnJvciwgb3JpZ2luYWxNb2RlbCwgb3B0aW9ucykge1xuXHRyZXR1cm4gZnVuY3Rpb24obW9kZWwsIHJlc3ApIHtcblx0cmVzcCA9IG1vZGVsID09PSBvcmlnaW5hbE1vZGVsID8gcmVzcCA6IG1vZGVsO1xuXHRpZiAob25FcnJvcikge1xuXHRcdG9uRXJyb3Iob3JpZ2luYWxNb2RlbCwgcmVzcCwgb3B0aW9ucyk7XG5cdH0gZWxzZSB7XG5cdFx0b3JpZ2luYWxNb2RlbC50cmlnZ2VyKCdlcnJvcicsIG9yaWdpbmFsTW9kZWwsIHJlc3AsIG9wdGlvbnMpO1xuXHR9XG5cdH07XG59O1xuXG4vLyBIZWxwZXJzXG4vLyAtLS0tLS0tXG5cbi8vIFNoYXJlZCBlbXB0eSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBhaWQgaW4gcHJvdG90eXBlLWNoYWluIGNyZWF0aW9uLlxudmFyIGN0b3IgPSBmdW5jdGlvbigpe307XG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBjb3JyZWN0bHkgc2V0IHVwIHRoZSBwcm90b3R5cGUgY2hhaW4sIGZvciBzdWJjbGFzc2VzLlxuLy8gU2ltaWxhciB0byBgZ29vZy5pbmhlcml0c2AsIGJ1dCB1c2VzIGEgaGFzaCBvZiBwcm90b3R5cGUgcHJvcGVydGllcyBhbmRcbi8vIGNsYXNzIHByb3BlcnRpZXMgdG8gYmUgZXh0ZW5kZWQuXG52YXIgaW5oZXJpdHMgPSBmdW5jdGlvbihwYXJlbnQsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG5cdHZhciBjaGlsZDtcblxuXHQvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG5cdC8vICh0aGUgXCJjb25zdHJ1Y3RvclwiIHByb3BlcnR5IGluIHlvdXIgYGV4dGVuZGAgZGVmaW5pdGlvbiksIG9yIGRlZmF1bHRlZFxuXHQvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG5cdGlmIChwcm90b1Byb3BzICYmIHByb3RvUHJvcHMuaGFzT3duUHJvcGVydHkoJ2NvbnN0cnVjdG9yJykpIHtcblx0Y2hpbGQgPSBwcm90b1Byb3BzLmNvbnN0cnVjdG9yO1xuXHR9IGVsc2Uge1xuXHRjaGlsZCA9IGZ1bmN0aW9uKCl7IHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuXHR9XG5cblx0Ly8gSW5oZXJpdCBjbGFzcyAoc3RhdGljKSBwcm9wZXJ0aWVzIGZyb20gcGFyZW50LlxuXHRfLmV4dGVuZChjaGlsZCwgcGFyZW50KTtcblxuXHQvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuXHQvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuXHRjdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG5cdGNoaWxkLnByb3RvdHlwZSA9IG5ldyBjdG9yKCk7XG5cblx0Ly8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG5cdC8vIGlmIHN1cHBsaWVkLlxuXHRpZiAocHJvdG9Qcm9wcykgXy5leHRlbmQoY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcblxuXHQvLyBBZGQgc3RhdGljIHByb3BlcnRpZXMgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLCBpZiBzdXBwbGllZC5cblx0aWYgKHN0YXRpY1Byb3BzKSBfLmV4dGVuZChjaGlsZCwgc3RhdGljUHJvcHMpO1xuXG5cdC8vIENvcnJlY3RseSBzZXQgY2hpbGQncyBgcHJvdG90eXBlLmNvbnN0cnVjdG9yYC5cblx0Y2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY2hpbGQ7XG5cblx0Ly8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZCBsYXRlci5cblx0Y2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuXHRyZXR1cm4gY2hpbGQ7XG59O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2V0IGEgdmFsdWUgZnJvbSBhIEJhY2tib25lIG9iamVjdCBhcyBhIHByb3BlcnR5XG4vLyBvciBhcyBhIGZ1bmN0aW9uLlxudmFyIGdldFZhbHVlID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wKSB7XG5cdGlmICghKG9iamVjdCAmJiBvYmplY3RbcHJvcF0pKSByZXR1cm4gbnVsbDtcblx0cmV0dXJuIF8uaXNGdW5jdGlvbihvYmplY3RbcHJvcF0pID8gb2JqZWN0W3Byb3BdKCkgOiBvYmplY3RbcHJvcF07XG59O1xuXG4vLyBUaHJvdyBhbiBlcnJvciB3aGVuIGEgVVJMIGlzIG5lZWRlZCwgYW5kIG5vbmUgaXMgc3VwcGxpZWQuXG52YXIgdXJsRXJyb3IgPSBmdW5jdGlvbigpIHtcblx0dGhyb3cgbmV3IEVycm9yKCdBIFwidXJsXCIgcHJvcGVydHkgb3IgZnVuY3Rpb24gbXVzdCBiZSBzcGVjaWZpZWQnKTtcbn07XG5cbn0pLmNhbGwodGhpcyk7XG4iXSwic291cmNlUm9vdCI6Ii9Vc2Vycy9kbWl0cml5L1dvcmsvdGl0YW5pdW0vY291bnRlci9SZXNvdXJjZXMvaXBob25lL2FsbG95In0=

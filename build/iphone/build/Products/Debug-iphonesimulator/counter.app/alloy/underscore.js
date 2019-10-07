//     Underscore.js 1.9.1
//     http://underscorejs.org
//     (c) 2009-2018 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function () {

  // Baseline setup
  // --------------

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  var root = typeof self == 'object' && self.self === self && self ||
  typeof global == 'object' && global.global === global && global ||
  this ||
  {};

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype,ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.
  var push = ArrayProto.push,
  slice = ArrayProto.slice,
  toString = ObjProto.toString,
  hasOwnProperty = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var nativeIsArray = Array.isArray,
  nativeKeys = Object.keys,
  nativeCreate = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function Ctor() {};

  // Create a safe reference to the Underscore object for use below.
  var _ = function _(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for their old module API. If we're in
  // the browser, add `_` as a global object.
  // (`nodeType` is checked to ensure that `module`
  // and `exports` are not HTML elements.)
  if (typeof exports != 'undefined' && !exports.nodeType) {
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.9.1';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function optimizeCb(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1:return function (value) {
          return func.call(context, value);
        };
      // The 2-argument case is omitted because we’re not using it.
      case 3:return function (value, index, collection) {
          return func.call(context, value, index, collection);
        };
      case 4:return function (accumulator, value, index, collection) {
          return func.call(context, accumulator, value, index, collection);
        };}

    return function () {
      return func.apply(context, arguments);
    };
  };

  var builtinIteratee;

  // An internal function to generate callbacks that can be applied to each
  // element in a collection, returning the desired result — either `identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  var cb = function cb(value, context, argCount) {
    if (_.iteratee !== builtinIteratee) return _.iteratee(value, context);
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value) && !_.isArray(value)) return _.matcher(value);
    return _.property(value);
  };

  // External wrapper for our callback generator. Users may customize
  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
  // This abstraction hides the internal-only argCount argument.
  _.iteratee = builtinIteratee = function builtinIteratee(value, context) {
    return cb(value, context, Infinity);
  };

  // Some functions take a variable number of arguments, or a few expected
  // arguments at the beginning and then a variable number of values to operate
  // on. This helper accumulates all remaining arguments past the function’s
  // argument length (or an explicit `startIndex`), into an array that becomes
  // the last argument. Similar to ES6’s "rest parameter".
  var restArguments = function restArguments(func, startIndex) {
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function () {
      var length = Math.max(arguments.length - startIndex, 0),
      rest = Array(length),
      index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      switch (startIndex) {
        case 0:return func.call(this, rest);
        case 1:return func.call(this, arguments[0], rest);
        case 2:return func.call(this, arguments[0], arguments[1], rest);}

      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function baseCreate(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor();
    Ctor.prototype = null;
    return result;
  };

  var shallowProperty = function shallowProperty(key) {
    return function (obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  var has = function has(obj, path) {
    return obj != null && hasOwnProperty.call(obj, path);
  };

  var deepGet = function deepGet(obj, path) {
    var length = path.length;
    for (var i = 0; i < length; i++) {
      if (obj == null) return void 0;
      obj = obj[path[i]];
    }
    return length ? obj : void 0;
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = shallowProperty('length');
  var isArrayLike = function isArrayLike(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function (obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function (obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
    length = (keys || obj).length,
    results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  var createReduce = function createReduce(dir) {
    // Wrap code that reassigns argument variables in a separate function than
    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
    var reducer = function reducer(obj, iteratee, memo, initial) {
      var keys = !isArrayLike(obj) && _.keys(obj),
      length = (keys || obj).length,
      index = dir > 0 ? 0 : length - 1;
      if (!initial) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    return function (obj, iteratee, memo, context) {
      var initial = arguments.length >= 3;
      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
    };
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function (obj, predicate, context) {
    var keyFinder = isArrayLike(obj) ? _.findIndex : _.findKey;
    var key = keyFinder(obj, predicate, context);
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function (obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function (value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function (obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function (obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
    length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function (obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
    length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function (obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = restArguments(function (obj, path, args) {
    var contextPath, func;
    if (_.isFunction(path)) {
      func = path;
    } else if (_.isArray(path)) {
      contextPath = path.slice(0, -1);
      path = path[path.length - 1];
    }
    return _.map(obj, function (context) {
      var method = func;
      if (!method) {
        if (contextPath && contextPath.length) {
          context = deepGet(context, contextPath);
        }
        if (context == null) return void 0;
        method = context[path];
      }
      return method == null ? method : method.apply(context, args);
    });
  });

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function (obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function (obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function (obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function (obj, iteratee, context) {
    var result = -Infinity,lastComputed = -Infinity,
    value,computed;
    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function (v, index, list) {
        computed = iteratee(v, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function (obj, iteratee, context) {
    var result = Infinity,lastComputed = Infinity,
    value,computed;
    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function (v, index, list) {
        computed = iteratee(v, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection.
  _.shuffle = function (obj) {
    return _.sample(obj, Infinity);
  };

  // Sample **n** random values from a collection using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function (obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    var sample = isArrayLike(obj) ? _.clone(obj) : _.values(obj);
    var length = getLength(sample);
    n = Math.max(Math.min(n, length), 0);
    var last = length - 1;
    for (var index = 0; index < n; index++) {
      var rand = _.random(index, last);
      var temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    return sample.slice(0, n);
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function (obj, iteratee, context) {
    var index = 0;
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function (value, key, list) {
      return {
        value: value,
        index: index++,
        criteria: iteratee(value, key, list) };

    }).sort(function (left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function group(behavior, partition) {
    return function (obj, iteratee, context) {
      var result = partition ? [[], []] : {};
      iteratee = cb(iteratee, context);
      _.each(obj, function (value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function (result, value, key) {
    if (has(result, key)) result[key].push(value);else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function (result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function (result, value, key) {
    if (has(result, key)) result[key]++;else result[key] = 1;
  });

  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
  // Safely create a real, live array from anything iterable.
  _.toArray = function (obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (_.isString(obj)) {
      // Keep surrogate pair characters together
      return obj.match(reStrSymbol);
    }
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function (obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = group(function (result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function (array, n, guard) {
    if (array == null || array.length < 1) return n == null ? void 0 : [];
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function (array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function (array, n, guard) {
    if (array == null || array.length < 1) return n == null ? void 0 : [];
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function (array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function (array) {
    return _.filter(array, Boolean);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function flatten(input, shallow, strict, output) {
    output = output || [];
    var idx = output.length;
    for (var i = 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        // Flatten current level of array or arguments object.
        if (shallow) {
          var j = 0,len = value.length;
          while (j < len) {output[idx++] = value[j++];}
        } else {
          flatten(value, shallow, strict, output);
          idx = output.length;
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function (array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = restArguments(function (array, otherArrays) {
    return _.difference(array, otherArrays);
  });

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // The faster algorithm will not work with an iteratee if the iteratee
  // is not a one-to-one function, so providing an iteratee will disable
  // the faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function (array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
      computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted && !iteratee) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = restArguments(function (arrays) {
    return _.uniq(flatten(arrays, true, true));
  });

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function (array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      var j;
      for (j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = restArguments(function (array, rest) {
    rest = flatten(rest, true, true);
    return _.filter(array, function (value) {
      return !_.contains(rest, value);
    });
  });

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices.
  _.unzip = function (array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = restArguments(_.unzip);

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values. Passing by pairs is the reverse of _.pairs.
  _.object = function (list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions.
  var createPredicateIndexFinder = function createPredicateIndexFinder(dir) {
    return function (array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  };

  // Returns the first index on an array-like that passes a predicate test.
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function (array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0,high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1;else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions.
  var createIndexFinder = function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function (array, item, idx) {
      var i = 0,length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
          i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function (start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    if (!step) {
      step = stop < start ? -1 : 1;
    }

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Chunk a single array into multiple arrays, each containing `count` or fewer
  // items.
  _.chunk = function (array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0,length = array.length;
    while (i < length) {
      result.push(slice.call(array, i, i += count));
    }
    return result;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments.
  var executeBound = function executeBound(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = restArguments(function (func, context, args) {
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var bound = restArguments(function (callArgs) {
      return executeBound(func, bound, context, this, args.concat(callArgs));
    });
    return bound;
  });

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder by default, allowing any combination of arguments to be
  // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
  _.partial = restArguments(function (func, boundArgs) {
    var placeholder = _.partial.placeholder;
    var bound = function bound() {
      var position = 0,length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) {args.push(arguments[position++]);}
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  });

  _.partial.placeholder = _;

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = restArguments(function (obj, keys) {
    keys = flatten(keys, false, false);
    var index = keys.length;
    if (index < 1) throw new Error('bindAll must be passed function names');
    while (index--) {
      var key = keys[index];
      obj[key] = _.bind(obj[key], obj);
    }
  });

  // Memoize an expensive function by storing its results.
  _.memoize = function (func, hasher) {
    var memoize = function memoize(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = restArguments(function (func, wait, args) {
    return setTimeout(function () {
      return func.apply(null, args);
    }, wait);
  });

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function (func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function later() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function throttled() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.cancel = function () {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function (func, wait, immediate) {
    var timeout, result;

    var later = function later(context, args) {
      timeout = null;
      if (args) result = func.apply(context, args);
    };

    var debounced = restArguments(function (args) {
      if (timeout) clearTimeout(timeout);
      if (immediate) {
        var callNow = !timeout;
        timeout = setTimeout(later, wait);
        if (callNow) result = func.apply(this, args);
      } else {
        timeout = _.delay(later, wait, this, args);
      }

      return result;
    });

    debounced.cancel = function () {
      clearTimeout(timeout);
      timeout = null;
    };

    return debounced;
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function (func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function (predicate) {
    return function () {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function () {
    var args = arguments;
    var start = args.length - 1;
    return function () {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) {result = args[i].call(this, result);}
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function (times, func) {
    return function () {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function (times, func) {
    var memo;
    return function () {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  _.restArguments = restArguments;

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{ toString: null }.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
  'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  var collectNonEnumProps = function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  };

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`.
  _.keys = function (obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) {if (has(obj, key)) keys.push(key);}
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function (obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) {keys.push(key);}
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function (obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object.
  // In contrast to _.map it returns an object.
  _.mapObject = function (obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = _.keys(obj),
    length = keys.length,
    results = {};
    for (var index = 0; index < length; index++) {
      var currentKey = keys[index];
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  // The opposite of _.object.
  _.pairs = function (obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function (obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`.
  _.functions = _.methods = function (obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // An internal function for creating assigner functions.
  var createAssigner = function createAssigner(keysFunc, defaults) {
    return function (obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
        keys = keysFunc(source),
        l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s).
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test.
  _.findKey = function (obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj),key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Internal pick helper function to determine if `obj` has key `key`.
  var keyInObj = function keyInObj(value, key, obj) {
    return key in obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = restArguments(function (obj, keys) {
    var result = {},iteratee = keys[0];
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
      keys = _.allKeys(obj);
    } else {
      iteratee = keyInObj;
      keys = flatten(keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  // Return a copy of the object without the blacklisted properties.
  _.omit = restArguments(function (obj, keys) {
    var iteratee = keys[0],context;
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
      if (keys.length > 1) context = keys[1];
    } else {
      keys = _.map(flatten(keys, false, false), String);
      iteratee = function iteratee(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  });

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function (prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function (obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function (obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function (object, attrs) {
    var keys = _.keys(attrs),length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq, deepEq;
  eq = function eq(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null) return false;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
  };

  // Internal recursive comparison function for `isEqual`.
  deepEq = function deepEq(a, b, aStack, bStack) {
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN.
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
      case '[object Symbol]':
        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);}


    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor,bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
      _.isFunction(bCtor) && bCtor instanceof bCtor) &&
      'constructor' in a && 'constructor' in b) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a),key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function (a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function (obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function (obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function (obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function (obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError, isMap, isWeakMap, isSet, isWeakSet.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error', 'Symbol', 'Map', 'WeakMap', 'Set', 'WeakSet'], function (name) {
    _['is' + name] = function (obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function (obj) {
      return has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
  var nodelist = root.document && root.document.childNodes;
  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
    _.isFunction = function (obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function (obj) {
    return !_.isSymbol(obj) && isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`?
  _.isNaN = function (obj) {
    return _.isNumber(obj) && isNaN(obj);
  };

  // Is a given value a boolean?
  _.isBoolean = function (obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function (obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function (obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function (obj, path) {
    if (!_.isArray(path)) {
      return has(obj, path);
    }
    var length = path.length;
    for (var i = 0; i < length; i++) {
      var key = path[i];
      if (obj == null || !hasOwnProperty.call(obj, key)) {
        return false;
      }
      obj = obj[key];
    }
    return !!length;
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function () {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function (value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function (value) {
    return function () {
      return value;
    };
  };

  _.noop = function () {};

  // Creates a function that, when passed an object, will traverse that object’s
  // properties down the given `path`, specified as an array of keys or indexes.
  _.property = function (path) {
    if (!_.isArray(path)) {
      return shallowProperty(path);
    }
    return function (obj) {
      return deepGet(obj, path);
    };
  };

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function (obj) {
    if (obj == null) {
      return function () {};
    }
    return function (path) {
      return !_.isArray(path) ? obj[path] : deepGet(obj, path);
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function (attrs) {
    attrs = _.extendOwn({}, attrs);
    return function (obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function (n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) {accum[i] = iteratee(i);}
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function (min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function () {
    return new Date().getTime();
  };

  // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;' };

  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function createEscaper(map) {
    var escaper = function escaper(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function (string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // Traverses the children of `obj` along `path`. If a child is a function, it
  // is invoked with its parent as context. Returns the value of the final
  // child, or `fallback` if any child is undefined.
  _.result = function (obj, path, fallback) {
    if (!_.isArray(path)) path = [path];
    var length = path.length;
    if (!length) {
      return _.isFunction(fallback) ? fallback.call(obj) : fallback;
    }
    for (var i = 0; i < length; i++) {
      var prop = obj == null ? void 0 : obj[path[i]];
      if (prop === void 0) {
        prop = fallback;
        i = length; // Ensure we don't continue iterating.
      }
      obj = _.isFunction(prop) ? prop.call(obj) : prop;
    }
    return obj;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function (prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g };


  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029' };


  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function escapeChar(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function (text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
    (settings.escape || noMatch).source,
    (settings.interpolate || noMatch).source,
    (settings.evaluate || noMatch).source].
    join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
    "print=function(){__p+=__j.call(arguments,'');};\n" +
    source + 'return __p;\n';

    var render;
    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function template(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function (obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var chainResult = function chainResult(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function (obj) {
    _.each(_.functions(obj), function (name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function () {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return chainResult(this, func.apply(_, args));
      };
    });
    return _;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function (name) {
    var method = ArrayProto[name];
    _.prototype[name] = function () {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return chainResult(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function (name) {
    var method = ArrayProto[name];
    _.prototype[name] = function () {
      return chainResult(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function () {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function () {
    return String(this._wrapped);
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define == 'function' && define.amd) {
    define('underscore', [], function () {
      return _;
    });
  }
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInVuZGVyc2NvcmUuanMiXSwibmFtZXMiOlsicm9vdCIsInNlbGYiLCJnbG9iYWwiLCJwcmV2aW91c1VuZGVyc2NvcmUiLCJfIiwiQXJyYXlQcm90byIsIkFycmF5IiwicHJvdG90eXBlIiwiT2JqUHJvdG8iLCJPYmplY3QiLCJTeW1ib2xQcm90byIsIlN5bWJvbCIsInB1c2giLCJzbGljZSIsInRvU3RyaW5nIiwiaGFzT3duUHJvcGVydHkiLCJuYXRpdmVJc0FycmF5IiwiaXNBcnJheSIsIm5hdGl2ZUtleXMiLCJrZXlzIiwibmF0aXZlQ3JlYXRlIiwiY3JlYXRlIiwiQ3RvciIsIm9iaiIsIl93cmFwcGVkIiwiZXhwb3J0cyIsIm5vZGVUeXBlIiwibW9kdWxlIiwiVkVSU0lPTiIsIm9wdGltaXplQ2IiLCJmdW5jIiwiY29udGV4dCIsImFyZ0NvdW50IiwidmFsdWUiLCJjYWxsIiwiaW5kZXgiLCJjb2xsZWN0aW9uIiwiYWNjdW11bGF0b3IiLCJhcHBseSIsImFyZ3VtZW50cyIsImJ1aWx0aW5JdGVyYXRlZSIsImNiIiwiaXRlcmF0ZWUiLCJpZGVudGl0eSIsImlzRnVuY3Rpb24iLCJpc09iamVjdCIsIm1hdGNoZXIiLCJwcm9wZXJ0eSIsIkluZmluaXR5IiwicmVzdEFyZ3VtZW50cyIsInN0YXJ0SW5kZXgiLCJsZW5ndGgiLCJNYXRoIiwibWF4IiwicmVzdCIsImFyZ3MiLCJiYXNlQ3JlYXRlIiwicmVzdWx0Iiwic2hhbGxvd1Byb3BlcnR5Iiwia2V5IiwiaGFzIiwicGF0aCIsImRlZXBHZXQiLCJpIiwiTUFYX0FSUkFZX0lOREVYIiwicG93IiwiZ2V0TGVuZ3RoIiwiaXNBcnJheUxpa2UiLCJlYWNoIiwiZm9yRWFjaCIsIm1hcCIsImNvbGxlY3QiLCJyZXN1bHRzIiwiY3VycmVudEtleSIsImNyZWF0ZVJlZHVjZSIsImRpciIsInJlZHVjZXIiLCJtZW1vIiwiaW5pdGlhbCIsInJlZHVjZSIsImZvbGRsIiwiaW5qZWN0IiwicmVkdWNlUmlnaHQiLCJmb2xkciIsImZpbmQiLCJkZXRlY3QiLCJwcmVkaWNhdGUiLCJrZXlGaW5kZXIiLCJmaW5kSW5kZXgiLCJmaW5kS2V5IiwiZmlsdGVyIiwic2VsZWN0IiwibGlzdCIsInJlamVjdCIsIm5lZ2F0ZSIsImV2ZXJ5IiwiYWxsIiwic29tZSIsImFueSIsImNvbnRhaW5zIiwiaW5jbHVkZXMiLCJpbmNsdWRlIiwiaXRlbSIsImZyb21JbmRleCIsImd1YXJkIiwidmFsdWVzIiwiaW5kZXhPZiIsImludm9rZSIsImNvbnRleHRQYXRoIiwibWV0aG9kIiwicGx1Y2siLCJ3aGVyZSIsImF0dHJzIiwiZmluZFdoZXJlIiwibGFzdENvbXB1dGVkIiwiY29tcHV0ZWQiLCJ2IiwibWluIiwic2h1ZmZsZSIsInNhbXBsZSIsIm4iLCJyYW5kb20iLCJjbG9uZSIsImxhc3QiLCJyYW5kIiwidGVtcCIsInNvcnRCeSIsImNyaXRlcmlhIiwic29ydCIsImxlZnQiLCJyaWdodCIsImEiLCJiIiwiZ3JvdXAiLCJiZWhhdmlvciIsInBhcnRpdGlvbiIsImdyb3VwQnkiLCJpbmRleEJ5IiwiY291bnRCeSIsInJlU3RyU3ltYm9sIiwidG9BcnJheSIsImlzU3RyaW5nIiwibWF0Y2giLCJzaXplIiwicGFzcyIsImZpcnN0IiwiaGVhZCIsInRha2UiLCJhcnJheSIsInRhaWwiLCJkcm9wIiwiY29tcGFjdCIsIkJvb2xlYW4iLCJmbGF0dGVuIiwiaW5wdXQiLCJzaGFsbG93Iiwic3RyaWN0Iiwib3V0cHV0IiwiaWR4IiwiaXNBcmd1bWVudHMiLCJqIiwibGVuIiwid2l0aG91dCIsIm90aGVyQXJyYXlzIiwiZGlmZmVyZW5jZSIsInVuaXEiLCJ1bmlxdWUiLCJpc1NvcnRlZCIsImlzQm9vbGVhbiIsInNlZW4iLCJ1bmlvbiIsImFycmF5cyIsImludGVyc2VjdGlvbiIsImFyZ3NMZW5ndGgiLCJ1bnppcCIsInppcCIsIm9iamVjdCIsImNyZWF0ZVByZWRpY2F0ZUluZGV4RmluZGVyIiwiZmluZExhc3RJbmRleCIsInNvcnRlZEluZGV4IiwibG93IiwiaGlnaCIsIm1pZCIsImZsb29yIiwiY3JlYXRlSW5kZXhGaW5kZXIiLCJwcmVkaWNhdGVGaW5kIiwiaXNOYU4iLCJsYXN0SW5kZXhPZiIsInJhbmdlIiwic3RhcnQiLCJzdG9wIiwic3RlcCIsImNlaWwiLCJjaHVuayIsImNvdW50IiwiZXhlY3V0ZUJvdW5kIiwic291cmNlRnVuYyIsImJvdW5kRnVuYyIsImNhbGxpbmdDb250ZXh0IiwiYmluZCIsIlR5cGVFcnJvciIsImJvdW5kIiwiY2FsbEFyZ3MiLCJjb25jYXQiLCJwYXJ0aWFsIiwiYm91bmRBcmdzIiwicGxhY2Vob2xkZXIiLCJwb3NpdGlvbiIsImJpbmRBbGwiLCJFcnJvciIsIm1lbW9pemUiLCJoYXNoZXIiLCJjYWNoZSIsImFkZHJlc3MiLCJkZWxheSIsIndhaXQiLCJzZXRUaW1lb3V0IiwiZGVmZXIiLCJ0aHJvdHRsZSIsIm9wdGlvbnMiLCJ0aW1lb3V0IiwicHJldmlvdXMiLCJsYXRlciIsImxlYWRpbmciLCJub3ciLCJ0aHJvdHRsZWQiLCJyZW1haW5pbmciLCJjbGVhclRpbWVvdXQiLCJ0cmFpbGluZyIsImNhbmNlbCIsImRlYm91bmNlIiwiaW1tZWRpYXRlIiwiZGVib3VuY2VkIiwiY2FsbE5vdyIsIndyYXAiLCJ3cmFwcGVyIiwiY29tcG9zZSIsImFmdGVyIiwidGltZXMiLCJiZWZvcmUiLCJvbmNlIiwiaGFzRW51bUJ1ZyIsInByb3BlcnR5SXNFbnVtZXJhYmxlIiwibm9uRW51bWVyYWJsZVByb3BzIiwiY29sbGVjdE5vbkVudW1Qcm9wcyIsIm5vbkVudW1JZHgiLCJjb25zdHJ1Y3RvciIsInByb3RvIiwicHJvcCIsImFsbEtleXMiLCJtYXBPYmplY3QiLCJwYWlycyIsImludmVydCIsImZ1bmN0aW9ucyIsIm1ldGhvZHMiLCJuYW1lcyIsImNyZWF0ZUFzc2lnbmVyIiwia2V5c0Z1bmMiLCJkZWZhdWx0cyIsInNvdXJjZSIsImwiLCJleHRlbmQiLCJleHRlbmRPd24iLCJhc3NpZ24iLCJrZXlJbk9iaiIsInBpY2siLCJvbWl0IiwiU3RyaW5nIiwicHJvcHMiLCJ0YXAiLCJpbnRlcmNlcHRvciIsImlzTWF0Y2giLCJlcSIsImRlZXBFcSIsImFTdGFjayIsImJTdGFjayIsInR5cGUiLCJjbGFzc05hbWUiLCJ2YWx1ZU9mIiwiYXJlQXJyYXlzIiwiYUN0b3IiLCJiQ3RvciIsInBvcCIsImlzRXF1YWwiLCJpc0VtcHR5IiwiaXNFbGVtZW50IiwibmFtZSIsIm5vZGVsaXN0IiwiZG9jdW1lbnQiLCJjaGlsZE5vZGVzIiwiSW50OEFycmF5IiwiaXNGaW5pdGUiLCJpc1N5bWJvbCIsInBhcnNlRmxvYXQiLCJpc051bWJlciIsImlzTnVsbCIsImlzVW5kZWZpbmVkIiwibm9Db25mbGljdCIsImNvbnN0YW50Iiwibm9vcCIsInByb3BlcnR5T2YiLCJtYXRjaGVzIiwiYWNjdW0iLCJEYXRlIiwiZ2V0VGltZSIsImVzY2FwZU1hcCIsInVuZXNjYXBlTWFwIiwiY3JlYXRlRXNjYXBlciIsImVzY2FwZXIiLCJqb2luIiwidGVzdFJlZ2V4cCIsIlJlZ0V4cCIsInJlcGxhY2VSZWdleHAiLCJzdHJpbmciLCJ0ZXN0IiwicmVwbGFjZSIsImVzY2FwZSIsInVuZXNjYXBlIiwiZmFsbGJhY2siLCJpZENvdW50ZXIiLCJ1bmlxdWVJZCIsInByZWZpeCIsImlkIiwidGVtcGxhdGVTZXR0aW5ncyIsImV2YWx1YXRlIiwiaW50ZXJwb2xhdGUiLCJub01hdGNoIiwiZXNjYXBlcyIsImVzY2FwZVJlZ0V4cCIsImVzY2FwZUNoYXIiLCJ0ZW1wbGF0ZSIsInRleHQiLCJzZXR0aW5ncyIsIm9sZFNldHRpbmdzIiwib2Zmc2V0IiwidmFyaWFibGUiLCJyZW5kZXIiLCJGdW5jdGlvbiIsImUiLCJkYXRhIiwiYXJndW1lbnQiLCJjaGFpbiIsImluc3RhbmNlIiwiX2NoYWluIiwiY2hhaW5SZXN1bHQiLCJtaXhpbiIsInRvSlNPTiIsImRlZmluZSIsImFtZCJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUMsYUFBVzs7QUFFVjtBQUNBOztBQUVB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QUFDQTtBQUNBO0FBQ0EsTUFBSSxPQUFPbVUsTUFBUCxJQUFpQixVQUFqQixJQUErQkEsTUFBTSxDQUFDQyxHQUExQyxFQUErQztBQUM3Q0QsSUFBQUEsTUFBTSxDQUFDLFlBQUQsRUFBZSxFQUFmLEVBQW1CLFlBQVc7QUFDbEMsYUFBT3ZWLENBQVA7QUFDRCxLQUZLLENBQU47QUFHRDtBQUNGLENBdHBEQSxHQUFEIiwic291cmNlc0NvbnRlbnQiOlsiLy8gICAgIFVuZGVyc2NvcmUuanMgMS45LjFcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTggSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCAoYHNlbGZgKSBpbiB0aGUgYnJvd3NlciwgYGdsb2JhbGBcbiAgLy8gb24gdGhlIHNlcnZlciwgb3IgYHRoaXNgIGluIHNvbWUgdmlydHVhbCBtYWNoaW5lcy4gV2UgdXNlIGBzZWxmYFxuICAvLyBpbnN0ZWFkIG9mIGB3aW5kb3dgIGZvciBgV2ViV29ya2VyYCBzdXBwb3J0LlxuICB2YXIgcm9vdCA9IHR5cGVvZiBzZWxmID09ICdvYmplY3QnICYmIHNlbGYuc2VsZiA9PT0gc2VsZiAmJiBzZWxmIHx8XG4gICAgICAgICAgICB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXMgfHxcbiAgICAgICAgICAgIHt9O1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcbiAgdmFyIFN5bWJvbFByb3RvID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgPyBTeW1ib2wucHJvdG90eXBlIDogbnVsbDtcblxuICAvLyBDcmVhdGUgcXVpY2sgcmVmZXJlbmNlIHZhcmlhYmxlcyBmb3Igc3BlZWQgYWNjZXNzIHRvIGNvcmUgcHJvdG90eXBlcy5cbiAgdmFyIHB1c2ggPSBBcnJheVByb3RvLnB1c2gsXG4gICAgICBzbGljZSA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgICB0b1N0cmluZyA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgICAgaGFzT3duUHJvcGVydHkgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhciBuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheSxcbiAgICAgIG5hdGl2ZUtleXMgPSBPYmplY3Qua2V5cyxcbiAgICAgIG5hdGl2ZUNyZWF0ZSA9IE9iamVjdC5jcmVhdGU7XG5cbiAgLy8gTmFrZWQgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBzdXJyb2dhdGUtcHJvdG90eXBlLXN3YXBwaW5nLlxuICB2YXIgQ3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZWlyIG9sZCBtb2R1bGUgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QuXG4gIC8vIChgbm9kZVR5cGVgIGlzIGNoZWNrZWQgdG8gZW5zdXJlIHRoYXQgYG1vZHVsZWBcbiAgLy8gYW5kIGBleHBvcnRzYCBhcmUgbm90IEhUTUwgZWxlbWVudHMuKVxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT0gJ3VuZGVmaW5lZCcgJiYgIWV4cG9ydHMubm9kZVR5cGUpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJyAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjkuMSc7XG5cbiAgLy8gSW50ZXJuYWwgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGFuIGVmZmljaWVudCAoZm9yIGN1cnJlbnQgZW5naW5lcykgdmVyc2lvblxuICAvLyBvZiB0aGUgcGFzc2VkLWluIGNhbGxiYWNrLCB0byBiZSByZXBlYXRlZGx5IGFwcGxpZWQgaW4gb3RoZXIgVW5kZXJzY29yZVxuICAvLyBmdW5jdGlvbnMuXG4gIHZhciBvcHRpbWl6ZUNiID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCwgYXJnQ291bnQpIHtcbiAgICBpZiAoY29udGV4dCA9PT0gdm9pZCAwKSByZXR1cm4gZnVuYztcbiAgICBzd2l0Y2ggKGFyZ0NvdW50ID09IG51bGwgPyAzIDogYXJnQ291bnQpIHtcbiAgICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUpO1xuICAgICAgfTtcbiAgICAgIC8vIFRoZSAyLWFyZ3VtZW50IGNhc2UgaXMgb21pdHRlZCBiZWNhdXNlIHdl4oCZcmUgbm90IHVzaW5nIGl0LlxuICAgICAgY2FzZSAzOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDQ6IHJldHVybiBmdW5jdGlvbihhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgdmFyIGJ1aWx0aW5JdGVyYXRlZTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBjYWxsYmFja3MgdGhhdCBjYW4gYmUgYXBwbGllZCB0byBlYWNoXG4gIC8vIGVsZW1lbnQgaW4gYSBjb2xsZWN0aW9uLCByZXR1cm5pbmcgdGhlIGRlc2lyZWQgcmVzdWx0IOKAlCBlaXRoZXIgYGlkZW50aXR5YCxcbiAgLy8gYW4gYXJiaXRyYXJ5IGNhbGxiYWNrLCBhIHByb3BlcnR5IG1hdGNoZXIsIG9yIGEgcHJvcGVydHkgYWNjZXNzb3IuXG4gIHZhciBjYiA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmIChfLml0ZXJhdGVlICE9PSBidWlsdGluSXRlcmF0ZWUpIHJldHVybiBfLml0ZXJhdGVlKHZhbHVlLCBjb250ZXh0KTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiBvcHRpbWl6ZUNiKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCk7XG4gICAgaWYgKF8uaXNPYmplY3QodmFsdWUpICYmICFfLmlzQXJyYXkodmFsdWUpKSByZXR1cm4gXy5tYXRjaGVyKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gRXh0ZXJuYWwgd3JhcHBlciBmb3Igb3VyIGNhbGxiYWNrIGdlbmVyYXRvci4gVXNlcnMgbWF5IGN1c3RvbWl6ZVxuICAvLyBgXy5pdGVyYXRlZWAgaWYgdGhleSB3YW50IGFkZGl0aW9uYWwgcHJlZGljYXRlL2l0ZXJhdGVlIHNob3J0aGFuZCBzdHlsZXMuXG4gIC8vIFRoaXMgYWJzdHJhY3Rpb24gaGlkZXMgdGhlIGludGVybmFsLW9ubHkgYXJnQ291bnQgYXJndW1lbnQuXG4gIF8uaXRlcmF0ZWUgPSBidWlsdGluSXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBjYih2YWx1ZSwgY29udGV4dCwgSW5maW5pdHkpO1xuICB9O1xuXG4gIC8vIFNvbWUgZnVuY3Rpb25zIHRha2UgYSB2YXJpYWJsZSBudW1iZXIgb2YgYXJndW1lbnRzLCBvciBhIGZldyBleHBlY3RlZFxuICAvLyBhcmd1bWVudHMgYXQgdGhlIGJlZ2lubmluZyBhbmQgdGhlbiBhIHZhcmlhYmxlIG51bWJlciBvZiB2YWx1ZXMgdG8gb3BlcmF0ZVxuICAvLyBvbi4gVGhpcyBoZWxwZXIgYWNjdW11bGF0ZXMgYWxsIHJlbWFpbmluZyBhcmd1bWVudHMgcGFzdCB0aGUgZnVuY3Rpb27igJlzXG4gIC8vIGFyZ3VtZW50IGxlbmd0aCAob3IgYW4gZXhwbGljaXQgYHN0YXJ0SW5kZXhgKSwgaW50byBhbiBhcnJheSB0aGF0IGJlY29tZXNcbiAgLy8gdGhlIGxhc3QgYXJndW1lbnQuIFNpbWlsYXIgdG8gRVM24oCZcyBcInJlc3QgcGFyYW1ldGVyXCIuXG4gIHZhciByZXN0QXJndW1lbnRzID0gZnVuY3Rpb24oZnVuYywgc3RhcnRJbmRleCkge1xuICAgIHN0YXJ0SW5kZXggPSBzdGFydEluZGV4ID09IG51bGwgPyBmdW5jLmxlbmd0aCAtIDEgOiArc3RhcnRJbmRleDtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoYXJndW1lbnRzLmxlbmd0aCAtIHN0YXJ0SW5kZXgsIDApLFxuICAgICAgICAgIHJlc3QgPSBBcnJheShsZW5ndGgpLFxuICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICByZXN0W2luZGV4XSA9IGFyZ3VtZW50c1tpbmRleCArIHN0YXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChzdGFydEluZGV4KSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCByZXN0KTtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIGFyZ3VtZW50c1swXSwgcmVzdCk7XG4gICAgICAgIGNhc2UgMjogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSwgcmVzdCk7XG4gICAgICB9XG4gICAgICB2YXIgYXJncyA9IEFycmF5KHN0YXJ0SW5kZXggKyAxKTtcbiAgICAgIGZvciAoaW5kZXggPSAwOyBpbmRleCA8IHN0YXJ0SW5kZXg7IGluZGV4KyspIHtcbiAgICAgICAgYXJnc1tpbmRleF0gPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgfVxuICAgICAgYXJnc1tzdGFydEluZGV4XSA9IHJlc3Q7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIG5ldyBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIGFub3RoZXIuXG4gIHZhciBiYXNlQ3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KHByb3RvdHlwZSkpIHJldHVybiB7fTtcbiAgICBpZiAobmF0aXZlQ3JlYXRlKSByZXR1cm4gbmF0aXZlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBDdG9yO1xuICAgIEN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHZhciBzaGFsbG93UHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqID09IG51bGwgPyB2b2lkIDAgOiBvYmpba2V5XTtcbiAgICB9O1xuICB9O1xuXG4gIHZhciBoYXMgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICByZXR1cm4gb2JqICE9IG51bGwgJiYgaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHBhdGgpO1xuICB9XG5cbiAgdmFyIGRlZXBHZXQgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICB2YXIgbGVuZ3RoID0gcGF0aC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgICAgb2JqID0gb2JqW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gbGVuZ3RoID8gb2JqIDogdm9pZCAwO1xuICB9O1xuXG4gIC8vIEhlbHBlciBmb3IgY29sbGVjdGlvbiBtZXRob2RzIHRvIGRldGVybWluZSB3aGV0aGVyIGEgY29sbGVjdGlvblxuICAvLyBzaG91bGQgYmUgaXRlcmF0ZWQgYXMgYW4gYXJyYXkgb3IgYXMgYW4gb2JqZWN0LlxuICAvLyBSZWxhdGVkOiBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy10b2xlbmd0aFxuICAvLyBBdm9pZHMgYSB2ZXJ5IG5hc3R5IGlPUyA4IEpJVCBidWcgb24gQVJNLTY0LiAjMjA5NFxuICB2YXIgTUFYX0FSUkFZX0lOREVYID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgdmFyIGdldExlbmd0aCA9IHNoYWxsb3dQcm9wZXJ0eSgnbGVuZ3RoJyk7XG4gIHZhciBpc0FycmF5TGlrZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGNvbGxlY3Rpb24pO1xuICAgIHJldHVybiB0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGxlbmd0aCA+PSAwICYmIGxlbmd0aCA8PSBNQVhfQVJSQVlfSU5ERVg7XG4gIH07XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyByYXcgb2JqZWN0cyBpbiBhZGRpdGlvbiB0byBhcnJheS1saWtlcy4gVHJlYXRzIGFsbFxuICAvLyBzcGFyc2UgYXJyYXktbGlrZXMgYXMgaWYgdGhleSB3ZXJlIGRlbnNlLlxuICBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIgaSwgbGVuZ3RoO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopKSB7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlcmF0ZWUob2JqW2ldLCBpLCBvYmopO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICByZXN1bHRzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIHJlZHVjaW5nIGZ1bmN0aW9uIGl0ZXJhdGluZyBsZWZ0IG9yIHJpZ2h0LlxuICB2YXIgY3JlYXRlUmVkdWNlID0gZnVuY3Rpb24oZGlyKSB7XG4gICAgLy8gV3JhcCBjb2RlIHRoYXQgcmVhc3NpZ25zIGFyZ3VtZW50IHZhcmlhYmxlcyBpbiBhIHNlcGFyYXRlIGZ1bmN0aW9uIHRoYW5cbiAgICAvLyB0aGUgb25lIHRoYXQgYWNjZXNzZXMgYGFyZ3VtZW50cy5sZW5ndGhgIHRvIGF2b2lkIGEgcGVyZiBoaXQuICgjMTk5MSlcbiAgICB2YXIgcmVkdWNlciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGluaXRpYWwpIHtcbiAgICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgICAgaW5kZXggPSBkaXIgPiAwID8gMCA6IGxlbmd0aCAtIDE7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IG9ialtrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleF07XG4gICAgICAgIGluZGV4ICs9IGRpcjtcbiAgICAgIH1cbiAgICAgIGZvciAoOyBpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSBkaXIpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdGVlKG1lbW8sIG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID49IDM7XG4gICAgICByZXR1cm4gcmVkdWNlcihvYmosIG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQsIDQpLCBtZW1vLCBpbml0aWFsKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBjcmVhdGVSZWR1Y2UoMSk7XG5cbiAgLy8gVGhlIHJpZ2h0LWFzc29jaWF0aXZlIHZlcnNpb24gb2YgcmVkdWNlLCBhbHNvIGtub3duIGFzIGBmb2xkcmAuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gY3JlYXRlUmVkdWNlKC0xKTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIga2V5RmluZGVyID0gaXNBcnJheUxpa2Uob2JqKSA/IF8uZmluZEluZGV4IDogXy5maW5kS2V5O1xuICAgIHZhciBrZXkgPSBrZXlGaW5kZXIob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGlmIChrZXkgIT09IHZvaWQgMCAmJiBrZXkgIT09IC0xKSByZXR1cm4gb2JqW2tleV07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm5lZ2F0ZShjYihwcmVkaWNhdGUpKSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9ICFpc0FycmF5TGlrZShvYmopICYmIF8ua2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgaWYgKCFwcmVkaWNhdGUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9ICFpc0FycmF5TGlrZShvYmopICYmIF8ua2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaikpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiBpdGVtICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVzYCBhbmQgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlcyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgaXRlbSwgZnJvbUluZGV4LCBndWFyZCkge1xuICAgIGlmICghaXNBcnJheUxpa2Uob2JqKSkgb2JqID0gXy52YWx1ZXMob2JqKTtcbiAgICBpZiAodHlwZW9mIGZyb21JbmRleCAhPSAnbnVtYmVyJyB8fCBndWFyZCkgZnJvbUluZGV4ID0gMDtcbiAgICByZXR1cm4gXy5pbmRleE9mKG9iaiwgaXRlbSwgZnJvbUluZGV4KSA+PSAwO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IHJlc3RBcmd1bWVudHMoZnVuY3Rpb24ob2JqLCBwYXRoLCBhcmdzKSB7XG4gICAgdmFyIGNvbnRleHRQYXRoLCBmdW5jO1xuICAgIGlmIChfLmlzRnVuY3Rpb24ocGF0aCkpIHtcbiAgICAgIGZ1bmMgPSBwYXRoO1xuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHBhdGgpKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IHBhdGguc2xpY2UoMCwgLTEpO1xuICAgICAgcGF0aCA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGZ1bmM7XG4gICAgICBpZiAoIW1ldGhvZCkge1xuICAgICAgICBpZiAoY29udGV4dFBhdGggJiYgY29udGV4dFBhdGgubGVuZ3RoKSB7XG4gICAgICAgICAgY29udGV4dCA9IGRlZXBHZXQoY29udGV4dCwgY29udGV4dFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgICAgIG1ldGhvZCA9IGNvbnRleHRbcGF0aF07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWV0aG9kID09IG51bGwgPyBtZXRob2QgOiBtZXRob2QuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIF8ucHJvcGVydHkoa2V5KSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubWF0Y2hlcihhdHRycykpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmluZChvYmosIF8ubWF0Y2hlcihhdHRycykpO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWF4aW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IC1JbmZpbml0eSwgbGFzdENvbXB1dGVkID0gLUluZmluaXR5LFxuICAgICAgICB2YWx1ZSwgY29tcHV0ZWQ7XG4gICAgaWYgKGl0ZXJhdGVlID09IG51bGwgfHwgdHlwZW9mIGl0ZXJhdGVlID09ICdudW1iZXInICYmIHR5cGVvZiBvYmpbMF0gIT0gJ29iamVjdCcgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgIG9iaiA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IG9ialtpXTtcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwgJiYgdmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHYsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodiwgaW5kZXgsIGxpc3QpO1xuICAgICAgICBpZiAoY29tcHV0ZWQgPiBsYXN0Q29tcHV0ZWQgfHwgY29tcHV0ZWQgPT09IC1JbmZpbml0eSAmJiByZXN1bHQgPT09IC1JbmZpbml0eSkge1xuICAgICAgICAgIHJlc3VsdCA9IHY7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsIHx8IHR5cGVvZiBpdGVyYXRlZSA9PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2JqWzBdICE9ICdvYmplY3QnICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSAhPSBudWxsICYmIHZhbHVlIDwgcmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2LCBpbmRleCwgbGlzdCkge1xuICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKHYsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSBJbmZpbml0eSAmJiByZXN1bHQgPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdjtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhIGNvbGxlY3Rpb24uXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLnNhbXBsZShvYmosIEluZmluaXR5KTtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbiB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICB2YXIgc2FtcGxlID0gaXNBcnJheUxpa2Uob2JqKSA/IF8uY2xvbmUob2JqKSA6IF8udmFsdWVzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGdldExlbmd0aChzYW1wbGUpO1xuICAgIG4gPSBNYXRoLm1heChNYXRoLm1pbihuLCBsZW5ndGgpLCAwKTtcbiAgICB2YXIgbGFzdCA9IGxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IG47IGluZGV4KyspIHtcbiAgICAgIHZhciByYW5kID0gXy5yYW5kb20oaW5kZXgsIGxhc3QpO1xuICAgICAgdmFyIHRlbXAgPSBzYW1wbGVbaW5kZXhdO1xuICAgICAgc2FtcGxlW2luZGV4XSA9IHNhbXBsZVtyYW5kXTtcbiAgICAgIHNhbXBsZVtyYW5kXSA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBzYW1wbGUuc2xpY2UoMCwgbik7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdGVlLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHJldHVybiBfLnBsdWNrKF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgrKyxcbiAgICAgICAgY3JpdGVyaWE6IGl0ZXJhdGVlKHZhbHVlLCBrZXksIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvciwgcGFydGl0aW9uKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBwYXJ0aXRpb24gPyBbW10sIFtdXSA6IHt9O1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCB2YWx1ZSwga2V5KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChoYXMocmVzdWx0LCBrZXkpKSByZXN1bHRba2V5XS5wdXNoKHZhbHVlKTsgZWxzZSByZXN1bHRba2V5XSA9IFt2YWx1ZV07XG4gIH0pO1xuXG4gIC8vIEluZGV4ZXMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiwgc2ltaWxhciB0byBgZ3JvdXBCeWAsIGJ1dCBmb3JcbiAgLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLlxuICBfLmluZGV4QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgaWYgKGhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldKys7IGVsc2UgcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICB2YXIgcmVTdHJTeW1ib2wgPSAvW15cXHVkODAwLVxcdWRmZmZdfFtcXHVkODAwLVxcdWRiZmZdW1xcdWRjMDAtXFx1ZGZmZl18W1xcdWQ4MDAtXFx1ZGZmZl0vZztcbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKF8uaXNTdHJpbmcob2JqKSkge1xuICAgICAgLy8gS2VlcCBzdXJyb2dhdGUgcGFpciBjaGFyYWN0ZXJzIHRvZ2V0aGVyXG4gICAgICByZXR1cm4gb2JqLm1hdGNoKHJlU3RyU3ltYm9sKTtcbiAgICB9XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gaXNBcnJheUxpa2Uob2JqKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gU3BsaXQgYSBjb2xsZWN0aW9uIGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwgcGFzcykge1xuICAgIHJlc3VsdFtwYXNzID8gMCA6IDFdLnB1c2godmFsdWUpO1xuICB9LCB0cnVlKTtcblxuICAvLyBBcnJheSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBmaXJzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYGhlYWRgIGFuZCBgdGFrZWAuIFRoZSAqKmd1YXJkKiogY2hlY2tcbiAgLy8gYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmZpcnN0ID0gXy5oZWFkID0gXy50YWtlID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwgfHwgYXJyYXkubGVuZ3RoIDwgMSkgcmV0dXJuIG4gPT0gbnVsbCA/IHZvaWQgMCA6IFtdO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICByZXR1cm4gXy5pbml0aWFsKGFycmF5LCBhcnJheS5sZW5ndGggLSBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIE1hdGgubWF4KDAsIGFycmF5Lmxlbmd0aCAtIChuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbikpKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsIHx8IGFycmF5Lmxlbmd0aCA8IDEpIHJldHVybiBuID09IG51bGwgPyB2b2lkIDAgOiBbXTtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIF8ucmVzdChhcnJheSwgTWF0aC5tYXgoMCwgYXJyYXkubGVuZ3RoIC0gbikpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgbiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIEJvb2xlYW4pO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgc3RyaWN0LCBvdXRwdXQpIHtcbiAgICBvdXRwdXQgPSBvdXRwdXQgfHwgW107XG4gICAgdmFyIGlkeCA9IG91dHB1dC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChpbnB1dCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gaW5wdXRbaV07XG4gICAgICBpZiAoaXNBcnJheUxpa2UodmFsdWUpICYmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSkge1xuICAgICAgICAvLyBGbGF0dGVuIGN1cnJlbnQgbGV2ZWwgb2YgYXJyYXkgb3IgYXJndW1lbnRzIG9iamVjdC5cbiAgICAgICAgaWYgKHNoYWxsb3cpIHtcbiAgICAgICAgICB2YXIgaiA9IDAsIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB3aGlsZSAoaiA8IGxlbikgb3V0cHV0W2lkeCsrXSA9IHZhbHVlW2orK107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgc3RyaWN0LCBvdXRwdXQpO1xuICAgICAgICAgIGlkeCA9IG91dHB1dC5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCkge1xuICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBmYWxzZSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IHJlc3RBcmd1bWVudHMoZnVuY3Rpb24oYXJyYXksIG90aGVyQXJyYXlzKSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgb3RoZXJBcnJheXMpO1xuICB9KTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIFRoZSBmYXN0ZXIgYWxnb3JpdGhtIHdpbGwgbm90IHdvcmsgd2l0aCBhbiBpdGVyYXRlZSBpZiB0aGUgaXRlcmF0ZWVcbiAgLy8gaXMgbm90IGEgb25lLXRvLW9uZSBmdW5jdGlvbiwgc28gcHJvdmlkaW5nIGFuIGl0ZXJhdGVlIHdpbGwgZGlzYWJsZVxuICAvLyB0aGUgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFfLmlzQm9vbGVhbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRlZTtcbiAgICAgIGl0ZXJhdGVlID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXRlcmF0ZWUgIT0gbnVsbCkgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaV0sXG4gICAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSA/IGl0ZXJhdGVlKHZhbHVlLCBpLCBhcnJheSkgOiB2YWx1ZTtcbiAgICAgIGlmIChpc1NvcnRlZCAmJiAhaXRlcmF0ZWUpIHtcbiAgICAgICAgaWYgKCFpIHx8IHNlZW4gIT09IGNvbXB1dGVkKSByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIHNlZW4gPSBjb21wdXRlZDtcbiAgICAgIH0gZWxzZSBpZiAoaXRlcmF0ZWUpIHtcbiAgICAgICAgaWYgKCFfLmNvbnRhaW5zKHNlZW4sIGNvbXB1dGVkKSkge1xuICAgICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFfLmNvbnRhaW5zKHJlc3VsdCwgdmFsdWUpKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSByZXN0QXJndW1lbnRzKGZ1bmN0aW9uKGFycmF5cykge1xuICAgIHJldHVybiBfLnVuaXEoZmxhdHRlbihhcnJheXMsIHRydWUsIHRydWUpKTtcbiAgfSk7XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBhcmdzTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IGFycmF5W2ldO1xuICAgICAgaWYgKF8uY29udGFpbnMocmVzdWx0LCBpdGVtKSkgY29udGludWU7XG4gICAgICB2YXIgajtcbiAgICAgIGZvciAoaiA9IDE7IGogPCBhcmdzTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGFyZ3VtZW50c1tqXSwgaXRlbSkpIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGogPT09IGFyZ3NMZW5ndGgpIHJlc3VsdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFRha2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBvbmUgYXJyYXkgYW5kIGEgbnVtYmVyIG9mIG90aGVyIGFycmF5cy5cbiAgLy8gT25seSB0aGUgZWxlbWVudHMgcHJlc2VudCBpbiBqdXN0IHRoZSBmaXJzdCBhcnJheSB3aWxsIHJlbWFpbi5cbiAgXy5kaWZmZXJlbmNlID0gcmVzdEFyZ3VtZW50cyhmdW5jdGlvbihhcnJheSwgcmVzdCkge1xuICAgIHJlc3QgPSBmbGF0dGVuKHJlc3QsIHRydWUsIHRydWUpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpe1xuICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gQ29tcGxlbWVudCBvZiBfLnppcC4gVW56aXAgYWNjZXB0cyBhbiBhcnJheSBvZiBhcnJheXMgYW5kIGdyb3Vwc1xuICAvLyBlYWNoIGFycmF5J3MgZWxlbWVudHMgb24gc2hhcmVkIGluZGljZXMuXG4gIF8udW56aXAgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciBsZW5ndGggPSBhcnJheSAmJiBfLm1heChhcnJheSwgZ2V0TGVuZ3RoKS5sZW5ndGggfHwgMDtcbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkobGVuZ3RoKTtcblxuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHJlc3VsdFtpbmRleF0gPSBfLnBsdWNrKGFycmF5LCBpbmRleCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSByZXN0QXJndW1lbnRzKF8udW56aXApO1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy4gUGFzc2luZyBieSBwYWlycyBpcyB0aGUgcmV2ZXJzZSBvZiBfLnBhaXJzLlxuICBfLm9iamVjdCA9IGZ1bmN0aW9uKGxpc3QsIHZhbHVlcykge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGxpc3QpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBHZW5lcmF0b3IgZnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBmaW5kSW5kZXggYW5kIGZpbmRMYXN0SW5kZXggZnVuY3Rpb25zLlxuICB2YXIgY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIgPSBmdW5jdGlvbihkaXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpO1xuICAgICAgdmFyIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgaW5kZXggb24gYW4gYXJyYXktbGlrZSB0aGF0IHBhc3NlcyBhIHByZWRpY2F0ZSB0ZXN0LlxuICBfLmZpbmRJbmRleCA9IGNyZWF0ZVByZWRpY2F0ZUluZGV4RmluZGVyKDEpO1xuICBfLmZpbmRMYXN0SW5kZXggPSBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcigtMSk7XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQsIDEpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdGVlKG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBnZXRMZW5ndGgoYXJyYXkpO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKTtcbiAgICAgIGlmIChpdGVyYXRlZShhcnJheVttaWRdKSA8IHZhbHVlKSBsb3cgPSBtaWQgKyAxOyBlbHNlIGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gR2VuZXJhdG9yIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgaW5kZXhPZiBhbmQgbGFzdEluZGV4T2YgZnVuY3Rpb25zLlxuICB2YXIgY3JlYXRlSW5kZXhGaW5kZXIgPSBmdW5jdGlvbihkaXIsIHByZWRpY2F0ZUZpbmQsIHNvcnRlZEluZGV4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpZHgpIHtcbiAgICAgIHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIGlmICh0eXBlb2YgaWR4ID09ICdudW1iZXInKSB7XG4gICAgICAgIGlmIChkaXIgPiAwKSB7XG4gICAgICAgICAgaSA9IGlkeCA+PSAwID8gaWR4IDogTWF0aC5tYXgoaWR4ICsgbGVuZ3RoLCBpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZW5ndGggPSBpZHggPj0gMCA/IE1hdGgubWluKGlkeCArIDEsIGxlbmd0aCkgOiBpZHggKyBsZW5ndGggKyAxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHNvcnRlZEluZGV4ICYmIGlkeCAmJiBsZW5ndGgpIHtcbiAgICAgICAgaWR4ID0gc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaWR4XSA9PT0gaXRlbSA/IGlkeCA6IC0xO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0gIT09IGl0ZW0pIHtcbiAgICAgICAgaWR4ID0gcHJlZGljYXRlRmluZChzbGljZS5jYWxsKGFycmF5LCBpLCBsZW5ndGgpLCBfLmlzTmFOKTtcbiAgICAgICAgcmV0dXJuIGlkeCA+PSAwID8gaWR4ICsgaSA6IC0xO1xuICAgICAgfVxuICAgICAgZm9yIChpZHggPSBkaXIgPiAwID8gaSA6IGxlbmd0aCAtIDE7IGlkeCA+PSAwICYmIGlkeCA8IGxlbmd0aDsgaWR4ICs9IGRpcikge1xuICAgICAgICBpZiAoYXJyYXlbaWR4XSA9PT0gaXRlbSkgcmV0dXJuIGlkeDtcbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW4gaXRlbSBpbiBhbiBhcnJheSxcbiAgLy8gb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKDEsIF8uZmluZEluZGV4LCBfLnNvcnRlZEluZGV4KTtcbiAgXy5sYXN0SW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKC0xLCBfLmZpbmRMYXN0SW5kZXgpO1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKHN0b3AgPT0gbnVsbCkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIGlmICghc3RlcCkge1xuICAgICAgc3RlcCA9IHN0b3AgPCBzdGFydCA/IC0xIDogMTtcbiAgICB9XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciByYW5nZSA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBsZW5ndGg7IGlkeCsrLCBzdGFydCArPSBzdGVwKSB7XG4gICAgICByYW5nZVtpZHhdID0gc3RhcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIENodW5rIGEgc2luZ2xlIGFycmF5IGludG8gbXVsdGlwbGUgYXJyYXlzLCBlYWNoIGNvbnRhaW5pbmcgYGNvdW50YCBvciBmZXdlclxuICAvLyBpdGVtcy5cbiAgXy5jaHVuayA9IGZ1bmN0aW9uKGFycmF5LCBjb3VudCkge1xuICAgIGlmIChjb3VudCA9PSBudWxsIHx8IGNvdW50IDwgMSkgcmV0dXJuIFtdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAoaSA8IGxlbmd0aCkge1xuICAgICAgcmVzdWx0LnB1c2goc2xpY2UuY2FsbChhcnJheSwgaSwgaSArPSBjb3VudCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHRvIGV4ZWN1dGUgYSBmdW5jdGlvbiBhcyBhIGNvbnN0cnVjdG9yXG4gIC8vIG9yIGEgbm9ybWFsIGZ1bmN0aW9uIHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50cy5cbiAgdmFyIGV4ZWN1dGVCb3VuZCA9IGZ1bmN0aW9uKHNvdXJjZUZ1bmMsIGJvdW5kRnVuYywgY29udGV4dCwgY2FsbGluZ0NvbnRleHQsIGFyZ3MpIHtcbiAgICBpZiAoIShjYWxsaW5nQ29udGV4dCBpbnN0YW5jZW9mIGJvdW5kRnVuYykpIHJldHVybiBzb3VyY2VGdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIHZhciBzZWxmID0gYmFzZUNyZWF0ZShzb3VyY2VGdW5jLnByb3RvdHlwZSk7XG4gICAgdmFyIHJlc3VsdCA9IHNvdXJjZUZ1bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgaWYgKF8uaXNPYmplY3QocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IHJlc3RBcmd1bWVudHMoZnVuY3Rpb24oZnVuYywgY29udGV4dCwgYXJncykge1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdCaW5kIG11c3QgYmUgY2FsbGVkIG9uIGEgZnVuY3Rpb24nKTtcbiAgICB2YXIgYm91bmQgPSByZXN0QXJndW1lbnRzKGZ1bmN0aW9uKGNhbGxBcmdzKSB7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCBjb250ZXh0LCB0aGlzLCBhcmdzLmNvbmNhdChjYWxsQXJncykpO1xuICAgIH0pO1xuICAgIHJldHVybiBib3VuZDtcbiAgfSk7XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIgYnkgZGVmYXVsdCwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZVxuICAvLyBwcmUtZmlsbGVkLiBTZXQgYF8ucGFydGlhbC5wbGFjZWhvbGRlcmAgZm9yIGEgY3VzdG9tIHBsYWNlaG9sZGVyIGFyZ3VtZW50LlxuICBfLnBhcnRpYWwgPSByZXN0QXJndW1lbnRzKGZ1bmN0aW9uKGZ1bmMsIGJvdW5kQXJncykge1xuICAgIHZhciBwbGFjZWhvbGRlciA9IF8ucGFydGlhbC5wbGFjZWhvbGRlcjtcbiAgICB2YXIgYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDAsIGxlbmd0aCA9IGJvdW5kQXJncy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IEFycmF5KGxlbmd0aCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFyZ3NbaV0gPSBib3VuZEFyZ3NbaV0gPT09IHBsYWNlaG9sZGVyID8gYXJndW1lbnRzW3Bvc2l0aW9uKytdIDogYm91bmRBcmdzW2ldO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCB0aGlzLCB0aGlzLCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfSk7XG5cbiAgXy5wYXJ0aWFsLnBsYWNlaG9sZGVyID0gXztcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gcmVzdEFyZ3VtZW50cyhmdW5jdGlvbihvYmosIGtleXMpIHtcbiAgICBrZXlzID0gZmxhdHRlbihrZXlzLCBmYWxzZSwgZmFsc2UpO1xuICAgIHZhciBpbmRleCA9IGtleXMubGVuZ3RoO1xuICAgIGlmIChpbmRleCA8IDEpIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIHdoaWxlIChpbmRleC0tKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpbmRleF07XG4gICAgICBvYmpba2V5XSA9IF8uYmluZChvYmpba2V5XSwgb2JqKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vaXplID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgY2FjaGUgPSBtZW1vaXplLmNhY2hlO1xuICAgICAgdmFyIGFkZHJlc3MgPSAnJyArIChoYXNoZXIgPyBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IGtleSk7XG4gICAgICBpZiAoIWhhcyhjYWNoZSwgYWRkcmVzcykpIGNhY2hlW2FkZHJlc3NdID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGNhY2hlW2FkZHJlc3NdO1xuICAgIH07XG4gICAgbWVtb2l6ZS5jYWNoZSA9IHt9O1xuICAgIHJldHVybiBtZW1vaXplO1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gcmVzdEFyZ3VtZW50cyhmdW5jdGlvbihmdW5jLCB3YWl0LCBhcmdzKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9LCB3YWl0KTtcbiAgfSk7XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBfLnBhcnRpYWwoXy5kZWxheSwgXywgMSk7XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciB0aW1lb3V0LCBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlID8gMCA6IF8ubm93KCk7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICBpZiAoIXRpbWVvdXQpIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9O1xuXG4gICAgdmFyIHRocm90dGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHRocm90dGxlZC5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHByZXZpb3VzID0gMDtcbiAgICAgIHRpbWVvdXQgPSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcblxuICAgIHJldHVybiB0aHJvdHRsZWQ7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHRpbWVvdXQsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKGNvbnRleHQsIGFyZ3MpIHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgaWYgKGFyZ3MpIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfTtcblxuICAgIHZhciBkZWJvdW5jZWQgPSByZXN0QXJndW1lbnRzKGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgIGlmICh0aW1lb3V0KSBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICBpZiAoaW1tZWRpYXRlKSB7XG4gICAgICAgIHZhciBjYWxsTm93ID0gIXRpbWVvdXQ7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgICAgaWYgKGNhbGxOb3cpIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gXy5kZWxheShsYXRlciwgd2FpdCwgdGhpcywgYXJncyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgbmVnYXRlZCB2ZXJzaW9uIG9mIHRoZSBwYXNzZWQtaW4gcHJlZGljYXRlLlxuICBfLm5lZ2F0ZSA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhcHJlZGljYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgc3RhcnQgPSBhcmdzLmxlbmd0aCAtIDE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGkgPSBzdGFydDtcbiAgICAgIHZhciByZXN1bHQgPSBhcmdzW3N0YXJ0XS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgd2hpbGUgKGktLSkgcmVzdWx0ID0gYXJnc1tpXS5jYWxsKHRoaXMsIHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIG9uIGFuZCBhZnRlciB0aGUgTnRoIGNhbGwuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIHVwIHRvIChidXQgbm90IGluY2x1ZGluZykgdGhlIE50aCBjYWxsLlxuICBfLmJlZm9yZSA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgdmFyIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPiAwKSB7XG4gICAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBpZiAodGltZXMgPD0gMSkgZnVuYyA9IG51bGw7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBfLnBhcnRpYWwoXy5iZWZvcmUsIDIpO1xuXG4gIF8ucmVzdEFyZ3VtZW50cyA9IHJlc3RBcmd1bWVudHM7XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gS2V5cyBpbiBJRSA8IDkgdGhhdCB3b24ndCBiZSBpdGVyYXRlZCBieSBgZm9yIGtleSBpbiAuLi5gIGFuZCB0aHVzIG1pc3NlZC5cbiAgdmFyIGhhc0VudW1CdWcgPSAhe3RvU3RyaW5nOiBudWxsfS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKTtcbiAgdmFyIG5vbkVudW1lcmFibGVQcm9wcyA9IFsndmFsdWVPZicsICdpc1Byb3RvdHlwZU9mJywgJ3RvU3RyaW5nJyxcbiAgICAncHJvcGVydHlJc0VudW1lcmFibGUnLCAnaGFzT3duUHJvcGVydHknLCAndG9Mb2NhbGVTdHJpbmcnXTtcblxuICB2YXIgY29sbGVjdE5vbkVudW1Qcm9wcyA9IGZ1bmN0aW9uKG9iaiwga2V5cykge1xuICAgIHZhciBub25FbnVtSWR4ID0gbm9uRW51bWVyYWJsZVByb3BzLmxlbmd0aDtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBvYmouY29uc3RydWN0b3I7XG4gICAgdmFyIHByb3RvID0gXy5pc0Z1bmN0aW9uKGNvbnN0cnVjdG9yKSAmJiBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgfHwgT2JqUHJvdG87XG5cbiAgICAvLyBDb25zdHJ1Y3RvciBpcyBhIHNwZWNpYWwgY2FzZS5cbiAgICB2YXIgcHJvcCA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgaWYgKGhhcyhvYmosIHByb3ApICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSBrZXlzLnB1c2gocHJvcCk7XG5cbiAgICB3aGlsZSAobm9uRW51bUlkeC0tKSB7XG4gICAgICBwcm9wID0gbm9uRW51bWVyYWJsZVByb3BzW25vbkVudW1JZHhdO1xuICAgICAgaWYgKHByb3AgaW4gb2JqICYmIG9ialtwcm9wXSAhPT0gcHJvdG9bcHJvcF0gJiYgIV8uY29udGFpbnMoa2V5cywgcHJvcCkpIHtcbiAgICAgICAga2V5cy5wdXNoKHByb3ApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3Mgb3duIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2AuXG4gIF8ua2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKG5hdGl2ZUtleXMpIHJldHVybiBuYXRpdmVLZXlzKG9iaik7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgYWxsIHRoZSBwcm9wZXJ0eSBuYW1lcyBvZiBhbiBvYmplY3QuXG4gIF8uYWxsS2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgICAvLyBBaGVtLCBJRSA8IDkuXG4gICAgaWYgKGhhc0VudW1CdWcpIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgb2JqZWN0LlxuICAvLyBJbiBjb250cmFzdCB0byBfLm1hcCBpdCByZXR1cm5zIGFuIG9iamVjdC5cbiAgXy5tYXBPYmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXNbaW5kZXhdO1xuICAgICAgcmVzdWx0c1tjdXJyZW50S2V5XSA9IGl0ZXJhdGVlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIC8vIFRoZSBvcHBvc2l0ZSBvZiBfLm9iamVjdC5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2AuXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYXNzaWduZXIgZnVuY3Rpb25zLlxuICB2YXIgY3JlYXRlQXNzaWduZXIgPSBmdW5jdGlvbihrZXlzRnVuYywgZGVmYXVsdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGlmIChkZWZhdWx0cykgb2JqID0gT2JqZWN0KG9iaik7XG4gICAgICBpZiAobGVuZ3RoIDwgMiB8fCBvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF0sXG4gICAgICAgICAgICBrZXlzID0ga2V5c0Z1bmMoc291cmNlKSxcbiAgICAgICAgICAgIGwgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoIWRlZmF1bHRzIHx8IG9ialtrZXldID09PSB2b2lkIDApIG9ialtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMpO1xuXG4gIC8vIEFzc2lnbnMgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIG93biBwcm9wZXJ0aWVzIGluIHRoZSBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICAvLyAoaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnbilcbiAgXy5leHRlbmRPd24gPSBfLmFzc2lnbiA9IGNyZWF0ZUFzc2lnbmVyKF8ua2V5cyk7XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3Qga2V5IG9uIGFuIG9iamVjdCB0aGF0IHBhc3NlcyBhIHByZWRpY2F0ZSB0ZXN0LlxuICBfLmZpbmRLZXkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKSwga2V5O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpba2V5XSwga2V5LCBvYmopKSByZXR1cm4ga2V5O1xuICAgIH1cbiAgfTtcblxuICAvLyBJbnRlcm5hbCBwaWNrIGhlbHBlciBmdW5jdGlvbiB0byBkZXRlcm1pbmUgaWYgYG9iamAgaGFzIGtleSBga2V5YC5cbiAgdmFyIGtleUluT2JqID0gZnVuY3Rpb24odmFsdWUsIGtleSwgb2JqKSB7XG4gICAgcmV0dXJuIGtleSBpbiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gcmVzdEFyZ3VtZW50cyhmdW5jdGlvbihvYmosIGtleXMpIHtcbiAgICB2YXIgcmVzdWx0ID0ge30sIGl0ZXJhdGVlID0ga2V5c1swXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpdGVyYXRlZSkpIHtcbiAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDEpIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwga2V5c1sxXSk7XG4gICAgICBrZXlzID0gXy5hbGxLZXlzKG9iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0ga2V5SW5PYmo7XG4gICAgICBrZXlzID0gZmxhdHRlbihrZXlzLCBmYWxzZSwgZmFsc2UpO1xuICAgICAgb2JqID0gT2JqZWN0KG9iaik7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IG9ialtrZXldO1xuICAgICAgaWYgKGl0ZXJhdGVlKHZhbHVlLCBrZXksIG9iaikpIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSByZXN0QXJndW1lbnRzKGZ1bmN0aW9uKG9iaiwga2V5cykge1xuICAgIHZhciBpdGVyYXRlZSA9IGtleXNbMF0sIGNvbnRleHQ7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpdGVyYXRlZSkpIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5uZWdhdGUoaXRlcmF0ZWUpO1xuICAgICAgaWYgKGtleXMubGVuZ3RoID4gMSkgY29udGV4dCA9IGtleXNbMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleXMgPSBfLm1hcChmbGF0dGVuKGtleXMsIGZhbHNlLCBmYWxzZSksIFN0cmluZyk7XG4gICAgICBpdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKGtleXMsIGtleSk7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gXy5waWNrKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpO1xuICB9KTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gY3JlYXRlQXNzaWduZXIoXy5hbGxLZXlzLCB0cnVlKTtcblxuICAvLyBDcmVhdGVzIGFuIG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gdGhlIGdpdmVuIHByb3RvdHlwZSBvYmplY3QuXG4gIC8vIElmIGFkZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgcHJvdmlkZWQgdGhlbiB0aGV5IHdpbGwgYmUgYWRkZWQgdG8gdGhlXG4gIC8vIGNyZWF0ZWQgb2JqZWN0LlxuICBfLmNyZWF0ZSA9IGZ1bmN0aW9uKHByb3RvdHlwZSwgcHJvcHMpIHtcbiAgICB2YXIgcmVzdWx0ID0gYmFzZUNyZWF0ZShwcm90b3R5cGUpO1xuICAgIGlmIChwcm9wcykgXy5leHRlbmRPd24ocmVzdWx0LCBwcm9wcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJucyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uaXNNYXRjaCA9IGZ1bmN0aW9uKG9iamVjdCwgYXR0cnMpIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhhdHRycyksIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICFsZW5ndGg7XG4gICAgdmFyIG9iaiA9IE9iamVjdChvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldIHx8ICEoa2V5IGluIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEsIGRlZXBFcTtcbiAgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT09IDEgLyBiO1xuICAgIC8vIGBudWxsYCBvciBgdW5kZWZpbmVkYCBvbmx5IGVxdWFsIHRvIGl0c2VsZiAoc3RyaWN0IGNvbXBhcmlzb24pLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS5cbiAgICBpZiAoYSAhPT0gYSkgcmV0dXJuIGIgIT09IGI7XG4gICAgLy8gRXhoYXVzdCBwcmltaXRpdmUgY2hlY2tzXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgYTtcbiAgICBpZiAodHlwZSAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBkZWVwRXEoYSwgYiwgYVN0YWNrLCBiU3RhY2spO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIGRlZXBFcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCByZWd1bGFyIGV4cHJlc3Npb25zLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb2VyY2VkIHRvIHN0cmluZ3MgZm9yIGNvbXBhcmlzb24gKE5vdGU6ICcnICsgL2EvaSA9PT0gJy9hL2knKVxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gJycgKyBhID09PSAnJyArIGI7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLlxuICAgICAgICAvLyBPYmplY3QoTmFOKSBpcyBlcXVpdmFsZW50IHRvIE5hTi5cbiAgICAgICAgaWYgKCthICE9PSArYSkgcmV0dXJuICtiICE9PSArYjtcbiAgICAgICAgLy8gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvciBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuICthID09PSAwID8gMSAvICthID09PSAxIC8gYiA6ICthID09PSArYjtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PT0gK2I7XG4gICAgICBjYXNlICdbb2JqZWN0IFN5bWJvbF0nOlxuICAgICAgICByZXR1cm4gU3ltYm9sUHJvdG8udmFsdWVPZi5jYWxsKGEpID09PSBTeW1ib2xQcm90by52YWx1ZU9mLmNhbGwoYik7XG4gICAgfVxuXG4gICAgdmFyIGFyZUFycmF5cyA9IGNsYXNzTmFtZSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICBpZiAoIWFyZUFycmF5cykge1xuICAgICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3RgcyBvciBgQXJyYXlgc1xuICAgICAgLy8gZnJvbSBkaWZmZXJlbnQgZnJhbWVzIGFyZS5cbiAgICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIGFDdG9yIGluc3RhbmNlb2YgYUN0b3IgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIGJDdG9yIGluc3RhbmNlb2YgYkN0b3IpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICYmICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cblxuICAgIC8vIEluaXRpYWxpemluZyBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICAvLyBJdCdzIGRvbmUgaGVyZSBzaW5jZSB3ZSBvbmx5IG5lZWQgdGhlbSBmb3Igb2JqZWN0cyBhbmQgYXJyYXlzIGNvbXBhcmlzb24uXG4gICAgYVN0YWNrID0gYVN0YWNrIHx8IFtdO1xuICAgIGJTdGFjayA9IGJTdGFjayB8fCBbXTtcbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09PSBhKSByZXR1cm4gYlN0YWNrW2xlbmd0aF0gPT09IGI7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuXG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGFyZUFycmF5cykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBsZW5ndGggPSBhLmxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzLlxuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIGlmICghZXEoYVtsZW5ndGhdLCBiW2xlbmd0aF0sIGFTdGFjaywgYlN0YWNrKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKGEpLCBrZXk7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzIGJlZm9yZSBjb21wYXJpbmcgZGVlcCBlcXVhbGl0eS5cbiAgICAgIGlmIChfLmtleXMoYikubGVuZ3RoICE9PSBsZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXJcbiAgICAgICAga2V5ID0ga2V5c1tsZW5ndGhdO1xuICAgICAgICBpZiAoIShoYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopICYmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikgfHwgXy5pc0FyZ3VtZW50cyhvYmopKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgcmV0dXJuIF8ua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvciwgaXNNYXAsIGlzV2Vha01hcCwgaXNTZXQsIGlzV2Vha1NldC5cbiAgXy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InLCAnU3ltYm9sJywgJ01hcCcsICdXZWFrTWFwJywgJ1NldCcsICdXZWFrU2V0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSA8IDkpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBoYXMob2JqLCAnY2FsbGVlJyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS4gV29yayBhcm91bmQgc29tZSB0eXBlb2YgYnVncyBpbiBvbGQgdjgsXG4gIC8vIElFIDExICgjMTYyMSksIFNhZmFyaSA4ICgjMTkyOSksIGFuZCBQaGFudG9tSlMgKCMyMjM2KS5cbiAgdmFyIG5vZGVsaXN0ID0gcm9vdC5kb2N1bWVudCAmJiByb290LmRvY3VtZW50LmNoaWxkTm9kZXM7XG4gIGlmICh0eXBlb2YgLy4vICE9ICdmdW5jdGlvbicgJiYgdHlwZW9mIEludDhBcnJheSAhPSAnb2JqZWN0JyAmJiB0eXBlb2Ygbm9kZWxpc3QgIT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICFfLmlzU3ltYm9sKG9iaikgJiYgaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/XG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIGlzTmFOKG9iaik7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICBpZiAoIV8uaXNBcnJheShwYXRoKSkge1xuICAgICAgcmV0dXJuIGhhcyhvYmosIHBhdGgpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gcGF0aC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IHBhdGhbaV07XG4gICAgICBpZiAob2JqID09IG51bGwgfHwgIWhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIG9iaiA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gISFsZW5ndGg7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRlZXMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvLyBQcmVkaWNhdGUtZ2VuZXJhdGluZyBmdW5jdGlvbnMuIE9mdGVuIHVzZWZ1bCBvdXRzaWRlIG9mIFVuZGVyc2NvcmUuXG4gIF8uY29uc3RhbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9O1xuXG4gIF8ubm9vcCA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBwYXNzZWQgYW4gb2JqZWN0LCB3aWxsIHRyYXZlcnNlIHRoYXQgb2JqZWN04oCZc1xuICAvLyBwcm9wZXJ0aWVzIGRvd24gdGhlIGdpdmVuIGBwYXRoYCwgc3BlY2lmaWVkIGFzIGFuIGFycmF5IG9mIGtleXMgb3IgaW5kZXhlcy5cbiAgXy5wcm9wZXJ0eSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBpZiAoIV8uaXNBcnJheShwYXRoKSkge1xuICAgICAgcmV0dXJuIHNoYWxsb3dQcm9wZXJ0eShwYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIGRlZXBHZXQob2JqLCBwYXRoKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlcyBhIGZ1bmN0aW9uIGZvciBhIGdpdmVuIG9iamVjdCB0aGF0IHJldHVybnMgYSBnaXZlbiBwcm9wZXJ0eS5cbiAgXy5wcm9wZXJ0eU9mID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKXt9O1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24ocGF0aCkge1xuICAgICAgcmV0dXJuICFfLmlzQXJyYXkocGF0aCkgPyBvYmpbcGF0aF0gOiBkZWVwR2V0KG9iaiwgcGF0aCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2ZcbiAgLy8gYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlciA9IF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBfLmV4dGVuZE93bih7fSwgYXR0cnMpO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmlzTWF0Y2gob2JqLCBhdHRycyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0ZWUoaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVzY2FwZU1hcCA9IHtcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmI3gyNzsnLFxuICAgICdgJzogJyYjeDYwOydcbiAgfTtcbiAgdmFyIHVuZXNjYXBlTWFwID0gXy5pbnZlcnQoZXNjYXBlTWFwKTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIHZhciBjcmVhdGVFc2NhcGVyID0gZnVuY3Rpb24obWFwKSB7XG4gICAgdmFyIGVzY2FwZXIgPSBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgcmV0dXJuIG1hcFttYXRjaF07XG4gICAgfTtcbiAgICAvLyBSZWdleGVzIGZvciBpZGVudGlmeWluZyBhIGtleSB0aGF0IG5lZWRzIHRvIGJlIGVzY2FwZWQuXG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsgXy5rZXlzKG1hcCkuam9pbignfCcpICsgJyknO1xuICAgIHZhciB0ZXN0UmVnZXhwID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgdmFyIHJlcGxhY2VSZWdleHAgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgIHJldHVybiB0ZXN0UmVnZXhwLnRlc3Qoc3RyaW5nKSA/IHN0cmluZy5yZXBsYWNlKHJlcGxhY2VSZWdleHAsIGVzY2FwZXIpIDogc3RyaW5nO1xuICAgIH07XG4gIH07XG4gIF8uZXNjYXBlID0gY3JlYXRlRXNjYXBlcihlc2NhcGVNYXApO1xuICBfLnVuZXNjYXBlID0gY3JlYXRlRXNjYXBlcih1bmVzY2FwZU1hcCk7XG5cbiAgLy8gVHJhdmVyc2VzIHRoZSBjaGlsZHJlbiBvZiBgb2JqYCBhbG9uZyBgcGF0aGAuIElmIGEgY2hpbGQgaXMgYSBmdW5jdGlvbiwgaXRcbiAgLy8gaXMgaW52b2tlZCB3aXRoIGl0cyBwYXJlbnQgYXMgY29udGV4dC4gUmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIGZpbmFsXG4gIC8vIGNoaWxkLCBvciBgZmFsbGJhY2tgIGlmIGFueSBjaGlsZCBpcyB1bmRlZmluZWQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqLCBwYXRoLCBmYWxsYmFjaykge1xuICAgIGlmICghXy5pc0FycmF5KHBhdGgpKSBwYXRoID0gW3BhdGhdO1xuICAgIHZhciBsZW5ndGggPSBwYXRoLmxlbmd0aDtcbiAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgcmV0dXJuIF8uaXNGdW5jdGlvbihmYWxsYmFjaykgPyBmYWxsYmFjay5jYWxsKG9iaikgOiBmYWxsYmFjaztcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHByb3AgPSBvYmogPT0gbnVsbCA/IHZvaWQgMCA6IG9ialtwYXRoW2ldXTtcbiAgICAgIGlmIChwcm9wID09PSB2b2lkIDApIHtcbiAgICAgICAgcHJvcCA9IGZhbGxiYWNrO1xuICAgICAgICBpID0gbGVuZ3RoOyAvLyBFbnN1cmUgd2UgZG9uJ3QgY29udGludWUgaXRlcmF0aW5nLlxuICAgICAgfVxuICAgICAgb2JqID0gXy5pc0Z1bmN0aW9uKHByb3ApID8gcHJvcC5jYWxsKG9iaikgOiBwcm9wO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGU6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGU6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZTogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogXCInXCIsXG4gICAgJ1xcXFwnOiAnXFxcXCcsXG4gICAgJ1xccic6ICdyJyxcbiAgICAnXFxuJzogJ24nLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlUmVnRXhwID0gL1xcXFx8J3xcXHJ8XFxufFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIHZhciBlc2NhcGVDaGFyID0gZnVuY3Rpb24obWF0Y2gpIHtcbiAgICByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07XG4gIH07XG5cbiAgLy8gSmF2YVNjcmlwdCBtaWNyby10ZW1wbGF0aW5nLCBzaW1pbGFyIHRvIEpvaG4gUmVzaWcncyBpbXBsZW1lbnRhdGlvbi5cbiAgLy8gVW5kZXJzY29yZSB0ZW1wbGF0aW5nIGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlcyB3aGl0ZXNwYWNlLFxuICAvLyBhbmQgY29ycmVjdGx5IGVzY2FwZXMgcXVvdGVzIHdpdGhpbiBpbnRlcnBvbGF0ZWQgY29kZS5cbiAgLy8gTkI6IGBvbGRTZXR0aW5nc2Agb25seSBleGlzdHMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgc2V0dGluZ3MsIG9sZFNldHRpbmdzKSB7XG4gICAgaWYgKCFzZXR0aW5ncyAmJiBvbGRTZXR0aW5ncykgc2V0dGluZ3MgPSBvbGRTZXR0aW5ncztcbiAgICBzZXR0aW5ncyA9IF8uZGVmYXVsdHMoe30sIHNldHRpbmdzLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuXG4gICAgLy8gQ29tYmluZSBkZWxpbWl0ZXJzIGludG8gb25lIHJlZ3VsYXIgZXhwcmVzc2lvbiB2aWEgYWx0ZXJuYXRpb24uXG4gICAgdmFyIG1hdGNoZXIgPSBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpLnJlcGxhY2UoZXNjYXBlUmVnRXhwLCBlc2NhcGVDaGFyKTtcbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfSBlbHNlIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuXG4gICAgICAvLyBBZG9iZSBWTXMgbmVlZCB0aGUgbWF0Y2ggcmV0dXJuZWQgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBvZmZzZXQuXG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyAncmV0dXJuIF9fcDtcXG4nO1xuXG4gICAgdmFyIHJlbmRlcjtcbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHZhciBhcmd1bWVudCA9IHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonO1xuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgYXJndW1lbnQgKyAnKXtcXG4nICsgc291cmNlICsgJ30nO1xuXG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9O1xuXG4gIC8vIEFkZCBhIFwiY2hhaW5cIiBmdW5jdGlvbi4gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGluc3RhbmNlID0gXyhvYmopO1xuICAgIGluc3RhbmNlLl9jaGFpbiA9IHRydWU7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciBjaGFpblJlc3VsdCA9IGZ1bmN0aW9uKGluc3RhbmNlLCBvYmopIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgXy5lYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBjaGFpblJlc3VsdCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIF87XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PT0gJ3NoaWZ0JyB8fCBuYW1lID09PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiBjaGFpblJlc3VsdCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBfLmVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBjaGFpblJlc3VsdCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gIF8ucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gUHJvdmlkZSB1bndyYXBwaW5nIHByb3h5IGZvciBzb21lIG1ldGhvZHMgdXNlZCBpbiBlbmdpbmUgb3BlcmF0aW9uc1xuICAvLyBzdWNoIGFzIGFyaXRobWV0aWMgYW5kIEpTT04gc3RyaW5naWZpY2F0aW9uLlxuICBfLnByb3RvdHlwZS52YWx1ZU9mID0gXy5wcm90b3R5cGUudG9KU09OID0gXy5wcm90b3R5cGUudmFsdWU7XG5cbiAgXy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gU3RyaW5nKHRoaXMuX3dyYXBwZWQpO1xuICB9O1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59KCkpO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvZG1pdHJpeS9Xb3JrL3RpdGFuaXVtL2NvdW50ZXIvUmVzb3VyY2VzL2lwaG9uZS9hbGxveSJ9

var Alloy = require('/alloy'),
Backbone = Alloy.Backbone,
_ = Alloy._;




function __processArg(obj, key) {
  var arg = null;
  if (obj) {
    arg = obj[key] || null;
  }
  return arg;
}

function Controller() {

  require('/alloy/controllers/' + 'BaseController').apply(this, Array.prototype.slice.call(arguments));
  this.__controllerPath = 'index';
  this.args = arguments[0] || {};

  if (arguments[0]) {
    var __parentSymbol = __processArg(arguments[0], '__parentSymbol');
    var $model = __processArg(arguments[0], '$model');
    var __itemTemplate = __processArg(arguments[0], '__itemTemplate');
  }
  var $ = this;
  var exports = {};
  var __defers = {};

  // Generated code that must be executed before all UI and/or
  // controller code. One example is all model and collection
  // declarations from markup.


  // Generated UI code
  $.__views.__alloyId0 = Ti.UI.createWindow(
  { backgroundColor: "#fafafa", title: "Number Counter", id: "__alloyId0" });

  $.__views.minus = Ti.UI.createButton(
  { width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", color: "#000", borderColor: "#c3c3c3", font: { fontSize: 20 }, left: 100, title: '-', id: "minus" });

  $.__views.__alloyId0.add($.__views.minus);
  doCounter ? $.addListener($.__views.minus, 'click', doCounter) : __defers['$.__views.minus!click!doCounter'] = true;$.__views.label = Ti.UI.createLabel(
  { width: 150, textAlign: "center", color: "#000", font: { fontSize: 28 }, text: '0', id: "label" });

  $.__views.__alloyId0.add($.__views.label);
  $.__views.plus = Ti.UI.createButton(
  { width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", color: "#000", borderColor: "#c3c3c3", font: { fontSize: 20 }, right: 100, title: '+', id: "plus" });

  $.__views.__alloyId0.add($.__views.plus);
  doCounter ? $.addListener($.__views.plus, 'click', doCounter) : __defers['$.__views.plus!click!doCounter'] = true;$.__views.index = Ti.UI.createNavigationWindow(
  { window: $.__views.__alloyId0, id: "index" });

  $.__views.index && $.addTopLevelView($.__views.index);
  exports.destroy = function () {};

  // make all IDed elements in $.__views available right on the $ in a
  // controller's internal code. Externally the IDed elements will
  // be accessed with getView().
  _.extend($, $.__views);

  // Controller code directly from the developer's controller file
  function doCounter(e) {
    $.label.text = parseInt($.label.text) + 1;
  }

  $.index.open();

  // Generated code that must be executed after all UI and
  // controller code. One example deferred event handlers whose
  // functions are not defined until after the controller code
  // is executed.
  __defers['$.__views.minus!click!doCounter'] && $.addListener($.__views.minus, 'click', doCounter);__defers['$.__views.plus!click!doCounter'] && $.addListener($.__views.plus, 'click', doCounter);

  // Extend the $ instance with all functions and properties
  // defined on the exports object.
  _.extend($, exports);
}

module.exports = Controller;
//# sourceMappingURL=file:///Users/dmitriy/Work/titanium/counter/build/map/Resources/iphone/alloy/controllers/index.js.map
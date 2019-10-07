var Alloy = require('/alloy'),
Backbone = Alloy.Backbone,
_ = Alloy._;

/**
              * @class Alloy.Controller
              * @extends Backbone.Events
              * The base class for Alloy controllers.
              *
              * Each controller is associated with a UI hierarchy, defined in an XML file in the
              * `views` folder. Each element in the view hierarchy is either a Titanium {@link Titanium.UI.View View}
              * or another Alloy controller or widget. Each Alloy controller or widget can additionally contain
              * Titanium Views and/or more controllers and widgets.
              *
              */
var Controller = function Controller() {
  var roots = [];
  var self = this;

  function getControllerParam() {
    return self.__widgetId ? {
      widgetId: self.__widgetId,
      name: self.__controllerPath } :
    self.__controllerPath;
  }

  this.__iamalloy = true;
  _.extend(this, Backbone.Events, {
    __views: {},
    __events: [],
    __proxyProperties: {},
    setParent: function setParent(parent) {
      var len = roots.length;

      if (!len) {return;}

      if (parent.__iamalloy) {
        this.parent = parent.parent;
      } else {
        this.parent = parent;
      }

      for (var i = 0; i < len; i++) {
        if (roots[i].__iamalloy) {
          roots[i].setParent(this.parent);
        } else {
          this.parent.add(roots[i]);
        }
      }
    },
    addTopLevelView: function addTopLevelView(view) {
      roots.push(view);
    },
    addProxyProperty: function addProxyProperty(key, value) {
      this.__proxyProperties[key] = value;
    },
    removeProxyProperty: function removeProxyProperty(key) {
      delete this.__proxyProperties[key];
    },

    /**
        * @method getTopLevelViews
        * Returns a list of the root view elements associated with this controller.
       	 * #### Example
        * The following example displays the `id` of each top-level view associated with the
        * controller:
       // index.js
       var views = $.getTopLevelViews();
       for (each in views) {
       var view = views[each];
       console.log(view.id);
       }
       	 *
        *
        * @return {Array.<(Titanium.UI.View|Alloy.Controller)>}
        */



    getTopLevelViews: function getTopLevelViews() {
      return roots;
    },

    /**
        * @method getView
        * Returns the specified view associated with this controller.
        *
        * If no `id` is specified, returns the first top-level view.
        *
        * #### Example
        * The following example gets a reference to a `<Window/>` object
        * with the `id` of "loginWin" and then calls its [open()](Titanium.UI.Window) method.
       var loginWindow = $.getView('loginWin');
       loginWindow.open();
        *
        * @param {String} [id] ID of the view to return.
        * @return {Titanium.UI.View/Alloy.Controller}
        */

    getView: function getView(id) {
      if (typeof id === 'undefined' || id === null) {
        return roots[0];
      }
      return this.__views[id];
    },
    removeView: function removeView(id) {
      delete this[id];
      delete this.__views[id];
    },

    getProxyProperty: function getProxyProperty(name) {
      return this.__proxyProperties[name];
    },

    /**
        * @method getViews
        * Returns a list of all IDed view elements associated with this controller.
        *
        * #### Example
        * Given the following XML view:
       <Alloy>
       <TabGroup id="tabs">
       	<Tab title="Tab 1" icon="KS_nav_ui.png" id="tab1">
       		<Window title="Tab 1" id="win1">
       			<Label id="label1">I am Window 1</Label>
       		</Window>
       	</Tab>
       	<Tab title="Tab 2" icon="KS_nav_views.png" id="tab2">
       		<Window title="Tab 2" id="wind2">
       			<Label id="label2">I am Window 2</Label>
       		</Window>
       	</Tab>
       </TabGroup>
       <View id="otherview"></View>
       </Alloy>
       	* The following view-controller outputs the id of each view in the hierarchy.
       var views = $.getViews();
       for (each in views) {
       var view = views[each];
       console.log(view.id);
       }
       [INFO] :   win1
       [INFO] :   label1
       [INFO] :   tab1
       [INFO] :   wind2
       [INFO] :   label2
       [INFO] :   tab2
       [INFO] :   tabs
       [INFO] :   otherview
       	 * @return {Array.<(Titanium.UI.View|Alloy.Controller)>}
        */





    getViews: function getViews() {
      return this.__views;
    },

    /**
        * @method destroy
        * Frees binding resources associated with this controller and its
        * UI components. It is critical that this is called when employing
        * model/collection binding in order to avoid potential memory leaks.
        * $.destroy() should be called whenever a controller's UI is to
        * be "closed" or removed from the app. See the [Destroying Data Bindings](#!/guide/Destroying_Data_Bindings)
        * test application for an example of this approach.
       	 * #### Example
        * In the following example the view-controller for a {@link Titanium.UI.Window Window} object named `dialog`
        * calls its `destroy()` method in response to the Window object being closed.
       	$.dialog.addEventListener('close', function() {
       $.destroy();
       });
        */



    destroy: function destroy() {
      // destroy() is defined during the compile process based on
      // the UI components and binding contained within the controller.
    },

    // getViewEx for advanced parsing and element traversal
    getViewEx: function getViewEx(opts) {
      var recurse = opts.recurse || false;
      if (recurse) {
        var view = this.getView();
        if (!view) {
          return null;
        } else if (view.__iamalloy) {
          return view.getViewEx({ recurse: true });
        } else {
          return view;
        }
      } else {
        return this.getView();
      }
    },

    // getProxyPropertyEx for advanced parsing and element traversal
    getProxyPropertyEx: function getProxyPropertyEx(name, opts) {
      var recurse = opts.recurse || false;
      if (recurse) {
        var view = this.getProxyProperty(name);
        if (!view) {
          return null;
        } else if (view.__iamalloy) {
          return view.getProxyProperty(name, { recurse: true });
        } else {
          return view;
        }
      } else {
        return this.getView(name);
      }
    },

    /**
        * @method createStyle
        * Creates a dictionary of properties based on the specified styles.
        *
        *
        * You can use this dictionary with the view object's
        * {@link Titanium.UI.View#method-applyProperties applyProperties} method
        * or a create object method, such as {@link Titanium.UI#method-createView Titanium.UI.createView}.
        * #### Examples
        * The following creates a new style object that is passed as a parameter
        * to the {@link Titanium.UI#method-createLabel Ti.UI.createLabel()} method.
       var styleArgs = {
       apiName: 'Ti.UI.Label',
       classes: ['blue','shadow','large'],
       id: 'tester',
       borderWidth: 2,
       borderRadius: 16,
       borderColor: '#000'
       };
       var styleObject = $.createStyle(styleArgs);
       testLabel = Ti.UI.createLabel(styleObject);
       	 * The next example uses the {@link Titanium#method-applyProperties applyProperties()} method
        * to apply a style object to an existing Button control (button not shown).
       var style = $.createStyle({
       classes: args.button,
       apiName: 'Button',
       color: 'blue'
       });
       $.button.applyProperties(style);
        * @param {AlloyStyleDict} opts Dictionary of styles to apply.
        *
        * @return {Dictionary}
        * @since 1.2.0
       	 */




    createStyle: function createStyle(opts) {
      return Alloy.createStyle(getControllerParam(), opts);
    },

    /*
        * Documented in docs/apidoc/controller.js
        */
    UI: {
      create: function create(apiName, opts) {
        return Alloy.UI.create(getControllerParam(), apiName, opts);
      } },


    /**
            * @method addClass
            * Adds a TSS class to the specified view object.
            *
            * You can apply additional styles with the `opts` parameter. To use this method
            * effectively you may need to enable autostyling
            * on the target XML view. See [Autostyle](#!/guide/Dynamic_Styles-section-37530415_DynamicStyles-Autostyle)
            * in the Alloy developer guide.
            * #### Example
            * The following adds the TSS classes ".redbg" and ".bigger" to a {@link Titanium.UI.Label}
            * object proxy `label1`, and also sets the label's `text` property to "Cancel".
           // index.js
           $.addClass($.label1, 'redbg bigger', {text: "Cancel"});
           The 'redbg' and 'bigger' classes are shown below:
           // index.tss
           ".redbg" : {
           color: 'red'
           }
           ".bigger": {
           font : {
              fontSize: '36'
           }
           }
           	 * @param {Object} proxy View object to which to add class(es).
            * @param {Array<String>/String} classes Array or space-separated list of classes to apply.
            * @param {Dictionary} [opts] Dictionary of properties to apply after classes have been added.
            * @since 1.2.0
            */




    addClass: function addClass(proxy, classes, opts) {
      return Alloy.addClass(getControllerParam(), proxy, classes, opts);
    },

    /**
        * @method removeClass
        * Removes a TSS class from the specified view object.
        *
        * You can apply additional styles after the removal with the `opts` parameter.
        * To use this method effectively you may need to enable autostyling
        * on the target XML view. See [Autostyle](#!/guide/Dynamic_Styles-section-37530415_DynamicStyles-Autostyle)
        * in the Alloy developer guide.
        * #### Example
        * The following removes the "redbg" and "bigger" TSS classes from a {@link Titanium.UI.Label}
        * object proxy `label1`, and also sets the label's `text` property to "...".
       $.removeClass($.label1, 'redbg bigger', {text: "..."});
       	 * @param {Object} proxy View object from which to remove class(es).
        * @param {Array<String>/String} classes Array or space-separated list of classes to remove.
        * @param {Dictionary} [opts] Dictionary of properties to apply after the class removal.
        * @since 1.2.0
        */


    removeClass: function removeClass(proxy, classes, opts) {
      return Alloy.removeClass(getControllerParam(), proxy, classes, opts);
    },

    /**
        * @method resetClass
        * Sets the array of TSS classes for the target View object, adding the classes specified and
        * removing any applied classes that are not specified.
        *
        * You can apply classes or styles after the reset using the `classes` or `opts` parameters.
        * To use this method effectively you may need to enable autostyling
        * on the target XML view. See [Autostyle](#!/guide/Dynamic_Styles-section-37530415_DynamicStyles-Autostyle)
        * in the Alloy developer guide.
       	 * #### Example
        * The following removes all previously applied styles on `label1` and then applies
        * the TSS class 'no-style'.
       $.resetClass($.label1, 'no-style');
        * @param {Object} proxy View object to reset.
        * @param {Array<String>/String} [classes] Array or space-separated list of classes to apply after the reset.
        * @param {Dictionary} [opts] Dictionary of properties to apply after the reset.
        * @since 1.2.0
        */


    resetClass: function resetClass(proxy, classes, opts) {
      return Alloy.resetClass(getControllerParam(), proxy, classes, opts);
    },

    /**
        * @method updateViews
        * Applies a set of properties to view elements associated with this controller.
        * This method is useful for setting properties on repeated elements such as
        * {@link Titanium.UI.TableViewRow TableViewRow} objects, rather than needing to have a controller
        * for those child controllers.
        * #### Example
        * The following example uses this method to update a Label inside a TableViewRow object
        * before adding it to a TableView.
       	 * View-controller file: controllers/index.js
       for (var i=0; i < 10; i++) {
        var row = Alloy.createController("tablerow");
        row.updateViews({
        	"#theLabel": {
        		text: "I am row #" + i
        	}
        });
        $.tableView.appendRow(row.getView());
       };
       		 * XML view: views/tablerow.xml
       <Alloy>
       <TableViewRow>
       	<Label id="theLabel"></Label>
       </TableViewRow>
       </Alloy>
       		 * XML view: views/index.xml
       <TableView id="tableView">
       </TableView>
        * @param {Object} args An object whose keys are the IDs (in form '#id') of views to which the styles will be applied.
        * @since 1.4.0
       	 */







    updateViews: function updateViews(args) {
      var views = this.getViews();
      if (_.isObject(args)) {
        _.each(_.keys(args), function (key) {
          var elem = views[key.substring(1)];
          if (key.indexOf('#') === 0 && key !== '#' && _.isObject(elem) && typeof elem.applyProperties === 'function') {
            // apply the properties but make sure we're applying them to a Ti.UI object (not a controller)
            elem.applyProperties(args[key]);
          }
        });
      }
      return this;
    },

    /**
        * @method addListener
        * Adds a tracked event listeners to a view proxy object.
        * By default, any event listener declared in XML is tracked by Alloy.
        *
        * #### Example
        * Add an event to the tracking target.
       $.addListener($.aView, 'click', onClick);
       	 * @param {Object} proxy Proxy view object to listen to.
        * @param {String} type Name of the event.
        * @param {Function} callback Callback function to invoke when the event is fired.
        * @returns {String} ID attribute of the view object.  If one does not exist, Alloy will create a unique ID.
        * @since 1.7.0
        */


    addListener: function addListener(proxy, type, callback) {
      if (!proxy.id) {
        proxy.id = _.uniqueId('__trackId');

        if (_.has(this.__views, proxy.id)) {
          Ti.API.error('$.addListener: ' + proxy.id + ' was conflict.');
          return;
        }
      }

      proxy.addEventListener(type, callback);
      this.__events.push({
        id: proxy.id,
        view: proxy,
        type: type,
        handler: callback });


      return proxy.id;
    },

    /**
        * @method getListener
        * Gets all the tracked event listeners of the view-controller or
        * only the ones specified by the parameters.  Passing no parameters,
        * retrieves all tracked event listeners. Set a parameter to `null`
        * if you do not want to restrict the match to that parameter.
        *
        * #### Example
        * Get all events bound to the view-controller.
       var listener = $.getListener();
       	 * @param {Object} [proxy] Proxy view object.
        * @param {String} [type] Name of the event.
        * @returns {Array<TrackedEventListener>} List of tracked event listeners.
        * @since 1.7.0
        */



    getListener: function getListener(proxy, type) {
      return _.filter(this.__events, function (event, index) {
        if ((!proxy || proxy.id === event.id) && (
        !type || type === event.type)) {
          return true;
        }

        return false;
      });
    },

    /**
        * @method removeListener
        * Removes all tracked event listeners or only the ones
        * specified by the parameters. Passing no parameters,
        * removes all tracked event listeners.  Set a parameter to `null`
        * if you do not want to restrict the match to that parameter.
        *
        * #### Example
        * When the window is closed, remove all tracked event listeners.
       <Alloy>
       <Window onOpen="doOpen" onClose="doClose">
       	<Label id="label" onClick="doClick">Hello, world</Label>
       </Window>
       </Alloy>
       function doClose() {
       $.removeListener();
       }
        * @param {Object} [proxy] Proxy view object to remove event listeners from.
        * @param {String} [type] Name of the event to remove.
        * @param {Function} [callback] Callback to remove.
        * @returns {Alloy.Controller} Controller instance.
        * @since 1.7.0
        */


    removeListener: function removeListener(proxy, type, callback) {
      this.__events.forEach(function (event, index) {
        if ((!proxy || proxy.id === event.id) && (
        !type || type === event.type) && (
        !callback || callback === event.handler)) {
          event.view.removeEventListener(event.type, event.handler);
          delete self.__events[index];
        }
      });
      return this;
    } });

};
module.exports = Controller;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkJhc2VDb250cm9sbGVyLmpzIl0sIm5hbWVzIjpbIkFsbG95IiwicmVxdWlyZSIsIkJhY2tib25lIiwiXyIsIkNvbnRyb2xsZXIiLCJyb290cyIsInNlbGYiLCJnZXRDb250cm9sbGVyUGFyYW0iLCJfX3dpZGdldElkIiwid2lkZ2V0SWQiLCJuYW1lIiwiX19jb250cm9sbGVyUGF0aCIsIl9faWFtYWxsb3kiLCJleHRlbmQiLCJFdmVudHMiLCJfX3ZpZXdzIiwiX19ldmVudHMiLCJfX3Byb3h5UHJvcGVydGllcyIsInNldFBhcmVudCIsInBhcmVudCIsImxlbiIsImxlbmd0aCIsImkiLCJhZGQiLCJhZGRUb3BMZXZlbFZpZXciLCJ2aWV3IiwicHVzaCIsImFkZFByb3h5UHJvcGVydHkiLCJrZXkiLCJ2YWx1ZSIsInJlbW92ZVByb3h5UHJvcGVydHkiLCJnZXRUb3BMZXZlbFZpZXdzIiwiZ2V0VmlldyIsImlkIiwicmVtb3ZlVmlldyIsImdldFByb3h5UHJvcGVydHkiLCJnZXRWaWV3cyIsImRlc3Ryb3kiLCJnZXRWaWV3RXgiLCJvcHRzIiwicmVjdXJzZSIsImdldFByb3h5UHJvcGVydHlFeCIsImNyZWF0ZVN0eWxlIiwiVUkiLCJjcmVhdGUiLCJhcGlOYW1lIiwiYWRkQ2xhc3MiLCJwcm94eSIsImNsYXNzZXMiLCJyZW1vdmVDbGFzcyIsInJlc2V0Q2xhc3MiLCJ1cGRhdGVWaWV3cyIsImFyZ3MiLCJ2aWV3cyIsImlzT2JqZWN0IiwiZWFjaCIsImtleXMiLCJlbGVtIiwic3Vic3RyaW5nIiwiaW5kZXhPZiIsImFwcGx5UHJvcGVydGllcyIsImFkZExpc3RlbmVyIiwidHlwZSIsImNhbGxiYWNrIiwidW5pcXVlSWQiLCJoYXMiLCJUaSIsIkFQSSIsImVycm9yIiwiYWRkRXZlbnRMaXN0ZW5lciIsImhhbmRsZXIiLCJnZXRMaXN0ZW5lciIsImZpbHRlciIsImV2ZW50IiwiaW5kZXgiLCJyZW1vdmVMaXN0ZW5lciIsImZvckVhY2giLCJyZW1vdmVFdmVudExp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QXdCLFVBQVN5RCxLQUFULEVBQWdCQyxLQUFoQixFQUF1QjtBQUNyRCxZQUFJLENBQUMsQ0FBQzNCLEtBQUQsSUFBVUEsS0FBSyxDQUFDZCxFQUFOLEtBQWF3QyxLQUFLLENBQUN4QyxFQUE5QjtBQUNGLFNBQUM2QixJQUFELElBQVNBLElBQUksS0FBS1csS0FBSyxDQUFDWCxJQUR0QixDQUFKLEVBQ2lDO0FBQ2hDLGlCQUFPLElBQVA7QUFDQTs7QUFFRCxlQUFPLEtBQVA7QUFDQSxPQVBNLENBQVA7QUFRQSxLQXhiOEI7O0FBMGIvQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXlCQWEsSUFBQUEsY0FBYyxFQUFFLHdCQUFTNUIsS0FBVCxFQUFnQmUsSUFBaEIsRUFBc0JDLFFBQXRCLEVBQWdDO0FBQy9DLFdBQUsvQyxRQUFMLENBQWM0RCxPQUFkLENBQXNCLFVBQVNILEtBQVQsRUFBZ0JDLEtBQWhCLEVBQXVCO0FBQzVDLFlBQUksQ0FBQyxDQUFDM0IsS0FBRCxJQUFVQSxLQUFLLENBQUNkLEVBQU4sS0FBYXdDLEtBQUssQ0FBQ3hDLEVBQTlCO0FBQ0YsU0FBQzZCLElBQUQsSUFBU0EsSUFBSSxLQUFLVyxLQUFLLENBQUNYLElBRHRCO0FBRUYsU0FBQ0MsUUFBRCxJQUFhQSxRQUFRLEtBQUtVLEtBQUssQ0FBQ0gsT0FGOUIsQ0FBSixFQUU0QztBQUMzQ0csVUFBQUEsS0FBSyxDQUFDaEQsSUFBTixDQUFXb0QsbUJBQVgsQ0FBK0JKLEtBQUssQ0FBQ1gsSUFBckMsRUFBMkNXLEtBQUssQ0FBQ0gsT0FBakQ7QUFDQSxpQkFBT2hFLElBQUksQ0FBQ1UsUUFBTCxDQUFjMEQsS0FBZCxDQUFQO0FBQ0E7QUFDRCxPQVBEO0FBUUEsYUFBTyxJQUFQO0FBQ0EsS0E3ZDhCLEVBQWhDOztBQStkQSxDQTNlRDtBQTRlQUksTUFBTSxDQUFDQyxPQUFQLEdBQWlCM0UsVUFBakIiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgQWxsb3kgPSByZXF1aXJlKCcvYWxsb3knKSxcblx0QmFja2JvbmUgPSBBbGxveS5CYWNrYm9uZSxcblx0XyA9IEFsbG95Ll87XG5cbi8qKlxuICogQGNsYXNzIEFsbG95LkNvbnRyb2xsZXJcbiAqIEBleHRlbmRzIEJhY2tib25lLkV2ZW50c1xuICogVGhlIGJhc2UgY2xhc3MgZm9yIEFsbG95IGNvbnRyb2xsZXJzLlxuICpcbiAqIEVhY2ggY29udHJvbGxlciBpcyBhc3NvY2lhdGVkIHdpdGggYSBVSSBoaWVyYXJjaHksIGRlZmluZWQgaW4gYW4gWE1MIGZpbGUgaW4gdGhlXG4gKiBgdmlld3NgIGZvbGRlci4gRWFjaCBlbGVtZW50IGluIHRoZSB2aWV3IGhpZXJhcmNoeSBpcyBlaXRoZXIgYSBUaXRhbml1bSB7QGxpbmsgVGl0YW5pdW0uVUkuVmlldyBWaWV3fVxuICogb3IgYW5vdGhlciBBbGxveSBjb250cm9sbGVyIG9yIHdpZGdldC4gRWFjaCBBbGxveSBjb250cm9sbGVyIG9yIHdpZGdldCBjYW4gYWRkaXRpb25hbGx5IGNvbnRhaW5cbiAqIFRpdGFuaXVtIFZpZXdzIGFuZC9vciBtb3JlIGNvbnRyb2xsZXJzIGFuZCB3aWRnZXRzLlxuICpcbiAqL1xudmFyIENvbnRyb2xsZXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIHJvb3RzID0gW107XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRmdW5jdGlvbiBnZXRDb250cm9sbGVyUGFyYW0oKSB7XG5cdFx0cmV0dXJuIHNlbGYuX193aWRnZXRJZCA/IHtcblx0XHRcdHdpZGdldElkOiBzZWxmLl9fd2lkZ2V0SWQsXG5cdFx0XHRuYW1lOiBzZWxmLl9fY29udHJvbGxlclBhdGhcblx0XHR9IDogc2VsZi5fX2NvbnRyb2xsZXJQYXRoO1xuXHR9XG5cblx0dGhpcy5fX2lhbWFsbG95ID0gdHJ1ZTtcblx0Xy5leHRlbmQodGhpcywgQmFja2JvbmUuRXZlbnRzLCB7XG5cdFx0X192aWV3czoge30sXG5cdFx0X19ldmVudHM6IFtdLFxuXHRcdF9fcHJveHlQcm9wZXJ0aWVzOiB7fSxcblx0XHRzZXRQYXJlbnQ6IGZ1bmN0aW9uKHBhcmVudCkge1xuXHRcdFx0dmFyIGxlbiA9IHJvb3RzLmxlbmd0aDtcblxuXHRcdFx0aWYgKCFsZW4pIHsgcmV0dXJuOyB9XG5cblx0XHRcdGlmIChwYXJlbnQuX19pYW1hbGxveSkge1xuXHRcdFx0XHR0aGlzLnBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnBhcmVudCA9IHBhcmVudDtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHRpZiAocm9vdHNbaV0uX19pYW1hbGxveSkge1xuXHRcdFx0XHRcdHJvb3RzW2ldLnNldFBhcmVudCh0aGlzLnBhcmVudCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5wYXJlbnQuYWRkKHJvb3RzW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YWRkVG9wTGV2ZWxWaWV3OiBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRyb290cy5wdXNoKHZpZXcpO1xuXHRcdH0sXG5cdFx0YWRkUHJveHlQcm9wZXJ0eTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRcdFx0dGhpcy5fX3Byb3h5UHJvcGVydGllc1trZXldID0gdmFsdWU7XG5cdFx0fSxcblx0XHRyZW1vdmVQcm94eVByb3BlcnR5OiBmdW5jdGlvbihrZXkpIHtcblx0XHRcdGRlbGV0ZSB0aGlzLl9fcHJveHlQcm9wZXJ0aWVzW2tleV07XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEBtZXRob2QgZ2V0VG9wTGV2ZWxWaWV3c1xuXHRcdCAqIFJldHVybnMgYSBsaXN0IG9mIHRoZSByb290IHZpZXcgZWxlbWVudHMgYXNzb2NpYXRlZCB3aXRoIHRoaXMgY29udHJvbGxlci5cblxuXHRcdCAqICMjIyMgRXhhbXBsZVxuXHRcdCAqIFRoZSBmb2xsb3dpbmcgZXhhbXBsZSBkaXNwbGF5cyB0aGUgYGlkYCBvZiBlYWNoIHRvcC1sZXZlbCB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGVcblx0XHQgKiBjb250cm9sbGVyOlxuXG5cdC8vIGluZGV4LmpzXG5cdHZhciB2aWV3cyA9ICQuZ2V0VG9wTGV2ZWxWaWV3cygpO1xuXHRmb3IgKGVhY2ggaW4gdmlld3MpIHtcblx0XHR2YXIgdmlldyA9IHZpZXdzW2VhY2hdO1xuXHRcdGNvbnNvbGUubG9nKHZpZXcuaWQpO1xuXHR9XG5cblx0XHQgKlxuXHRcdCAqXG5cdFx0ICogQHJldHVybiB7QXJyYXkuPChUaXRhbml1bS5VSS5WaWV3fEFsbG95LkNvbnRyb2xsZXIpPn1cblx0XHQgKi9cblx0XHRnZXRUb3BMZXZlbFZpZXdzOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiByb290cztcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCBnZXRWaWV3XG5cdFx0ICogUmV0dXJucyB0aGUgc3BlY2lmaWVkIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoaXMgY29udHJvbGxlci5cblx0XHQgKlxuXHRcdCAqIElmIG5vIGBpZGAgaXMgc3BlY2lmaWVkLCByZXR1cm5zIHRoZSBmaXJzdCB0b3AtbGV2ZWwgdmlldy5cblx0XHQgKlxuXHRcdCAqICMjIyMgRXhhbXBsZVxuXHRcdCAqIFRoZSBmb2xsb3dpbmcgZXhhbXBsZSBnZXRzIGEgcmVmZXJlbmNlIHRvIGEgYDxXaW5kb3cvPmAgb2JqZWN0XG5cdFx0ICogd2l0aCB0aGUgYGlkYCBvZiBcImxvZ2luV2luXCIgYW5kIHRoZW4gY2FsbHMgaXRzIFtvcGVuKCldKFRpdGFuaXVtLlVJLldpbmRvdykgbWV0aG9kLlxuXG5cdHZhciBsb2dpbldpbmRvdyA9ICQuZ2V0VmlldygnbG9naW5XaW4nKTtcblx0bG9naW5XaW5kb3cub3BlbigpO1xuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtTdHJpbmd9IFtpZF0gSUQgb2YgdGhlIHZpZXcgdG8gcmV0dXJuLlxuXHRcdCAqIEByZXR1cm4ge1RpdGFuaXVtLlVJLlZpZXcvQWxsb3kuQ29udHJvbGxlcn1cblx0XHQgKi9cblx0XHRnZXRWaWV3OiBmdW5jdGlvbihpZCkge1xuXHRcdFx0aWYgKHR5cGVvZiBpZCA9PT0gJ3VuZGVmaW5lZCcgfHwgaWQgPT09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuIHJvb3RzWzBdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuX192aWV3c1tpZF07XG5cdFx0fSxcblx0XHRyZW1vdmVWaWV3OiBmdW5jdGlvbihpZCkge1xuXHRcdFx0ZGVsZXRlIHRoaXNbaWRdO1xuXHRcdFx0ZGVsZXRlIHRoaXMuX192aWV3c1tpZF07XG5cdFx0fSxcblxuXHRcdGdldFByb3h5UHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRcdHJldHVybiB0aGlzLl9fcHJveHlQcm9wZXJ0aWVzW25hbWVdO1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBAbWV0aG9kIGdldFZpZXdzXG5cdFx0ICogUmV0dXJucyBhIGxpc3Qgb2YgYWxsIElEZWQgdmlldyBlbGVtZW50cyBhc3NvY2lhdGVkIHdpdGggdGhpcyBjb250cm9sbGVyLlxuXHRcdCAqXG5cdFx0ICogIyMjIyBFeGFtcGxlXG5cdFx0ICogR2l2ZW4gdGhlIGZvbGxvd2luZyBYTUwgdmlldzpcblxuXHQ8QWxsb3k+XG5cdFx0PFRhYkdyb3VwIGlkPVwidGFic1wiPlxuXHRcdFx0PFRhYiB0aXRsZT1cIlRhYiAxXCIgaWNvbj1cIktTX25hdl91aS5wbmdcIiBpZD1cInRhYjFcIj5cblx0XHRcdFx0PFdpbmRvdyB0aXRsZT1cIlRhYiAxXCIgaWQ9XCJ3aW4xXCI+XG5cdFx0XHRcdFx0PExhYmVsIGlkPVwibGFiZWwxXCI+SSBhbSBXaW5kb3cgMTwvTGFiZWw+XG5cdFx0XHRcdDwvV2luZG93PlxuXHRcdFx0PC9UYWI+XG5cdFx0XHQ8VGFiIHRpdGxlPVwiVGFiIDJcIiBpY29uPVwiS1NfbmF2X3ZpZXdzLnBuZ1wiIGlkPVwidGFiMlwiPlxuXHRcdFx0XHQ8V2luZG93IHRpdGxlPVwiVGFiIDJcIiBpZD1cIndpbmQyXCI+XG5cdFx0XHRcdFx0PExhYmVsIGlkPVwibGFiZWwyXCI+SSBhbSBXaW5kb3cgMjwvTGFiZWw+XG5cdFx0XHRcdDwvV2luZG93PlxuXHRcdFx0PC9UYWI+XG5cdFx0PC9UYWJHcm91cD5cblx0XHQ8VmlldyBpZD1cIm90aGVydmlld1wiPjwvVmlldz5cblx0PC9BbGxveT5cblxuXHRcdCogVGhlIGZvbGxvd2luZyB2aWV3LWNvbnRyb2xsZXIgb3V0cHV0cyB0aGUgaWQgb2YgZWFjaCB2aWV3IGluIHRoZSBoaWVyYXJjaHkuXG5cblx0dmFyIHZpZXdzID0gJC5nZXRWaWV3cygpO1xuXHRmb3IgKGVhY2ggaW4gdmlld3MpIHtcblx0XHR2YXIgdmlldyA9IHZpZXdzW2VhY2hdO1xuXHRcdGNvbnNvbGUubG9nKHZpZXcuaWQpO1xuXHR9XG5cblx0W0lORk9dIDogICB3aW4xXG5cdFtJTkZPXSA6ICAgbGFiZWwxXG5cdFtJTkZPXSA6ICAgdGFiMVxuXHRbSU5GT10gOiAgIHdpbmQyXG5cdFtJTkZPXSA6ICAgbGFiZWwyXG5cdFtJTkZPXSA6ICAgdGFiMlxuXHRbSU5GT10gOiAgIHRhYnNcblx0W0lORk9dIDogICBvdGhlcnZpZXdcblxuXHRcdCAqIEByZXR1cm4ge0FycmF5LjwoVGl0YW5pdW0uVUkuVmlld3xBbGxveS5Db250cm9sbGVyKT59XG5cdFx0ICovXG5cdFx0Z2V0Vmlld3M6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX192aWV3cztcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCBkZXN0cm95XG5cdFx0ICogRnJlZXMgYmluZGluZyByZXNvdXJjZXMgYXNzb2NpYXRlZCB3aXRoIHRoaXMgY29udHJvbGxlciBhbmQgaXRzXG5cdFx0ICogVUkgY29tcG9uZW50cy4gSXQgaXMgY3JpdGljYWwgdGhhdCB0aGlzIGlzIGNhbGxlZCB3aGVuIGVtcGxveWluZ1xuXHRcdCAqIG1vZGVsL2NvbGxlY3Rpb24gYmluZGluZyBpbiBvcmRlciB0byBhdm9pZCBwb3RlbnRpYWwgbWVtb3J5IGxlYWtzLlxuXHRcdCAqICQuZGVzdHJveSgpIHNob3VsZCBiZSBjYWxsZWQgd2hlbmV2ZXIgYSBjb250cm9sbGVyJ3MgVUkgaXMgdG9cblx0XHQgKiBiZSBcImNsb3NlZFwiIG9yIHJlbW92ZWQgZnJvbSB0aGUgYXBwLiBTZWUgdGhlIFtEZXN0cm95aW5nIERhdGEgQmluZGluZ3NdKCMhL2d1aWRlL0Rlc3Ryb3lpbmdfRGF0YV9CaW5kaW5ncylcblx0XHQgKiB0ZXN0IGFwcGxpY2F0aW9uIGZvciBhbiBleGFtcGxlIG9mIHRoaXMgYXBwcm9hY2guXG5cblx0XHQgKiAjIyMjIEV4YW1wbGVcblx0XHQgKiBJbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUgdGhlIHZpZXctY29udHJvbGxlciBmb3IgYSB7QGxpbmsgVGl0YW5pdW0uVUkuV2luZG93IFdpbmRvd30gb2JqZWN0IG5hbWVkIGBkaWFsb2dgXG5cdFx0ICogY2FsbHMgaXRzIGBkZXN0cm95KClgIG1ldGhvZCBpbiByZXNwb25zZSB0byB0aGUgV2luZG93IG9iamVjdCBiZWluZyBjbG9zZWQuXG5cblxuXHQkLmRpYWxvZy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGZ1bmN0aW9uKCkge1xuXHRcdCQuZGVzdHJveSgpO1xuXHR9KTtcblx0XHQgKi9cblx0XHRkZXN0cm95OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGRlc3Ryb3koKSBpcyBkZWZpbmVkIGR1cmluZyB0aGUgY29tcGlsZSBwcm9jZXNzIGJhc2VkIG9uXG5cdFx0XHQvLyB0aGUgVUkgY29tcG9uZW50cyBhbmQgYmluZGluZyBjb250YWluZWQgd2l0aGluIHRoZSBjb250cm9sbGVyLlxuXHRcdH0sXG5cblx0XHQvLyBnZXRWaWV3RXggZm9yIGFkdmFuY2VkIHBhcnNpbmcgYW5kIGVsZW1lbnQgdHJhdmVyc2FsXG5cdFx0Z2V0Vmlld0V4OiBmdW5jdGlvbihvcHRzKSB7XG5cdFx0XHR2YXIgcmVjdXJzZSA9IG9wdHMucmVjdXJzZSB8fCBmYWxzZTtcblx0XHRcdGlmIChyZWN1cnNlKSB7XG5cdFx0XHRcdHZhciB2aWV3ID0gdGhpcy5nZXRWaWV3KCk7XG5cdFx0XHRcdGlmICghdmlldykge1xuXHRcdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHZpZXcuX19pYW1hbGxveSkge1xuXHRcdFx0XHRcdHJldHVybiB2aWV3LmdldFZpZXdFeCh7IHJlY3Vyc2U6IHRydWUgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIHZpZXc7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFZpZXcoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gZ2V0UHJveHlQcm9wZXJ0eUV4IGZvciBhZHZhbmNlZCBwYXJzaW5nIGFuZCBlbGVtZW50IHRyYXZlcnNhbFxuXHRcdGdldFByb3h5UHJvcGVydHlFeDogZnVuY3Rpb24obmFtZSwgb3B0cykge1xuXHRcdFx0dmFyIHJlY3Vyc2UgPSBvcHRzLnJlY3Vyc2UgfHwgZmFsc2U7XG5cdFx0XHRpZiAocmVjdXJzZSkge1xuXHRcdFx0XHR2YXIgdmlldyA9IHRoaXMuZ2V0UHJveHlQcm9wZXJ0eShuYW1lKTtcblx0XHRcdFx0aWYgKCF2aWV3KSB7XG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdH0gZWxzZSBpZiAodmlldy5fX2lhbWFsbG95KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHZpZXcuZ2V0UHJveHlQcm9wZXJ0eShuYW1lLCB7IHJlY3Vyc2U6IHRydWUgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIHZpZXc7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFZpZXcobmFtZSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEBtZXRob2QgY3JlYXRlU3R5bGVcblx0XHQgKiBDcmVhdGVzIGEgZGljdGlvbmFyeSBvZiBwcm9wZXJ0aWVzIGJhc2VkIG9uIHRoZSBzcGVjaWZpZWQgc3R5bGVzLlxuXHRcdCAqXG5cdFx0ICpcblx0XHQgKiBZb3UgY2FuIHVzZSB0aGlzIGRpY3Rpb25hcnkgd2l0aCB0aGUgdmlldyBvYmplY3Qnc1xuXHRcdCAqIHtAbGluayBUaXRhbml1bS5VSS5WaWV3I21ldGhvZC1hcHBseVByb3BlcnRpZXMgYXBwbHlQcm9wZXJ0aWVzfSBtZXRob2Rcblx0XHQgKiBvciBhIGNyZWF0ZSBvYmplY3QgbWV0aG9kLCBzdWNoIGFzIHtAbGluayBUaXRhbml1bS5VSSNtZXRob2QtY3JlYXRlVmlldyBUaXRhbml1bS5VSS5jcmVhdGVWaWV3fS5cblx0XHQgKiAjIyMjIEV4YW1wbGVzXG5cdFx0ICogVGhlIGZvbGxvd2luZyBjcmVhdGVzIGEgbmV3IHN0eWxlIG9iamVjdCB0aGF0IGlzIHBhc3NlZCBhcyBhIHBhcmFtZXRlclxuXHRcdCAqIHRvIHRoZSB7QGxpbmsgVGl0YW5pdW0uVUkjbWV0aG9kLWNyZWF0ZUxhYmVsIFRpLlVJLmNyZWF0ZUxhYmVsKCl9IG1ldGhvZC5cblxuXHR2YXIgc3R5bGVBcmdzID0ge1xuXHRhcGlOYW1lOiAnVGkuVUkuTGFiZWwnLFxuXHRcdGNsYXNzZXM6IFsnYmx1ZScsJ3NoYWRvdycsJ2xhcmdlJ10sXG5cdFx0aWQ6ICd0ZXN0ZXInLFxuXHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdGJvcmRlclJhZGl1czogMTYsXG5cdFx0Ym9yZGVyQ29sb3I6ICcjMDAwJ1xuXHR9O1xuXHR2YXIgc3R5bGVPYmplY3QgPSAkLmNyZWF0ZVN0eWxlKHN0eWxlQXJncyk7XG5cdHRlc3RMYWJlbCA9IFRpLlVJLmNyZWF0ZUxhYmVsKHN0eWxlT2JqZWN0KTtcblxuXHRcdCAqIFRoZSBuZXh0IGV4YW1wbGUgdXNlcyB0aGUge0BsaW5rIFRpdGFuaXVtI21ldGhvZC1hcHBseVByb3BlcnRpZXMgYXBwbHlQcm9wZXJ0aWVzKCl9IG1ldGhvZFxuXHRcdCAqIHRvIGFwcGx5IGEgc3R5bGUgb2JqZWN0IHRvIGFuIGV4aXN0aW5nIEJ1dHRvbiBjb250cm9sIChidXR0b24gbm90IHNob3duKS5cblxuXHR2YXIgc3R5bGUgPSAkLmNyZWF0ZVN0eWxlKHtcblx0XHRjbGFzc2VzOiBhcmdzLmJ1dHRvbixcblx0XHRhcGlOYW1lOiAnQnV0dG9uJyxcblx0XHRjb2xvcjogJ2JsdWUnXG5cdH0pO1xuXHQkLmJ1dHRvbi5hcHBseVByb3BlcnRpZXMoc3R5bGUpO1xuXHRcdCAqIEBwYXJhbSB7QWxsb3lTdHlsZURpY3R9IG9wdHMgRGljdGlvbmFyeSBvZiBzdHlsZXMgdG8gYXBwbHkuXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJuIHtEaWN0aW9uYXJ5fVxuXHRcdCAqIEBzaW5jZSAxLjIuMFxuXG5cdFx0ICovXG5cdFx0Y3JlYXRlU3R5bGU6IGZ1bmN0aW9uKG9wdHMpIHtcblx0XHRcdHJldHVybiBBbGxveS5jcmVhdGVTdHlsZShnZXRDb250cm9sbGVyUGFyYW0oKSwgb3B0cyk7XG5cdFx0fSxcblxuXHRcdC8qXG5cdFx0ICogRG9jdW1lbnRlZCBpbiBkb2NzL2FwaWRvYy9jb250cm9sbGVyLmpzXG5cdFx0ICovXG5cdFx0VUk6IHtcblx0XHRcdGNyZWF0ZTogZnVuY3Rpb24oYXBpTmFtZSwgb3B0cykge1xuXHRcdFx0XHRyZXR1cm4gQWxsb3kuVUkuY3JlYXRlKGdldENvbnRyb2xsZXJQYXJhbSgpLCBhcGlOYW1lLCBvcHRzKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCBhZGRDbGFzc1xuXHRcdCAqIEFkZHMgYSBUU1MgY2xhc3MgdG8gdGhlIHNwZWNpZmllZCB2aWV3IG9iamVjdC5cblx0XHQgKlxuXHRcdCAqIFlvdSBjYW4gYXBwbHkgYWRkaXRpb25hbCBzdHlsZXMgd2l0aCB0aGUgYG9wdHNgIHBhcmFtZXRlci4gVG8gdXNlIHRoaXMgbWV0aG9kXG5cdFx0ICogZWZmZWN0aXZlbHkgeW91IG1heSBuZWVkIHRvIGVuYWJsZSBhdXRvc3R5bGluZ1xuXHRcdCAqIG9uIHRoZSB0YXJnZXQgWE1MIHZpZXcuIFNlZSBbQXV0b3N0eWxlXSgjIS9ndWlkZS9EeW5hbWljX1N0eWxlcy1zZWN0aW9uLTM3NTMwNDE1X0R5bmFtaWNTdHlsZXMtQXV0b3N0eWxlKVxuXHRcdCAqIGluIHRoZSBBbGxveSBkZXZlbG9wZXIgZ3VpZGUuXG5cdFx0ICogIyMjIyBFeGFtcGxlXG5cdFx0ICogVGhlIGZvbGxvd2luZyBhZGRzIHRoZSBUU1MgY2xhc3NlcyBcIi5yZWRiZ1wiIGFuZCBcIi5iaWdnZXJcIiB0byBhIHtAbGluayBUaXRhbml1bS5VSS5MYWJlbH1cblx0XHQgKiBvYmplY3QgcHJveHkgYGxhYmVsMWAsIGFuZCBhbHNvIHNldHMgdGhlIGxhYmVsJ3MgYHRleHRgIHByb3BlcnR5IHRvIFwiQ2FuY2VsXCIuXG5cblx0Ly8gaW5kZXguanNcblx0JC5hZGRDbGFzcygkLmxhYmVsMSwgJ3JlZGJnIGJpZ2dlcicsIHt0ZXh0OiBcIkNhbmNlbFwifSk7XG5cblRoZSAncmVkYmcnIGFuZCAnYmlnZ2VyJyBjbGFzc2VzIGFyZSBzaG93biBiZWxvdzpcblxuXHQvLyBpbmRleC50c3Ncblx0XCIucmVkYmdcIiA6IHtcblx0XHRjb2xvcjogJ3JlZCdcblx0fVxuXHRcIi5iaWdnZXJcIjoge1xuXHRcdGZvbnQgOiB7XG5cdFx0ICAgZm9udFNpemU6ICczNidcblx0XHR9XG5cdH1cblxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBwcm94eSBWaWV3IG9iamVjdCB0byB3aGljaCB0byBhZGQgY2xhc3MoZXMpLlxuXHRcdCAqIEBwYXJhbSB7QXJyYXk8U3RyaW5nPi9TdHJpbmd9IGNsYXNzZXMgQXJyYXkgb3Igc3BhY2Utc2VwYXJhdGVkIGxpc3Qgb2YgY2xhc3NlcyB0byBhcHBseS5cblx0XHQgKiBAcGFyYW0ge0RpY3Rpb25hcnl9IFtvcHRzXSBEaWN0aW9uYXJ5IG9mIHByb3BlcnRpZXMgdG8gYXBwbHkgYWZ0ZXIgY2xhc3NlcyBoYXZlIGJlZW4gYWRkZWQuXG5cdFx0ICogQHNpbmNlIDEuMi4wXG5cdFx0ICovXG5cdFx0YWRkQ2xhc3M6IGZ1bmN0aW9uKHByb3h5LCBjbGFzc2VzLCBvcHRzKSB7XG5cdFx0XHRyZXR1cm4gQWxsb3kuYWRkQ2xhc3MoZ2V0Q29udHJvbGxlclBhcmFtKCksIHByb3h5LCBjbGFzc2VzLCBvcHRzKTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCByZW1vdmVDbGFzc1xuXHRcdCAqIFJlbW92ZXMgYSBUU1MgY2xhc3MgZnJvbSB0aGUgc3BlY2lmaWVkIHZpZXcgb2JqZWN0LlxuXHRcdCAqXG5cdFx0ICogWW91IGNhbiBhcHBseSBhZGRpdGlvbmFsIHN0eWxlcyBhZnRlciB0aGUgcmVtb3ZhbCB3aXRoIHRoZSBgb3B0c2AgcGFyYW1ldGVyLlxuXHRcdCAqIFRvIHVzZSB0aGlzIG1ldGhvZCBlZmZlY3RpdmVseSB5b3UgbWF5IG5lZWQgdG8gZW5hYmxlIGF1dG9zdHlsaW5nXG5cdFx0ICogb24gdGhlIHRhcmdldCBYTUwgdmlldy4gU2VlIFtBdXRvc3R5bGVdKCMhL2d1aWRlL0R5bmFtaWNfU3R5bGVzLXNlY3Rpb24tMzc1MzA0MTVfRHluYW1pY1N0eWxlcy1BdXRvc3R5bGUpXG5cdFx0ICogaW4gdGhlIEFsbG95IGRldmVsb3BlciBndWlkZS5cblx0XHQgKiAjIyMjIEV4YW1wbGVcblx0XHQgKiBUaGUgZm9sbG93aW5nIHJlbW92ZXMgdGhlIFwicmVkYmdcIiBhbmQgXCJiaWdnZXJcIiBUU1MgY2xhc3NlcyBmcm9tIGEge0BsaW5rIFRpdGFuaXVtLlVJLkxhYmVsfVxuXHRcdCAqIG9iamVjdCBwcm94eSBgbGFiZWwxYCwgYW5kIGFsc28gc2V0cyB0aGUgbGFiZWwncyBgdGV4dGAgcHJvcGVydHkgdG8gXCIuLi5cIi5cblxuXHQkLnJlbW92ZUNsYXNzKCQubGFiZWwxLCAncmVkYmcgYmlnZ2VyJywge3RleHQ6IFwiLi4uXCJ9KTtcblxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBwcm94eSBWaWV3IG9iamVjdCBmcm9tIHdoaWNoIHRvIHJlbW92ZSBjbGFzcyhlcykuXG5cdFx0ICogQHBhcmFtIHtBcnJheTxTdHJpbmc+L1N0cmluZ30gY2xhc3NlcyBBcnJheSBvciBzcGFjZS1zZXBhcmF0ZWQgbGlzdCBvZiBjbGFzc2VzIHRvIHJlbW92ZS5cblx0XHQgKiBAcGFyYW0ge0RpY3Rpb25hcnl9IFtvcHRzXSBEaWN0aW9uYXJ5IG9mIHByb3BlcnRpZXMgdG8gYXBwbHkgYWZ0ZXIgdGhlIGNsYXNzIHJlbW92YWwuXG5cdFx0ICogQHNpbmNlIDEuMi4wXG5cdFx0ICovXG5cdFx0cmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uKHByb3h5LCBjbGFzc2VzLCBvcHRzKSB7XG5cdFx0XHRyZXR1cm4gQWxsb3kucmVtb3ZlQ2xhc3MoZ2V0Q29udHJvbGxlclBhcmFtKCksIHByb3h5LCBjbGFzc2VzLCBvcHRzKTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCByZXNldENsYXNzXG5cdFx0ICogU2V0cyB0aGUgYXJyYXkgb2YgVFNTIGNsYXNzZXMgZm9yIHRoZSB0YXJnZXQgVmlldyBvYmplY3QsIGFkZGluZyB0aGUgY2xhc3NlcyBzcGVjaWZpZWQgYW5kXG5cdFx0ICogcmVtb3ZpbmcgYW55IGFwcGxpZWQgY2xhc3NlcyB0aGF0IGFyZSBub3Qgc3BlY2lmaWVkLlxuXHRcdCAqXG5cdFx0ICogWW91IGNhbiBhcHBseSBjbGFzc2VzIG9yIHN0eWxlcyBhZnRlciB0aGUgcmVzZXQgdXNpbmcgdGhlIGBjbGFzc2VzYCBvciBgb3B0c2AgcGFyYW1ldGVycy5cblx0XHQgKiBUbyB1c2UgdGhpcyBtZXRob2QgZWZmZWN0aXZlbHkgeW91IG1heSBuZWVkIHRvIGVuYWJsZSBhdXRvc3R5bGluZ1xuXHRcdCAqIG9uIHRoZSB0YXJnZXQgWE1MIHZpZXcuIFNlZSBbQXV0b3N0eWxlXSgjIS9ndWlkZS9EeW5hbWljX1N0eWxlcy1zZWN0aW9uLTM3NTMwNDE1X0R5bmFtaWNTdHlsZXMtQXV0b3N0eWxlKVxuXHRcdCAqIGluIHRoZSBBbGxveSBkZXZlbG9wZXIgZ3VpZGUuXG5cblx0XHQgKiAjIyMjIEV4YW1wbGVcblx0XHQgKiBUaGUgZm9sbG93aW5nIHJlbW92ZXMgYWxsIHByZXZpb3VzbHkgYXBwbGllZCBzdHlsZXMgb24gYGxhYmVsMWAgYW5kIHRoZW4gYXBwbGllc1xuXHRcdCAqIHRoZSBUU1MgY2xhc3MgJ25vLXN0eWxlJy5cblxuXHQkLnJlc2V0Q2xhc3MoJC5sYWJlbDEsICduby1zdHlsZScpO1xuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBwcm94eSBWaWV3IG9iamVjdCB0byByZXNldC5cblx0XHQgKiBAcGFyYW0ge0FycmF5PFN0cmluZz4vU3RyaW5nfSBbY2xhc3Nlc10gQXJyYXkgb3Igc3BhY2Utc2VwYXJhdGVkIGxpc3Qgb2YgY2xhc3NlcyB0byBhcHBseSBhZnRlciB0aGUgcmVzZXQuXG5cdFx0ICogQHBhcmFtIHtEaWN0aW9uYXJ5fSBbb3B0c10gRGljdGlvbmFyeSBvZiBwcm9wZXJ0aWVzIHRvIGFwcGx5IGFmdGVyIHRoZSByZXNldC5cblx0XHQgKiBAc2luY2UgMS4yLjBcblx0XHQgKi9cblx0XHRyZXNldENsYXNzOiBmdW5jdGlvbihwcm94eSwgY2xhc3Nlcywgb3B0cykge1xuXHRcdFx0cmV0dXJuIEFsbG95LnJlc2V0Q2xhc3MoZ2V0Q29udHJvbGxlclBhcmFtKCksIHByb3h5LCBjbGFzc2VzLCBvcHRzKTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCB1cGRhdGVWaWV3c1xuXHRcdCAqIEFwcGxpZXMgYSBzZXQgb2YgcHJvcGVydGllcyB0byB2aWV3IGVsZW1lbnRzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGNvbnRyb2xsZXIuXG5cdFx0ICogVGhpcyBtZXRob2QgaXMgdXNlZnVsIGZvciBzZXR0aW5nIHByb3BlcnRpZXMgb24gcmVwZWF0ZWQgZWxlbWVudHMgc3VjaCBhc1xuXHRcdCAqIHtAbGluayBUaXRhbml1bS5VSS5UYWJsZVZpZXdSb3cgVGFibGVWaWV3Um93fSBvYmplY3RzLCByYXRoZXIgdGhhbiBuZWVkaW5nIHRvIGhhdmUgYSBjb250cm9sbGVyXG5cdFx0ICogZm9yIHRob3NlIGNoaWxkIGNvbnRyb2xsZXJzLlxuXHRcdCAqICMjIyMgRXhhbXBsZVxuXHRcdCAqIFRoZSBmb2xsb3dpbmcgZXhhbXBsZSB1c2VzIHRoaXMgbWV0aG9kIHRvIHVwZGF0ZSBhIExhYmVsIGluc2lkZSBhIFRhYmxlVmlld1JvdyBvYmplY3Rcblx0XHQgKiBiZWZvcmUgYWRkaW5nIGl0IHRvIGEgVGFibGVWaWV3LlxuXG5cdFx0ICogVmlldy1jb250cm9sbGVyIGZpbGU6IGNvbnRyb2xsZXJzL2luZGV4LmpzXG5cblx0Zm9yICh2YXIgaT0wOyBpIDwgMTA7IGkrKykge1xuXHQgIHZhciByb3cgPSBBbGxveS5jcmVhdGVDb250cm9sbGVyKFwidGFibGVyb3dcIik7XG5cdCAgcm93LnVwZGF0ZVZpZXdzKHtcblx0ICBcdFwiI3RoZUxhYmVsXCI6IHtcblx0ICBcdFx0dGV4dDogXCJJIGFtIHJvdyAjXCIgKyBpXG5cdCAgXHR9XG5cdCAgfSk7XG5cdCAgJC50YWJsZVZpZXcuYXBwZW5kUm93KHJvdy5nZXRWaWV3KCkpO1xuXHR9O1xuXG5cdFx0XHQgKiBYTUwgdmlldzogdmlld3MvdGFibGVyb3cueG1sXG5cblx0PEFsbG95PlxuXHRcdDxUYWJsZVZpZXdSb3c+XG5cdFx0XHQ8TGFiZWwgaWQ9XCJ0aGVMYWJlbFwiPjwvTGFiZWw+XG5cdFx0PC9UYWJsZVZpZXdSb3c+XG5cdDwvQWxsb3k+XG5cblx0XHRcdCAqIFhNTCB2aWV3OiB2aWV3cy9pbmRleC54bWxcblxuXHQ8VGFibGVWaWV3IGlkPVwidGFibGVWaWV3XCI+XG5cdDwvVGFibGVWaWV3PlxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzIEFuIG9iamVjdCB3aG9zZSBrZXlzIGFyZSB0aGUgSURzIChpbiBmb3JtICcjaWQnKSBvZiB2aWV3cyB0byB3aGljaCB0aGUgc3R5bGVzIHdpbGwgYmUgYXBwbGllZC5cblx0XHQgKiBAc2luY2UgMS40LjBcblxuXHRcdCAqL1xuXHRcdHVwZGF0ZVZpZXdzOiBmdW5jdGlvbihhcmdzKSB7XG5cdFx0XHR2YXIgdmlld3MgPSB0aGlzLmdldFZpZXdzKCk7XG5cdFx0XHRpZiAoXy5pc09iamVjdChhcmdzKSkge1xuXHRcdFx0XHRfLmVhY2goXy5rZXlzKGFyZ3MpLCBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHR2YXIgZWxlbSA9IHZpZXdzW2tleS5zdWJzdHJpbmcoMSldO1xuXHRcdFx0XHRcdGlmIChrZXkuaW5kZXhPZignIycpID09PSAwICYmIGtleSAhPT0gJyMnICYmIF8uaXNPYmplY3QoZWxlbSkgJiYgdHlwZW9mIGVsZW0uYXBwbHlQcm9wZXJ0aWVzID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHQvLyBhcHBseSB0aGUgcHJvcGVydGllcyBidXQgbWFrZSBzdXJlIHdlJ3JlIGFwcGx5aW5nIHRoZW0gdG8gYSBUaS5VSSBvYmplY3QgKG5vdCBhIGNvbnRyb2xsZXIpXG5cdFx0XHRcdFx0XHRlbGVtLmFwcGx5UHJvcGVydGllcyhhcmdzW2tleV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCBhZGRMaXN0ZW5lclxuXHRcdCAqIEFkZHMgYSB0cmFja2VkIGV2ZW50IGxpc3RlbmVycyB0byBhIHZpZXcgcHJveHkgb2JqZWN0LlxuXHRcdCAqIEJ5IGRlZmF1bHQsIGFueSBldmVudCBsaXN0ZW5lciBkZWNsYXJlZCBpbiBYTUwgaXMgdHJhY2tlZCBieSBBbGxveS5cblx0XHQgKlxuXHRcdCAqICMjIyMgRXhhbXBsZVxuXHRcdCAqIEFkZCBhbiBldmVudCB0byB0aGUgdHJhY2tpbmcgdGFyZ2V0LlxuXG5cdCQuYWRkTGlzdGVuZXIoJC5hVmlldywgJ2NsaWNrJywgb25DbGljayk7XG5cblx0XHQgKiBAcGFyYW0ge09iamVjdH0gcHJveHkgUHJveHkgdmlldyBvYmplY3QgdG8gbGlzdGVuIHRvLlxuXHRcdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIE5hbWUgb2YgdGhlIGV2ZW50LlxuXHRcdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSB3aGVuIHRoZSBldmVudCBpcyBmaXJlZC5cblx0XHQgKiBAcmV0dXJucyB7U3RyaW5nfSBJRCBhdHRyaWJ1dGUgb2YgdGhlIHZpZXcgb2JqZWN0LiAgSWYgb25lIGRvZXMgbm90IGV4aXN0LCBBbGxveSB3aWxsIGNyZWF0ZSBhIHVuaXF1ZSBJRC5cblx0XHQgKiBAc2luY2UgMS43LjBcblx0XHQgKi9cblx0XHRhZGRMaXN0ZW5lcjogZnVuY3Rpb24ocHJveHksIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRpZiAoIXByb3h5LmlkKSB7XG5cdFx0XHRcdHByb3h5LmlkID0gXy51bmlxdWVJZCgnX190cmFja0lkJyk7XG5cblx0XHRcdFx0aWYgKF8uaGFzKHRoaXMuX192aWV3cywgcHJveHkuaWQpKSB7XG5cdFx0XHRcdFx0VGkuQVBJLmVycm9yKCckLmFkZExpc3RlbmVyOiAnICsgcHJveHkuaWQgKyAnIHdhcyBjb25mbGljdC4nKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cHJveHkuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjayk7XG5cdFx0XHR0aGlzLl9fZXZlbnRzLnB1c2goe1xuXHRcdFx0XHRpZDogcHJveHkuaWQsXG5cdFx0XHRcdHZpZXc6IHByb3h5LFxuXHRcdFx0XHR0eXBlOiB0eXBlLFxuXHRcdFx0XHRoYW5kbGVyOiBjYWxsYmFja1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBwcm94eS5pZDtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCBnZXRMaXN0ZW5lclxuXHRcdCAqIEdldHMgYWxsIHRoZSB0cmFja2VkIGV2ZW50IGxpc3RlbmVycyBvZiB0aGUgdmlldy1jb250cm9sbGVyIG9yXG5cdFx0ICogb25seSB0aGUgb25lcyBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlcnMuICBQYXNzaW5nIG5vIHBhcmFtZXRlcnMsXG5cdFx0ICogcmV0cmlldmVzIGFsbCB0cmFja2VkIGV2ZW50IGxpc3RlbmVycy4gU2V0IGEgcGFyYW1ldGVyIHRvIGBudWxsYFxuXHRcdCAqIGlmIHlvdSBkbyBub3Qgd2FudCB0byByZXN0cmljdCB0aGUgbWF0Y2ggdG8gdGhhdCBwYXJhbWV0ZXIuXG5cdFx0ICpcblx0XHQgKiAjIyMjIEV4YW1wbGVcblx0XHQgKiBHZXQgYWxsIGV2ZW50cyBib3VuZCB0byB0aGUgdmlldy1jb250cm9sbGVyLlxuXG5cdHZhciBsaXN0ZW5lciA9ICQuZ2V0TGlzdGVuZXIoKTtcblxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBbcHJveHldIFByb3h5IHZpZXcgb2JqZWN0LlxuXHRcdCAqIEBwYXJhbSB7U3RyaW5nfSBbdHlwZV0gTmFtZSBvZiB0aGUgZXZlbnQuXG5cdFx0ICogQHJldHVybnMge0FycmF5PFRyYWNrZWRFdmVudExpc3RlbmVyPn0gTGlzdCBvZiB0cmFja2VkIGV2ZW50IGxpc3RlbmVycy5cblx0XHQgKiBAc2luY2UgMS43LjBcblx0XHQgKi9cblxuXHRcdGdldExpc3RlbmVyOiBmdW5jdGlvbihwcm94eSwgdHlwZSkge1xuXHRcdFx0cmV0dXJuIF8uZmlsdGVyKHRoaXMuX19ldmVudHMsIGZ1bmN0aW9uKGV2ZW50LCBpbmRleCkge1xuXHRcdFx0XHRpZiAoKCFwcm94eSB8fCBwcm94eS5pZCA9PT0gZXZlbnQuaWQpICYmXG5cdFx0XHRcdFx0KCF0eXBlIHx8IHR5cGUgPT09IGV2ZW50LnR5cGUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG1ldGhvZCByZW1vdmVMaXN0ZW5lclxuXHRcdCAqIFJlbW92ZXMgYWxsIHRyYWNrZWQgZXZlbnQgbGlzdGVuZXJzIG9yIG9ubHkgdGhlIG9uZXNcblx0XHQgKiBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlcnMuIFBhc3Npbmcgbm8gcGFyYW1ldGVycyxcblx0XHQgKiByZW1vdmVzIGFsbCB0cmFja2VkIGV2ZW50IGxpc3RlbmVycy4gIFNldCBhIHBhcmFtZXRlciB0byBgbnVsbGBcblx0XHQgKiBpZiB5b3UgZG8gbm90IHdhbnQgdG8gcmVzdHJpY3QgdGhlIG1hdGNoIHRvIHRoYXQgcGFyYW1ldGVyLlxuXHRcdCAqXG5cdFx0ICogIyMjIyBFeGFtcGxlXG5cdFx0ICogV2hlbiB0aGUgd2luZG93IGlzIGNsb3NlZCwgcmVtb3ZlIGFsbCB0cmFja2VkIGV2ZW50IGxpc3RlbmVycy5cblxuXHQ8QWxsb3k+XG5cdFx0PFdpbmRvdyBvbk9wZW49XCJkb09wZW5cIiBvbkNsb3NlPVwiZG9DbG9zZVwiPlxuXHRcdFx0PExhYmVsIGlkPVwibGFiZWxcIiBvbkNsaWNrPVwiZG9DbGlja1wiPkhlbGxvLCB3b3JsZDwvTGFiZWw+XG5cdFx0PC9XaW5kb3c+XG5cdDwvQWxsb3k+XG5cblx0ZnVuY3Rpb24gZG9DbG9zZSgpIHtcblx0XHQkLnJlbW92ZUxpc3RlbmVyKCk7XG5cdH1cblx0XHQgKiBAcGFyYW0ge09iamVjdH0gW3Byb3h5XSBQcm94eSB2aWV3IG9iamVjdCB0byByZW1vdmUgZXZlbnQgbGlzdGVuZXJzIGZyb20uXG5cdFx0ICogQHBhcmFtIHtTdHJpbmd9IFt0eXBlXSBOYW1lIG9mIHRoZSBldmVudCB0byByZW1vdmUuXG5cdFx0ICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBDYWxsYmFjayB0byByZW1vdmUuXG5cdFx0ICogQHJldHVybnMge0FsbG95LkNvbnRyb2xsZXJ9IENvbnRyb2xsZXIgaW5zdGFuY2UuXG5cdFx0ICogQHNpbmNlIDEuNy4wXG5cdFx0ICovXG5cdFx0cmVtb3ZlTGlzdGVuZXI6IGZ1bmN0aW9uKHByb3h5LCB0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0dGhpcy5fX2V2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50LCBpbmRleCkge1xuXHRcdFx0XHRpZiAoKCFwcm94eSB8fCBwcm94eS5pZCA9PT0gZXZlbnQuaWQpICYmXG5cdFx0XHRcdFx0KCF0eXBlIHx8IHR5cGUgPT09IGV2ZW50LnR5cGUpICYmXG5cdFx0XHRcdFx0KCFjYWxsYmFjayB8fCBjYWxsYmFjayA9PT0gZXZlbnQuaGFuZGxlcikpIHtcblx0XHRcdFx0XHRldmVudC52aWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQudHlwZSwgZXZlbnQuaGFuZGxlcik7XG5cdFx0XHRcdFx0ZGVsZXRlIHNlbGYuX19ldmVudHNbaW5kZXhdO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyO1xuIl0sInNvdXJjZVJvb3QiOiIvVXNlcnMvZG1pdHJpeS9Xb3JrL3RpdGFuaXVtL2NvdW50ZXIvUmVzb3VyY2VzL2lwaG9uZS9hbGxveS9jb250cm9sbGVycyJ9

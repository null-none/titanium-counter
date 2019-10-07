/**
 * Create a new `Ti.UI.TabGroup`.
 */
var tabGroup = Ti.UI.createTabGroup();

/**
                                        * Add the two created tabs to the tabGroup object.
                                        */
tabGroup.addTab(createTab("Tab 1", "I am Window 1", "assets/images/tab1.png"));
tabGroup.addTab(createTab("Tab 2", "I am Window 2", "assets/images/tab2.png"));

/**
                                                                                 * Open the tabGroup
                                                                                 */
tabGroup.open();

/**
                  * Creates a new Tab and configures it.
                  *
                  * @param  {String} title The title used in the `Ti.UI.Tab` and it's included `Ti.UI.Window`
                  * @param  {String} message The title displayed in the `Ti.UI.Label`
                  * @return {String} icon The icon used in the `Ti.UI.Tab`
                  */
function createTab(title, message, icon) {
  var win = Ti.UI.createWindow({
    title: title,
    backgroundColor: '#fff' });


  var label = Ti.UI.createLabel({
    text: message,
    color: "#333",
    font: {
      fontSize: 20 } });



  win.add(label);

  var tab = Ti.UI.createTab({
    title: title,
    icon: icon,
    window: win });


  return tab;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi5saXZldmlld2FwcC5qcyJdLCJuYW1lcyI6WyJ0YWJHcm91cCIsIlRpIiwiVUkiLCJjcmVhdGVUYWJHcm91cCIsImFkZFRhYiIsImNyZWF0ZVRhYiIsIm9wZW4iLCJ0aXRsZSIsIm1lc3NhZ2UiLCJpY29uIiwid2luIiwiY3JlYXRlV2luZG93IiwiYmFja2dyb3VuZENvbG9yIiwibGFiZWwiLCJjcmVhdGVMYWJlbCIsInRleHQiLCJjb2xvciIsImZvbnQiLCJmb250U2l6ZSIsImFkZCIsInRhYiIsIndpbmRvdyJdLCJtYXBwaW5ncyI6IkFBQUE7OztBQUdBLElBQUlBLFFBQVEsR0FBR0MsRUFBRSxDQUFDQyxFQUFILENBQU1DLGNBQU4sRUFBZjs7QUFFQTs7O0FBR0FILFFBQVEsQ0FBQ0ksTUFBVCxDQUFnQkMsU0FBUyxDQUFDLE9BQUQsRUFBVSxlQUFWLEVBQTJCLHdCQUEzQixDQUF6QjtBQUNBTCxRQUFRLENBQUNJLE1BQVQsQ0FBZ0JDLFNBQVMsQ0FBQyxPQUFELEVBQVUsZUFBVixFQUEyQix3QkFBM0IsQ0FBekI7O0FBRUE7OztBQUdBTCxRQUFRLENBQUNNLElBQVQ7O0FBRUE7Ozs7Ozs7QUFPQSxTQUFTRCxTQUFULENBQW1CRSxLQUFuQixFQUEwQkMsT0FBMUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ3JDLE1BQUlDLEdBQUcsR0FBR1QsRUFBRSxDQUFDQyxFQUFILENBQU1TLFlBQU4sQ0FBbUI7QUFDekJKLElBQUFBLEtBQUssRUFBRUEsS0FEa0I7QUFFekJLLElBQUFBLGVBQWUsRUFBRSxNQUZRLEVBQW5CLENBQVY7OztBQUtBLE1BQUlDLEtBQUssR0FBR1osRUFBRSxDQUFDQyxFQUFILENBQU1ZLFdBQU4sQ0FBa0I7QUFDMUJDLElBQUFBLElBQUksRUFBRVAsT0FEb0I7QUFFMUJRLElBQUFBLEtBQUssRUFBRSxNQUZtQjtBQUcxQkMsSUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLE1BQUFBLFFBQVEsRUFBRSxFQURSLEVBSG9CLEVBQWxCLENBQVo7Ozs7QUFRQVIsRUFBQUEsR0FBRyxDQUFDUyxHQUFKLENBQVFOLEtBQVI7O0FBRUEsTUFBSU8sR0FBRyxHQUFHbkIsRUFBRSxDQUFDQyxFQUFILENBQU1HLFNBQU4sQ0FBZ0I7QUFDdEJFLElBQUFBLEtBQUssRUFBRUEsS0FEZTtBQUV0QkUsSUFBQUEsSUFBSSxFQUFFQSxJQUZnQjtBQUd0QlksSUFBQUEsTUFBTSxFQUFFWCxHQUhjLEVBQWhCLENBQVY7OztBQU1BLFNBQU9VLEdBQVA7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlIGEgbmV3IGBUaS5VSS5UYWJHcm91cGAuXG4gKi9cbnZhciB0YWJHcm91cCA9IFRpLlVJLmNyZWF0ZVRhYkdyb3VwKCk7XG5cbi8qKlxuICogQWRkIHRoZSB0d28gY3JlYXRlZCB0YWJzIHRvIHRoZSB0YWJHcm91cCBvYmplY3QuXG4gKi9cbnRhYkdyb3VwLmFkZFRhYihjcmVhdGVUYWIoXCJUYWIgMVwiLCBcIkkgYW0gV2luZG93IDFcIiwgXCJhc3NldHMvaW1hZ2VzL3RhYjEucG5nXCIpKTtcbnRhYkdyb3VwLmFkZFRhYihjcmVhdGVUYWIoXCJUYWIgMlwiLCBcIkkgYW0gV2luZG93IDJcIiwgXCJhc3NldHMvaW1hZ2VzL3RhYjIucG5nXCIpKTtcblxuLyoqXG4gKiBPcGVuIHRoZSB0YWJHcm91cFxuICovXG50YWJHcm91cC5vcGVuKCk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBUYWIgYW5kIGNvbmZpZ3VyZXMgaXQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSB0aXRsZSBUaGUgdGl0bGUgdXNlZCBpbiB0aGUgYFRpLlVJLlRhYmAgYW5kIGl0J3MgaW5jbHVkZWQgYFRpLlVJLldpbmRvd2BcbiAqIEBwYXJhbSAge1N0cmluZ30gbWVzc2FnZSBUaGUgdGl0bGUgZGlzcGxheWVkIGluIHRoZSBgVGkuVUkuTGFiZWxgXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGljb24gVGhlIGljb24gdXNlZCBpbiB0aGUgYFRpLlVJLlRhYmBcbiAqL1xuZnVuY3Rpb24gY3JlYXRlVGFiKHRpdGxlLCBtZXNzYWdlLCBpY29uKSB7XG4gICAgdmFyIHdpbiA9IFRpLlVJLmNyZWF0ZVdpbmRvdyh7XG4gICAgICAgIHRpdGxlOiB0aXRsZSxcbiAgICAgICAgYmFja2dyb3VuZENvbG9yOiAnI2ZmZidcbiAgICB9KTtcblxuICAgIHZhciBsYWJlbCA9IFRpLlVJLmNyZWF0ZUxhYmVsKHtcbiAgICAgICAgdGV4dDogbWVzc2FnZSxcbiAgICAgICAgY29sb3I6IFwiIzMzM1wiLFxuICAgICAgICBmb250OiB7XG4gICAgICAgICAgICBmb250U2l6ZTogMjBcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgd2luLmFkZChsYWJlbCk7XG5cbiAgICB2YXIgdGFiID0gVGkuVUkuY3JlYXRlVGFiKHtcbiAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICBpY29uOiBpY29uLFxuICAgICAgICB3aW5kb3c6IHdpblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRhYjtcbn1cbiJdLCJzb3VyY2VSb290IjoiL1VzZXJzL2RtaXRyaXkvV29yay90aXRhbml1bS9jb3VudGVyL1Jlc291cmNlcyJ9

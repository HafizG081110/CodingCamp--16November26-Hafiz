/* app.js — Bootstrap: wire each module to its DOM region and start the app
 * on DOMContentLoaded. Calls module inits in order: greeting, timer, todo,
 * quicklinks. Exposes the window.Dashboard namespace for ordered init calls.
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  function boot() {
    var d = global.Dashboard;
    d.GreetingModule.init(document.getElementById("greeting-section"));
    d.TimerModule.init(document.getElementById("timer-section"));
    d.TodoModule.init(document.getElementById("todo-section"));
    d.QuickLinksModule.init(document.getElementById("quicklinks-section"));
  }

  // With defer, the DOM is already parsed by the time this runs, so readyState
  // is "interactive"; the else branch fires boot immediately. The listener path
  // covers the case where this script is loaded without defer or after load.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);

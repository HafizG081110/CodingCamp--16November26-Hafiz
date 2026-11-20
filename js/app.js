
/* app.js — Dashboard Bootstrap */

(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  
function boot() {
  var d = global.Dashboard;

  d.ThemeModule.init();

  d.GreetingModule.init(
    document.getElementById("greeting-section")
  );

  d.CustomNameModule.init();

  d.TimerModule.init(
    document.getElementById("timer-section")
  );

  d.TodoModule.init(
    document.getElementById("todo-section")
  );

  d.QuickLinksModule.init(
    document.getElementById("quicklinks-section")
  );
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})(typeof window !== "undefined" ? window : this);

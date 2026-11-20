
/* app.js — Dashboard Bootstrap */

(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  function boot() {
    var d = global.Dashboard;

    // Theme
    d.ThemeModule.init();

    // Greeting, clock, date, and custom name
    d.GreetingModule.init(
      document.getElementById("greeting-section")
    );

    // Focus Timer
    d.TimerModule.init(
      document.getElementById("timer-section")
    );

    // To-Do List
    d.TodoModule.init(
      document.getElementById("todo-section")
    );

    // Quick Links
    d.QuickLinksModule.init(
      document.getElementById("quicklinks-section")
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})(window);

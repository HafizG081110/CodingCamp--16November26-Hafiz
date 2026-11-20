
/* app.js — Dashboard Bootstrap */

(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  function boot() {
    var d = global.Dashboard;

    // Initialize Theme
    d.ThemeModule.init();

    // Initialize Greeting
    d.GreetingModule.init(
      document.getElementById("greeting-section")
    );

    // Initialize Focus Timer
    d.TimerModule.init(
      document.getElementById("timer-section")
    );

    // Initialize To-Do List
    d.TodoModule.init(
      document.getElementById("todo-section")
    );

    // Initialize Quick Links
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

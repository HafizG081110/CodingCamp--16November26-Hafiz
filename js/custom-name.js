
/* custom-name.js — Custom Greeting Name */

(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var CustomNameModule = {

    init: function () {
      var form = document.getElementById("name-form");
      var input = document.getElementById("name-input");
      var greeting = document.getElementById("personal-greeting");

      if (!form || !input || !greeting) return;

      var savedName = "";

      try {
        savedName = localStorage.getItem("dashboard-name") || "";
      } catch (e) {
        savedName = "";
      }

      input.value = savedName;
      this.render(greeting, savedName);

      form.addEventListener("submit", function (event) {
        event.preventDefault();

        var name = input.value.trim();

        if (!name) {
          greeting.textContent = "Please enter your name.";
          return;
        }

        try {
          localStorage.setItem("dashboard-name", name);
        } catch (e) {
          // Name still displays during this session
        }

        CustomNameModule.render(greeting, name);
      });
    },

    render: function (element, name) {
      if (!element) return;

      if (name) {
        element.textContent = "Welcome, " + name + "!";
      } else {
        element.textContent = "Welcome!";
      }
    }

  };

  global.Dashboard.CustomNameModule = CustomNameModule;

})(window);

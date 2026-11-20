
/* theme.js — Light and Dark Mode */

(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var ThemeModule = {

    init: function () {
      var button = document.getElementById("theme-toggle");

      var savedTheme = null;

      try {
        savedTheme = localStorage.getItem("dashboard-theme");
      } catch (e) {
        savedTheme = null;
      }

      var theme = savedTheme || "dark";

      this.applyTheme(theme);

      if (!button) return;

      this.updateButton(button, theme);

      button.addEventListener("click", function () {
        var currentTheme =
          document.documentElement.getAttribute("data-theme");

        var newTheme =
          currentTheme === "dark" ? "light" : "dark";

        ThemeModule.applyTheme(newTheme);
        ThemeModule.updateButton(button, newTheme);
      });
    },

    applyTheme: function (theme) {
      document.documentElement.setAttribute(
        "data-theme",
        theme
      );

      try {
        localStorage.setItem("dashboard-theme", theme);
      } catch (e) {
        // Theme can still work without localStorage
      }
    },

    updateButton: function (button, theme) {
      if (theme === "dark") {
        button.textContent = "☀️ Light Mode";
      } else {
        button.textContent = "🌙 Dark Mode";
      }
    }

  };

  global.Dashboard.ThemeModule = ThemeModule;

})(window);

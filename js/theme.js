
/* theme.js — Light / Dark Mode */

(function (global)  {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var ThemeModule = {
    init: function () {
      var button = document.getElementById("theme-toggle");
      var savedTheme = localStorage.getItem("dashboard-theme");

      var theme = savedTheme || "dark";

      this.applyTheme(theme);

      if (button) {
        this.updateButton(button, theme);

        button.addEventListener("click", function () {
          var currentTheme =
            document.documentElement.getAttribute("data-theme");

          var newTheme =
            currentTheme === "dark" ? "light" : "dark";

          ThemeModule.applyTheme(newTheme);
          ThemeModule.updateButton(button, newTheme);
        });
      }
    },

    applyTheme: function (theme) {
      document.documentElement.setAttribute(
        "data-theme",
        theme
      );

      try {
        localStorage.setItem("dashboard-theme", theme);
      } catch (e) {
        // Theme still works without storage
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

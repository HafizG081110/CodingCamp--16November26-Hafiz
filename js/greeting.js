
/* greeting.js — Clock, Date, Greeting & Custom Name */

(function (global)  {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var GreetingModule = {

    root: null,
    clockEl: null,
    dateEl: null,
    greetingEl: null,
    nameEl: null,
    nameInput: null,
    intervalId: null,

    init: function (rootEl) {
      this.root = rootEl;

      this.clockEl = document.getElementById("greeting-time");
      this.dateEl = document.getElementById("greeting-date");
      this.greetingEl = document.getElementById("greeting-text");
      this.nameEl = document.getElementById("personal-greeting");
      this.nameInput = document.getElementById("name-input");

      // Stop old clock if initialized previously
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
      }

      // Load saved name
      var savedName = "";

      try {
        savedName = localStorage.getItem("dashboard-name") || "";
      } catch (e) {
        savedName = "";
      }

      if (this.nameInput) {
        this.nameInput.value = savedName;
      }

      this.renderName(savedName);
      this.update();

      // Update clock every second
      var self = this;

      this.intervalId = setInterval(function () {
        self.update();
      }, 1000);

      // Name form
      var form = document.getElementById("name-form");

      if (form) {
        form.addEventListener("submit", function (event) {
          event.preventDefault();

          var name = self.nameInput.value.trim();

          try {
            localStorage.setItem("dashboard-name", name);
          } catch (e) {}

          self.renderName(name);
        });
      }
    },

    update: function () {
      var now = new Date();

      // Digital clock
      if (this.clockEl) {
        this.clockEl.textContent =
          now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          });
      }

      // Date
      if (this.dateEl) {
        this.dateEl.textContent =
          now.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          });
      }

      // Greeting based on time
      if (this.greetingEl) {
        var hour = now.getHours();
        var message;

        if (hour >= 4 && hour < 11) {
          message = "Good morning";
        } else if (hour >= 11 && hour < 15) {
          message = "Good afternoon";
        } else if (hour >= 15 && hour < 18) {
          message = "Good evening";
        } else {
          message = "Good night";
        }

        this.greetingEl.textContent = message;
      }
    },

    renderName: function (name) {
      if (!this.nameEl) return;

      if (name) {
        this.nameEl.textContent = "Welcome, " + name + "!";
      } else {
        this.nameEl.textContent = "Welcome!";
      }
    }
  };

  global.Dashboard.GreetingModule = GreetingModule;

})(window);

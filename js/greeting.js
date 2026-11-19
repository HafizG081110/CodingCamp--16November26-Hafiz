/* greeting.js — GreetingModule: clock + time-of-day greeting.
 * Implementation for Task 3.1.
 * User-facing text is rendered via textContent (never innerHTML).
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var GreetingModule = {
    // Cached DOM references (populated by init) so updateGreeting does not
    // re-query the DOM on every tick — keeps it testable in isolation.
    _rootEl: null,
    _timeEl: null,
    _dateEl: null,
    _textEl: null,
    _intervalId: null,

    // Mount into #greeting-section and start the 1-second clock.
    init: function (rootEl) {
      this._rootEl = rootEl || null;

      // Cache references to the display elements within the root.
      if (this._rootEl) {
        this._timeEl = this._rootEl.querySelector("#greeting-time");
        this._dateEl = this._rootEl.querySelector("#greeting-date");
        this._textEl = this._rootEl.querySelector("#greeting-text");
      } else {
        this._timeEl = null;
        this._dateEl = null;
        this._textEl = null;
      }

      // Avoid leaking/duplicating a previous interval if init is called again.
      if (this._intervalId !== null) {
        global.clearInterval(this._intervalId);
        this._intervalId = null;
      }

      // Render once immediately so the display is populated on load (Req 1.1).
      this.updateGreeting();

      // Start the 1-second clock that refreshes the display (Req 1.2).
      var self = this;
      this._intervalId = global.setInterval(function () {
        self.updateGreeting();
      }, 1000);
    },

    // Read the clock now and render. Testable in isolation (uses cached refs).
    updateGreeting: function () {
      var now = new Date();
      var hour = now.getHours();
      var timeStr = now.toLocaleTimeString();
      var dateStr = now.toLocaleDateString();
      var greeting = this.getGreeting(hour);

      // Guard against missing elements: never throw if unbound.
      if (this._timeEl) {
        this._timeEl.textContent = timeStr;
      }
      if (this._dateEl) {
        this._dateEl.textContent = dateStr;
      }
      if (this._textEl) {
        this._textEl.textContent = greeting;
      }
    },

    // Pure: map an hour (0-23) to a greeting string. Same input -> same output,
    // no side effects, no reads of external state.
    getGreeting: function (hour) {
      // 5-11 morning, 12-16 afternoon, 17-20 evening, else night.
      if (hour >= 5 && hour <= 11) {
        return "Good morning";
      } else if (hour >= 12 && hour <= 16) {
        return "Good afternoon";
      } else if (hour >= 17 && hour <= 20) {
        return "Good evening";
      } else {
        return "Good night";
      }
    }
  };

  global.Dashboard.GreetingModule = GreetingModule;
  global.GreetingModule = GreetingModule;
})(typeof window !== "undefined" ? window : this);

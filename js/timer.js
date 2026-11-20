/* timer.js — TimerModule: 25-minute Focus Timer (start/stop/reset).
 * Implementation for Task 4.1.
 * Holds timer state in module-scoped properties and ticks once per second,
 * stopping automatically at zero and notifying completion. User-facing text
 * is rendered via textContent (never innerHTML).
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var DURATION = 25 * 60; // 1500 seconds

  var TimerModule = {
    DURATION: DURATION,

    // --- Module-scoped state ---
    _rootEl: null,
    _displayEl: null,   // cached #timer-display
    _startBtn: null,    // cached #timer-start
    _stopBtn: null,     // cached #timer-stop
    _resetBtn: null,    // cached #timer-reset
    remainingSec: DURATION, // current remaining seconds (Requirement 2.1)
    intervalId: null,       // active setInterval id, null when none (Requirement 2.5)
    status: "idle",          // "idle" | "running" | "paused" | "finished"

    // Mount into #timer-section, cache DOM refs, bind buttons, and render the
    // initial display. Safe to call again: clears a leaked interval first.
    init: function (rootEl) {
      this._rootEl = rootEl || null;

      // Cache references to the display and controls within the root.
      if (this._rootEl) {
        this._displayEl = this._rootEl.querySelector("#timer-display");
        this._startBtn = this._rootEl.querySelector("#timer-start");
        this._stopBtn = this._rootEl.querySelector("#timer-stop");
        this._resetBtn = this._rootEl.querySelector("#timer-reset");
      } else {
        this._displayEl = null;
        this._startBtn = null;
        this._stopBtn = null;
        this._resetBtn = null;
      }

      // Avoid leaking/duplicating a previous interval if init is called again
      // (mirrors greeting.js re-init handling).
      if (this.intervalId !== null && typeof global.clearInterval === "function") {
        global.clearInterval(this.intervalId);
      }

      // Reset module state to a fresh countdown.
      this.remainingSec = DURATION;
      this.intervalId = null;
      this.status = "idle";

      // Bind the controls (only if the buttons exist). start() is idempotent,
      // so even duplicate listeners from a re-init cannot start a second interval.
      var self = this;
      if (this._startBtn) {
        this._startBtn.addEventListener("click", function () { self.start(); });
      }
      if (this._stopBtn) {
        this._stopBtn.addEventListener("click", function () { self.stop(); });
      }
      if (this._resetBtn) {
        this._resetBtn.addEventListener("click", function () { self.reset(); });
      }

      // Render the initial display ("25:00") and sync button state.
      this._render();
      this._updateButtons();
    },

    // Begin or resume the countdown. Idempotent while already running: a
    // second call never starts a second interval (Requirement 2.5).
    start: function () {
      if (this.status === "running") {
        return;
      }
      this.status = "running";
      this._updateButtons();

      // Defensive: only start an interval if the host provides setInterval.
      if (typeof global.setInterval !== "function") {
        return;
      }
      var self = this;
      this.intervalId = global.setInterval(function () {
        self._tick();
      }, 1000);
    },

    // Internal: one second elapsed. Decrement, update the display, and stop at
    // zero — never letting remainingSec fall below zero (Requirements 2.4, 2.6).
    _tick: function () {
      this.remainingSec -= 1;

      if (this.remainingSec <= 0) {
        // Clamp to zero and finish.
        this.remainingSec = 0;
        if (this.intervalId !== null && typeof global.clearInterval === "function") {
          global.clearInterval(this.intervalId);
        }
        this.intervalId = null;
        this.status = "finished";
        this._render();
        this._notifyCompletion();
        this._updateButtons();
      } else {
        this._render();
      }
    },

    // Pause the countdown, preserving the remaining time (Requirement 2.2).
    stop: function () {
      if (this.status === "running") {
        if (this.intervalId !== null && typeof global.clearInterval === "function") {
          global.clearInterval(this.intervalId);
        }
        this.intervalId = null;
        this.status = "paused";
        this._updateButtons();
      }
      // remainingSec is intentionally left unchanged (Requirement 2.2).
    },

    // Stop and restore remaining time to DURATION (Requirement 2.3).
    reset: function () {
      if (this.intervalId !== null && typeof global.clearInterval === "function") {
        global.clearInterval(this.intervalId);
      }
      this.intervalId = null;
      this.remainingSec = DURATION;
      this.status = "idle";
      this._render();
      this._updateButtons();
    },

    // Internal: write the current remainingSec to the display as MM:SS.
    _render: function () {
      if (this._displayEl) {
        this._displayEl.textContent = this.formatTime(this.remainingSec);
      }
    },

    // Pure: seconds -> "MM:SS" with zero-padded minutes and seconds.
    // Negative input is clamped to zero defensively. No side effects.
    formatTime: function (totalSec) {
      var sec = Math.max(0, Math.floor(totalSec));
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      var pad2 = function (n) {
        return n < 10 ? "0" + n : "" + n;
      };
      return pad2(m) + ":" + pad2(s);
    },

    // Internal: keep the controls' enabled/disabled state consistent with the
    // current status, and mirror the status onto the display for CSS (Task 8.2).
    _updateButtons: function () {
      var startOn, stopOn, resetOn;
      switch (this.status) {
        case "running":
          startOn = false; stopOn = true; resetOn = true; break;
        case "paused":
          startOn = true; stopOn = false; resetOn = true; break;
        case "finished":
          startOn = true; stopOn = false; resetOn = true; break;
        default: /* idle */
          startOn = true; stopOn = false; resetOn = true; break;
      }
      if (this._startBtn) { this._startBtn.disabled = !startOn; }
      if (this._stopBtn) { this._stopBtn.disabled = !stopOn; }
      if (this._resetBtn) { this._resetBtn.disabled = !resetOn; }

      // Mirror status onto the display so styling can react later (Task 8.2).
      // This also clears a stale "finished" state when reset/start/stop fire.
      if (this._displayEl) {
        this._displayEl.setAttribute("data-status", this.status);
      }
    },

    // Internal: lightweight, non-blocking completion notification
    // (Requirement 2.6). No alert(); never throws.
    _notifyCompletion: function () {
      if (this._displayEl) {
        this._displayEl.setAttribute("data-status", "finished");
      }
      if (typeof console !== "undefined" && console.info) {
        console.info("TimerModule: focus session complete (reached 00:00).");
      }
    }
  };
  

  global.Dashboard.TimerModule = TimerModule;
  global.TimerModule = TimerModule;
})(typeof window !== "undefined" ? window : this);

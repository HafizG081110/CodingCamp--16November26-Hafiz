/* quicklinks.js — QuickLinksModule: link buttons + persistence.
 * Skeleton for Task 1; the full implementation lands in Task 7.1.
 * Labels are rendered via textContent (never innerHTML); links open in a new
 * tab with noopener,noreferrer. URLs are restricted to the http/https scheme.
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var QuickLinksModule = {
    // Mount into #quicklinks-section, load links from StorageHelper, and render.
    // TODO(Task 7.1): load persisted links, bind form, render buttons.
    init: function (rootEl) {
      this._rootEl = rootEl || null;
      this._links = [];
    },

    // Create a link, persist, and render.
    // TODO(Task 7.1): validate label + http(s) url, persist, render.
    addLink: function (label, url) {
      // stub
    },

    // Remove a link, persist, and render.
    // TODO(Task 7.1): filter out matching link, persist, render.
    deleteLink: function (id) {
      // stub
    },

    // Open a URL in a new tab with noopener,noreferrer.
    // TODO(Task 7.1): validate scheme, window.open(url, "_blank", "noopener,noreferrer").
    openLink: function (url) {
      // stub
    },

    // Reconcile the DOM with the link list.
    // TODO(Task 7.1): rebuild buttons via textContent.
    renderLinks: function () {
      // stub
    }
  };

  global.Dashboard.QuickLinksModule = QuickLinksModule;
  global.QuickLinksModule = QuickLinksModule;
})(typeof window !== "undefined" ? window : this);

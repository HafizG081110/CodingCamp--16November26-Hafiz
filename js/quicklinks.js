/* quicklinks.js — QuickLinksModule: link buttons + persistence.
 * Implementation for Task 7.1.
 * Loads links from StorageHelper on init; persists and re-renders after every
 * mutation (add/delete). User-entered text is rendered via textContent
 * (never innerHTML) for XSS safety; links open in a new tab with
 * noopener,noreferrer. URLs are restricted to the http/https scheme both
 * before storing and before opening. All persistence goes through
 * StorageHelper — this module never touches localStorage directly.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var QuickLinksModule = {
    // --- Module-scoped state (mirrors greeting.js / timer.js / todo.js) ---
    _rootEl: null,
    _links: [],          // QuickLink[] loaded from StorageHelper (Req 4.5)
    _formEl: null,       // cached #quicklinks-form
    _labelEl: null,      // cached #quicklink-label
    _urlEl: null,        // cached #quicklink-url
    _listEl: null,       // cached #quicklinks-list
    _messageEl: null,    // inline validation message element
    _msgTimer: null,     // timeout id for auto-clearing the message

    // Mount into #quicklinks-section, load persisted links, bind the form, and
    // render. Safe to call again: clone-replaces the form to discard stale
    // listeners, reloads from storage, and re-renders (Req 4.5).
    init: function (rootEl) {
      this._rootEl = rootEl || null;

      // Cache the form, inputs, and list container within the root.
      if (this._rootEl) {
        this._formEl = this._rootEl.querySelector("#quicklinks-form");
        this._labelEl = this._rootEl.querySelector("#quicklink-label");
        this._urlEl = this._rootEl.querySelector("#quicklink-url");
        this._listEl = this._rootEl.querySelector("#quicklinks-list");
      } else {
        this._formEl = null;
        this._labelEl = null;
        this._urlEl = null;
        this._listEl = null;
      }

      // Re-init safety: clone-replace the form so any previously bound submit
      // listeners are discarded (prevents duplicate addLink calls on resubmit).
      if (this._formEl && this._formEl.parentNode) {
        var clone = this._formEl.cloneNode(true);
        this._formEl.parentNode.replaceChild(clone, this._formEl);
        this._formEl = clone;
      }
      // Re-resolve the inputs from the (possibly cloned) form.
      if (this._formEl) {
        this._labelEl = this._formEl.querySelector("#quicklink-label");
        this._urlEl = this._formEl.querySelector("#quicklink-url");
      }

      // Ensure a small inline validation message element exists just below the
      // form. Reuse an existing one on re-init to avoid duplicates.
      if (this._rootEl) {
        this._messageEl = this._rootEl.querySelector(".quicklinks-message");
        if (!this._messageEl && this._formEl && this._formEl.parentNode) {
          this._messageEl = global.document.createElement("p");
          this._messageEl.className = "quicklinks-message";
          this._messageEl.setAttribute("role", "alert");
          this._messageEl.textContent = "";
          this._formEl.parentNode.insertBefore(this._messageEl, this._formEl.nextSibling);
        }
      } else {
        this._messageEl = null;
      }

      // Clear any pending message auto-clear timer from a prior init.
      if (this._msgTimer !== null && typeof global.clearTimeout === "function") {
        global.clearTimeout(this._msgTimer);
      }
      this._msgTimer = null;

      // Load persisted links from StorageHelper (fallback [] on missing/corrupt;
      // never throws). Defensive: coerce non-array stored data back to [].
      var SH = this._storage();
      var loaded = SH ? SH.loadJSON(SH.keys.QUICKLINKS, []) : [];
      this._links = Array.isArray(loaded) ? loaded : [];

      // Bind the form submit: add the link, clear the inputs, refocus the label.
      var self = this;
      if (this._formEl) {
        this._formEl.addEventListener("submit", function (event) {
          if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
          }
          var label = self._labelEl ? self._labelEl.value : "";
          var url = self._urlEl ? self._urlEl.value : "";
          self.addLink(label, url);
          if (self._labelEl) {
            self._labelEl.value = "";
          }
          if (self._urlEl) {
            self._urlEl.value = "";
          }
          if (self._labelEl && typeof self._labelEl.focus === "function") {
            self._labelEl.focus();
          }
        });
      }

      this.renderLinks();
    },

    // Create a link, persist, and render (Requirement 4.1).
    // Rejects blank/whitespace labels and URLs that are missing a protocol or
    // use a non-http(s) scheme: no mutation, no storage write (Requirement 4.2).
    addLink: function (label, url) {
      if (!Array.isArray(this._links)) { this._links = []; }
      var trimmedLabel = this._trim(label);
      var trimmedUrl = this._trim(url);

      if (trimmedLabel === "") {
        this._showValidation("Link label cannot be empty");
        return; // no mutation, no storage write
      }
      if (!this._isValidHttpUrl(trimmedUrl)) {
        this._showValidation("Link URL must start with http:// or https://");
        return; // no mutation, no storage write
      }

      var link = {
        id: this._generateId(),
        label: trimmedLabel,
        url: trimmedUrl
      };
      this._links.push(link); // append; existing order preserved
      this._saveLinks();
      this.renderLinks();
    },

    // Remove a link, persist, and render (Requirement 4.4).
    // Resulting array is the original minus exactly the matching element(s).
    deleteLink: function (id) {
      if (!Array.isArray(this._links)) { this._links = []; }
      this._links = this._links.filter(function (l) { return l.id !== id; });
      this._saveLinks();
      this.renderLinks();
    },

    // Open a URL in a new tab with noopener,noreferrer (Requirement 4.3).
    // Defense in depth: re-validate the scheme is http/https before opening —
    // never open a javascript:/data:/file: URL even if one somehow reached here.
    openLink: function (url) {
      var trimmed = this._trim(url);
      if (!this._isValidHttpUrl(trimmed)) {
        this._showValidation("Link URL must start with http:// or https://");
        return; // invalid scheme: do nothing, never open
      }
      if (typeof global.open !== "function") {
        // Environments without window.open (e.g. some test runners): no-op.
        return;
      }
      global.open(trimmed, "_blank", "noopener,noreferrer");
    },

    // Reconcile the DOM with the link list (Requirements 4.1, 4.5).
    // Rebuilds the #quicklinks-list with one item per link using createElement +
    // textContent only — never innerHTML.
    renderLinks: function () {
      if (!this._listEl || typeof global.document === "undefined") {
        return;
      }
      var list = this._listEl;
      // Clear existing children safely (textContent, not innerHTML).
      list.textContent = "";

      var links = Array.isArray(this._links) ? this._links : [];
      for (var i = 0; i < links.length; i++) {
        list.appendChild(this._buildItem(links[i]));
      }
    },

    // --- Internal helpers ---

    // Build a single link item: a button showing the label (opens the URL) and a
    // Delete control. textContent only; never innerHTML — XSS safe.
    _buildItem: function (link) {
      var doc = global.document;
      var self = this;

      var item = doc.createElement("div");
      item.setAttribute("data-id", String(link.id));
      item.className = "quicklink-item";

      // Open button: visible text is the link label (textContent, never innerHTML).
      var openBtn = doc.createElement("button");
      openBtn.type = "button";
      openBtn.className = "quicklink-open";
      openBtn.textContent = link.label != null ? String(link.label) : "";
      openBtn.setAttribute("aria-label", "Open " + (link.label != null ? String(link.label) : "link"));
      openBtn.addEventListener("click", function () {
        self.openLink(link.url);
      });
      item.appendChild(openBtn);

      // Delete button (Requirement 4.4).
      var deleteBtn = doc.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "quicklink-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete link");
      deleteBtn.addEventListener("click", function () {
        self.deleteLink(link.id);
      });
      item.appendChild(deleteBtn);

      return item;
    },

    // Validate that a URL string parses and uses the http or https scheme.
    // Never throws: a malformed URL string returns false. Catches javascript:,
    // data:, file:, ftp:, and protocol-relative/missing-protocol URLs.
    _isValidHttpUrl: function (url) {
      if (typeof url !== "string" || url.trim() === "") {
        return false;
      }
      var parsed;
      try {
        parsed = new global.URL(url);
      } catch (e) {
        return false;
      }
      // protocol is lowercased by the URL parser, e.g. "http:" / "https:".
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    },

    // Trim text defensively (coerce non-strings to "" so validation still works).
    _trim: function (text) {
      var s = text == null ? "" : String(text);
      return s.trim();
    },

    // Generate a unique id. Prefers crypto.randomUUID(); falls back to a
    // timestamp + random composite for environments without it.
    _generateId: function () {
      if (global.crypto && typeof global.crypto.randomUUID === "function") {
        try { return global.crypto.randomUUID(); } catch (e) { /* fall through */ }
      }
      return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    },

    // Persist the current link array through StorageHelper (never throws).
    _saveLinks: function () {
      var SH = this._storage();
      if (SH && SH.saveJSON) {
        SH.saveJSON(SH.keys.QUICKLINKS, this._links);
      }
    },

    // Resolve the StorageHelper (set on both Dashboard and global by storage.js).
    _storage: function () {
      return (global.Dashboard && global.Dashboard.StorageHelper) || global.StorageHelper || null;
    },

    // Show a brief, non-blocking inline validation message. No alert().
    _showValidation: function (msg) {
      if (!this._messageEl) { return; }
      this._messageEl.textContent = msg;
      if (this._msgTimer !== null && typeof global.clearTimeout === "function") {
        global.clearTimeout(this._msgTimer);
      }
      var self = this;
      if (typeof global.setTimeout === "function") {
        this._msgTimer = global.setTimeout(function () {
          if (self._messageEl) { self._messageEl.textContent = ""; }
          self._msgTimer = null;
        }, 2500);
      }
    }
  };

  global.Dashboard.QuickLinksModule = QuickLinksModule;
  global.QuickLinksModule = QuickLinksModule;
})(typeof window !== "undefined" ? window : this);

/* storage.js — StorageHelper: the only localStorage gateway.
 * Handles JSON (de)serialization, key namespacing (prefix "todo-dashboard:"),
 * parse-error recovery, and QuotaExceededError handling. By convention, only
 * this module may touch localStorage directly (Requirements 5.1-5.5).
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var StorageHelper = {
    // Namespaced keys (per design: prefix "todo-dashboard:")
    keys: {
      TASKS: "todo-dashboard:tasks",
      QUICKLINKS: "todo-dashboard:quicklinks"
    }
  };

  // Read and parse a JSON value; return the fallback on missing/invalid data.
  // Requirement 5.2: a missing key (null) or corrupt JSON returns the fallback
  // and never throws to the caller. Parse errors are logged via console.error.
  StorageHelper.loadJSON = function (key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      // A missing key yields null from getItem; hand back the fallback.
      if (raw === null) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.error(
        "StorageHelper.loadJSON: failed to read/parse key '" + key + "'",
        error
      );
      return fallback;
    }
  };

  // Serialize and write a JSON-serializable value; return true on success.
  // Requirement 5.3: a serialization failure or a write error — including
  // QuotaExceededError — is caught and reported (logged) without crashing;
  // false is returned in either case. Never throws to the caller.
  StorageHelper.saveJSON = function (key, value) {
    var json;
    try {
      json = JSON.stringify(value);
    } catch (error) {
      console.error(
        "StorageHelper.saveJSON: failed to stringify value for key '" + key + "'",
        error
      );
      return false;
    }
    try {
      localStorage.setItem(key, json);
      return true;
    } catch (error) {
      // Covers QuotaExceededError (error.name === "QuotaExceededError") and
      // any other setItem failure (e.g. storage disabled in the environment).
      console.error(
        "StorageHelper.saveJSON: failed to write key '" + key + "' to localStorage",
        error
      );
      return false;
    }
  };

  // Remove a key entirely. Defensive: never throws to the caller.
  StorageHelper.removeKey = function (key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(
        "StorageHelper.removeKey: failed to remove key '" + key + "' from localStorage",
        error
      );
    }
  };

  global.Dashboard.StorageHelper = StorageHelper;
  global.StorageHelper = StorageHelper;
})(typeof window !== "undefined" ? window : this);

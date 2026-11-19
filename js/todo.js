/* todo.js — TodoModule: to-do CRUD + persistence.
 * Implementation for Task 6.1.
 * Loads tasks from StorageHelper on init; persists and re-renders after every
 * mutation (add/edit/toggle/delete). User-entered text is rendered via
 * textContent (never innerHTML) for XSS safety. All persistence goes through
 * StorageHelper — this module never touches localStorage directly.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
(function (global) {
  "use strict";

  global.Dashboard = global.Dashboard || {};

  var TodoModule = {
    // --- Module-scoped state (mirrors greeting.js / timer.js conventions) ---
    _rootEl: null,
    _tasks: [],            // Task[] loaded from StorageHelper (Req 3.6)
    _formEl: null,         // cached #todo-form
    _inputEl: null,        // cached #todo-input
    _listEl: null,         // cached #todo-list
    _messageEl: null,      // inline validation message element
    _msgTimer: null,       // timeout id for auto-clearing the message

    // Mount into #todo-section, load persisted tasks, bind the form, and render.
    // Safe to call again: clone-replaces the form to discard stale listeners,
    // reloads from storage, and re-renders.
    init: function (rootEl) {
      this._rootEl = rootEl || null;

      // Cache the list container and form within the root.
      if (this._rootEl) {
        this._listEl = this._rootEl.querySelector("#todo-list");
        this._formEl = this._rootEl.querySelector("#todo-form");
      } else {
        this._listEl = null;
        this._formEl = null;
      }

      // Re-init safety: clone-replace the form so any previously bound submit
      // listeners are discarded (prevents duplicate addTask calls on resubmit).
      if (this._formEl && this._formEl.parentNode) {
        var clone = this._formEl.cloneNode(true);
        this._formEl.parentNode.replaceChild(clone, this._formEl);
        this._formEl = clone;
      }
      this._inputEl = this._formEl ? this._formEl.querySelector("#todo-input") : null;

      // Ensure a small inline validation message element exists just below the
      // form. Reuse an existing one on re-init to avoid duplicates.
      if (this._rootEl) {
        this._messageEl = this._rootEl.querySelector(".todo-message");
        if (!this._messageEl && this._formEl && this._formEl.parentNode) {
          this._messageEl = global.document.createElement("p");
          this._messageEl.className = "todo-message";
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

      // Load persisted tasks from StorageHelper (fallback [] on missing/corrupt;
      // never throws). Defensive: coerce non-array stored data back to [].
      var SH = this._storage();
      var loaded = SH ? SH.loadJSON(SH.keys.TASKS, []) : [];
      this._tasks = Array.isArray(loaded) ? loaded : [];

      // Bind the form submit: add the task, clear the input, keep focus.
      var self = this;
      if (this._formEl) {
        this._formEl.addEventListener("submit", function (event) {
          if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
          }
          var value = self._inputEl ? self._inputEl.value : "";
          self.addTask(value);
          if (self._inputEl) {
            self._inputEl.value = "";
            if (typeof self._inputEl.focus === "function") {
              self._inputEl.focus();
            }
          }
        });
      }

      this.renderTasks();
    },

    // Create a task, persist, and render (Requirement 3.1).
    // Blank/whitespace text is rejected with no mutation and no storage write
    // (Requirement 3.2).
    addTask: function (text) {
      if (!Array.isArray(this._tasks)) { this._tasks = []; }
      var trimmed = this._trim(text);
      if (trimmed === "") {
        this._showValidation("Task cannot be empty");
        return; // no mutation, no storage write
      }
      var task = {
        id: this._generateId(),
        text: trimmed,
        done: false,
        createdAt: new Date().toISOString()
      };
      this._tasks.push(task); // append; existing order preserved
      this._saveTasks();
      this.renderTasks();
    },

    // Update a task's text, persist, and render (Requirement 3.3).
    // Blank/whitespace edits are ignored (no mutation, no storage write).
    editTask: function (id, newText) {
      if (!Array.isArray(this._tasks)) { this._tasks = []; }
      var trimmed = this._trim(newText);
      if (trimmed === "") {
        return; // ignore blank edits
      }
      for (var i = 0; i < this._tasks.length; i++) {
        // Invariant: tasks whose id !== id are never modified.
        if (this._tasks[i].id === id) {
          this._tasks[i].text = trimmed; // only the matching task changes
        }
      }
      this._saveTasks();
      this.renderTasks();
    },

    // Flip a task's done flag, persist, and render (Requirement 3.4).
    toggleTask: function (id) {
      if (!Array.isArray(this._tasks)) { this._tasks = []; }
      for (var i = 0; i < this._tasks.length; i++) {
        // Invariant: only the matching task may change.
        if (this._tasks[i].id === id) {
          this._tasks[i].done = !this._tasks[i].done;
        }
      }
      this._saveTasks();
      this.renderTasks();
    },

    // Remove a task, persist, and render (Requirement 3.5).
    deleteTask: function (id) {
      if (!Array.isArray(this._tasks)) { this._tasks = []; }
      // Resulting array is the original minus exactly the matching element(s).
      this._tasks = this._tasks.filter(function (t) { return t.id !== id; });
      this._saveTasks();
      this.renderTasks();
    },

    // Reconcile the DOM with the task list (Requirements 3.1, 3.6).
    // Rebuilds the <ul> with one <li> per task using createElement + textContent
    // only — never innerHTML.
    renderTasks: function () {
      if (!this._listEl || typeof global.document === "undefined") {
        return;
      }
      var list = this._listEl;
      // Clear existing children safely (textContent, not innerHTML).
      list.textContent = "";

      var tasks = Array.isArray(this._tasks) ? this._tasks : [];
      for (var i = 0; i < tasks.length; i++) {
        list.appendChild(this._buildItem(tasks[i]));
      }
    },

    // --- Internal helpers ---

    // Build a single <li> for a task. textContent only; never innerHTML.
    _buildItem: function (task) {
      var doc = global.document;
      var self = this;

      var li = doc.createElement("li");
      li.setAttribute("data-id", String(task.id));
      li.classList.add("todo-item");
      if (task.done) {
        li.classList.add("completed"); // styling hook for Task 8.2 (strike-through)
      }

      // Checkbox: reflects done; toggling flips the flag (Requirement 3.4).
      var checkbox = doc.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!task.done;
      checkbox.setAttribute("aria-label", "Mark task done");
      checkbox.addEventListener("change", function () {
        self.toggleTask(task.id);
      });
      li.appendChild(checkbox);

      // Text span (textContent, never innerHTML — XSS safe).
      var span = doc.createElement("span");
      span.className = "todo-text";
      span.textContent = task.text != null ? String(task.text) : "";
      li.appendChild(span);

      // Edit button -> inline edit mode (Requirement 3.3).
      var editBtn = doc.createElement("button");
      editBtn.type = "button";
      editBtn.className = "todo-edit";
      editBtn.textContent = "Edit";
      editBtn.setAttribute("aria-label", "Edit task");
      editBtn.addEventListener("click", function () {
        self._startEdit(li, task);
      });
      li.appendChild(editBtn);

      // Delete button (Requirement 3.5).
      var deleteBtn = doc.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "todo-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete task");
      deleteBtn.addEventListener("click", function () {
        self.deleteTask(task.id);
      });
      li.appendChild(deleteBtn);

      return li;
    },

    // Swap a <li> into inline edit mode: text input prefilled + Save/Cancel.
    // Save trims and calls editTask (ignoring blanks); Cancel re-renders.
    _startEdit: function (li, task) {
      if (!li || typeof global.document === "undefined") { return; }
      var doc = global.document;
      var self = this;

      // Clear the li and present an inline editor (textContent clear, no innerHTML).
      li.textContent = "";
      li.classList.add("editing");

      var input = doc.createElement("input");
      input.type = "text";
      input.value = task.text != null ? String(task.text) : "";
      input.className = "todo-edit-input";
      input.setAttribute("aria-label", "Edit task text");

      var saveBtn = doc.createElement("button");
      saveBtn.type = "button";
      saveBtn.textContent = "Save";
      saveBtn.className = "todo-edit-save";
      saveBtn.addEventListener("click", function () {
        var v = self._trim(input.value);
        if (v === "") {
          return; // ignore blank edits (no mutation, no storage write)
        }
        // editTask persists and re-renders, restoring the text span.
        self.editTask(task.id, v);
      });

      var cancelBtn = doc.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.className = "todo-edit-cancel";
      cancelBtn.addEventListener("click", function () {
        self.renderTasks(); // discard edits, restore the list
      });

      li.appendChild(input);
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);
      if (typeof input.focus === "function") { input.focus(); }
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

    // Persist the current task array through StorageHelper (never throws).
    _saveTasks: function () {
      var SH = this._storage();
      if (SH && SH.saveJSON) {
        SH.saveJSON(SH.keys.TASKS, this._tasks);
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

  global.Dashboard.TodoModule = TodoModule;
  global.TodoModule = TodoModule;
})(typeof window !== "undefined" ? window : this);

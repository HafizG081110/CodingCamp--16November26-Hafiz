/* Temporary smoke test for TodoModule (Task 6.1). Not part of the project. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const { webcrypto } = require("crypto");

const ROOT = "c:\\Users\\Muhammad Hafiz G\\revou\\CodingCamp--16November26-Hafiz";

// Minimal in-memory localStorage.
function makeStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    _dump() { return Object.fromEntries(store); }
  };
}

// Minimal document stub so renderTasks/_buildItem/_startEdit can run.
function makeDocument() {
  function El(tag) {
    const self = {
      tagName: tag.toUpperCase(),
      _children: [],
      _attrs: {},
      _cls: new Set(),
      _listeners: {},
      style: {},
      value: "",
      checked: false,
      setAttribute(n, v) { self._attrs[n] = String(v); },
      getAttribute(n) { return self._attrs[n] != null ? self._attrs[n] : null; },
      classList: { add: (c) => self._cls.add(c), remove: (c) => self._cls.delete(c), contains: (c) => self._cls.has(c), toggle: (c) => { self._cls.has(c) ? self._cls.delete(c) : self._cls.add(c); } },
      appendChild(c) { self._children.push(c); c.parentNode = self; return c; },
      removeChild(c) { const i = self._children.indexOf(c); if (i >= 0) self._children.splice(i, 1); return c; },
      replaceChild(n, o) { const i = self._children.indexOf(o); if (i >= 0) self._children[i] = n; n.parentNode = self; o.parentNode = null; return o; },
      insertBefore(n, r) { const i = self._children.indexOf(r); if (i >= 0) self._children.splice(i, 0, n); else self._children.push(n); n.parentNode = self; return n; },
      cloneNode(deep) { const c = El(self.tagName); c._attrs = Object.assign({}, self._attrs); c.value = self.value; c.checked = self.checked; if (deep) { c._children = self._children.map(x => x.cloneNode(true)); c._children.forEach(x => x.parentNode = c); } return c; },
      addEventListener(t, fn) { (self._listeners[t] = self._listeners[t] || []).push(fn); },
      removeEventListener() {},
      querySelector(sel) { // only id and .class supported, shallow
        const kids = self._children;
        if (sel[0] === "#") return kids.find(k => k.getAttribute("id") === sel.slice(1)) || null;
        if (sel[0] === ".") return kids.find(k => k._cls.has(sel.slice(1))) || null;
        return kids.find(k => k.tagName === sel.toUpperCase()) || null;
      },
      focus() {}
    };
    // Real-DOM semantics: setting textContent replaces children; className syncs classList.
    let _tc = "";
    Object.defineProperty(self, "textContent", {
      get() { return _tc; },
      set(v) { _tc = String(v); self._children = []; }
    });
    Object.defineProperty(self, "className", {
      get() { return Array.from(self._cls).join(" "); },
      set(v) { self._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
    });
    return self;
  }
  return {
    createElement: (t) => { const e = El(t); e.setAttribute("id", t === "p" ? "" : ""); return e; },
    createElementNS: (t) => El("div"),
    readyState: "complete",
    addEventListener() {},
    removeEventListener() {}
  };
}

function loadFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function makeSandbox() {
  const localStorage = makeStorage();
  const document = makeDocument();
  // Build a fake #todo-section subtree once for init to mount into.
  const section = document.createElement("section");
  section.setAttribute("id", "todo-section");
  const form = document.createElement("form");
  form.setAttribute("id", "todo-form");
  const input = document.createElement("input");
  input.setAttribute("id", "todo-input");
  input.setAttribute("type", "text");
  form.appendChild(input);
  const list = document.createElement("ul");
  list.setAttribute("id", "todo-list");
  section.appendChild(form);
  section.appendChild(list);
  document._section = section;

  const sandbox = {
    window: {},
    console,
    setTimeout: (fn, t) => setTimeout(fn, t),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, t) => setInterval(fn, t),
    clearInterval: (id) => clearInterval(id),
    localStorage,
    document,
    crypto: webcrypto,
    Date,
    Math,
    JSON,
    Array,
    Object
  };
  sandbox.window = sandbox; // modules do `typeof window !== "undefined" ? window : this`
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // Load storage.js then todo.js in order.
  vm.runInContext(loadFile("js/storage.js"), sandbox, { filename: "storage.js" });
  vm.runInContext(loadFile("js/todo.js"), sandbox, { filename: "todo.js" });
  return sandbox;
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log("PASS:", name); }
  else { failures++; console.error("FAIL:", name, extra || ""); }
}

// ---- Test 1: init(null) yields empty array, no DOM needed ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  check("init(null) -> empty tasks", Array.isArray(Todo._tasks) && Todo._tasks.length === 0);
}

// ---- Test 2: addTask appends + persists + unique id + done:false + ISO createdAt ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  const before = Todo._tasks.length;
  Todo.addTask("  Buy milk  ");
  check("addTask increases length by 1", Todo._tasks.length === before + 1);
  const t = Todo._tasks[0];
  check("addTask trims text", t.text === "Buy milk");
  check("addTask done=false", t.done === false);
  check("addTask id non-empty string", typeof t.id === "string" && t.id.length > 0);
  check("addTask createdAt valid ISO", !isNaN(Date.parse(t.createdAt)));
  // persisted to storage
  const raw = sb.localStorage.getItem("todo-dashboard:tasks");
  check("addTask persists to storage", raw != null && JSON.parse(raw).length === 1);
}

// ---- Test 3: blank/whitespace rejected: no mutation, no storage write ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  Todo.addTask("real task");
  const lenBefore = Todo._tasks.length;
  const writeSpy = sb.localStorage.getItem("todo-dashboard:tasks");
  Todo.addTask("   ");
  Todo.addTask("");
  Todo.addTask("\t\n ");
  check("blank rejected: length unchanged", Todo._tasks.length === lenBefore);
  check("blank rejected: no storage write (content unchanged)", sb.localStorage.getItem("todo-dashboard:tasks") === writeSpy);
}

// ---- Test 4: editTask precision (only matching task text changes) ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  Todo.addTask("a"); Todo.addTask("b"); Todo.addTask("c");
  const id1 = Todo._tasks[1].id;
  Todo.editTask(id1, "  B edited  ");
  check("editTask changes only matching text", Todo._tasks[1].text === "B edited");
  check("editTask leaves others unchanged", Todo._tasks[0].text === "a" && Todo._tasks[2].text === "c");
  check("editTask doesn't change done", Todo._tasks[1].done === false);
  // blank edit ignored
  Todo.editTask(id1, "   ");
  check("editTask ignores blank", Todo._tasks[1].text === "B edited");
}

// ---- Test 5: toggleTask precision + idempotence ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  Todo.addTask("a"); Todo.addTask("b"); Todo.addTask("c");
  const id0 = Todo._tasks[0].id;
  const snap = Todo._tasks.map(t => ({ id: t.id, text: t.text, done: t.done }));
  Todo.toggleTask(id0);
  check("toggle flips only matching done", Todo._tasks[0].done === true && Todo._tasks[1].done === false && Todo._tasks[2].done === false);
  check("toggle leaves text unchanged", Todo._tasks[0].text === "a");
  Todo.toggleTask(id0);
  check("toggle idempotent (twice restores)", Todo._tasks[0].done === false);
  check("toggle idempotent: full array equals original", JSON.stringify(Todo._tasks.map(t=>({id:t.id,text:t.text,done:t.done}))) === JSON.stringify(snap));
}

// ---- Test 6: deleteTask precision ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  Todo.addTask("a"); Todo.addTask("b"); Todo.addTask("c");
  const id1 = Todo._tasks[1].id;
  const before = Todo._tasks.length;
  Todo.deleteTask(id1);
  check("deleteTask decreases length by 1", Todo._tasks.length === before - 1);
  check("deleteTask removes only matching", Todo._tasks.every(t => t.id !== id1));
  check("deleteTask preserves others order/text", Todo._tasks.map(t=>t.text).join(",") === "a,c");
}

// ---- Test 7: add/delete round-trip ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  Todo.addTask("x"); Todo.addTask("y");
  const snap = JSON.stringify(Todo._tasks);
  const newId = (function () {
    const n = Todo._tasks.length;
    Todo.addTask("temp roundtrip");
    return Todo._tasks[n].id;
  })();
  Todo.deleteTask(newId);
  check("add/delete round-trip restores array", JSON.stringify(Todo._tasks) === snap);
}

// ---- Test 8: init loads persisted tasks (Req 3.6) ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  // Pre-seed storage with tasks.
  sb.localStorage.setItem("todo-dashboard:tasks", JSON.stringify([
    { id: "p1", text: "persisted one", done: true, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "p2", text: "persisted two", done: false, createdAt: "2026-01-02T00:00:00.000Z" }
  ]));
  Todo.init(null);
  check("init loads persisted tasks", Todo._tasks.length === 2 && Todo._tasks[0].id === "p1");
  check("init preserves done flag", Todo._tasks[0].done === true);
  // corrupt data -> fallback []
  const sb2 = makeSandbox();
  sb2.localStorage.setItem("todo-dashboard:tasks", "{not valid json");
  sb2.Dashboard.TodoModule.init(null);
  check("init falls back to [] on corrupt data", Array.isArray(sb2.Dashboard.TodoModule._tasks) && sb2.Dashboard.TodoModule._tasks.length === 0);
}

// ---- Test 9: unique ids across many adds ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(null);
  for (let i = 0; i < 50; i++) Todo.addTask("task " + i);
  const ids = Todo._tasks.map(t => t.id);
  check("50 adds yield 50 unique ids", ids.length === 50 && new Set(ids).size === 50);
}

// ---- Test 10: renderTasks builds li nodes (DOM path, via mounted section) ----
{
  const sb = makeSandbox();
  const Todo = sb.Dashboard.TodoModule;
  Todo.init(sb.document._section);
  Todo.addTask("first");
  Todo.addTask("second");
  const list = sb.document._section.querySelector("#todo-list");
  check("renderTasks: list has 2 li children", list._children.length === 2);
  const li0 = list._children[0];
  check("li has data-id", li0.getAttribute("data-id") === Todo._tasks[0].id);
  const checkbox = li0._children.find(c => c.tagName === "INPUT");
  check("li has checkbox unchecked", checkbox && checkbox.checked === false);
  const span = li0._children.find(c => c._cls && c._cls.has("todo-text"));
  check("li text via textContent", span && span.textContent === "first");
  // toggle via checkbox change event
  checkbox._listeners.change[0]();
  check("checkbox change toggles done", Todo._tasks[0].done === true);
  // re-render created a fresh li; re-query the current one for the completed class
  const li0now = list._children[0];
  check("completed class applied when done", li0now._cls.has("completed"));
}

console.log("\n" + (failures === 0 ? "ALL TESTS PASSED" : failures + " TEST(S) FAILED"));
process.exit(failures === 0 ? 0 : 1);

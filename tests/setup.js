// tests/setup.js — global setup for vitest (jsdom environment).
//
// Why this exists:
//  - Node 22+ ships a built-in global `localStorage` exposed via a getter that
//    is undefined unless --localstorage-file is configured (it prints
//    "ExperimentalWarning: localStorage is not available ...").
//  - vitest's jsdom environment here is created WITHOUT a URL/origin, so jsdom
//    does not enable its own Web Storage either (window.localStorage is
//    undefined).
//  The dashboard's classic storage.js references the bare `localStorage`
//    global, so both the loaded implementation and the tests need a real,
//    working, per-key-persistent localStorage on globalThis.
//
// The descriptor of globalThis.localStorage is configurable, so we override it
// with a working instance: jsdom's window.localStorage when available, otherwise
// a small Map-backed shim that implements the Web Storage API used by the app
// (getItem/setItem/removeItem/clear/key/length). This is test-only
// configuration and does NOT modify any implementation under js/.

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      const k = String(key);
      return store.has(k) ? store.get(k) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

const ls =
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : makeLocalStorage();

try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: ls,
    writable: true,
    configurable: true,
  });
} catch (e) {
  try {
    globalThis.localStorage = ls;
  } catch (e2) {
    /* unable to install localStorage; tests relying on it will fail loudly */
  }
}

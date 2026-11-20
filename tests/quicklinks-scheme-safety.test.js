// tests/quicklinks-scheme-safety.test.js
//
// Feature: todo-dashboard, Property 14: Link scheme safety
// Validates: Requirements 4.2
//
// Property 14 (from design.md):
//   For any QuickLink in storage, its url scheme is http or https; any URL with
//   a missing or non-http(s) scheme is rejected with no mutation and no storage
// write.
//
// Requirement 4.2: IF the link URL is missing a protocol or uses a non-http(s)
//   scheme, THEN the Quick_Links_Module SHALL reject the input with a
//   validation message and perform no mutation and no storage write.
//
// This file tests QuickLinksModule (js/quicklinks.js), which is already
// implemented and must NOT be modified. The module is a classic IIFE that
// attaches to `window`; we load it (and its storage dependency) into the jsdom
// global so `window.QuickLinksModule` / `window.StorageHelper` become available.

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load a classic IIFE script into the jsdom global. We bind the IIFE's `window`
// parameter to `globalThis` (which is the jsdom global in this environment), so
// the script attaches StorageHelper / QuickLinksModule onto globalThis ===
// window, exactly as it does in a real browser. The IIFE picks this up via
// `typeof window !== "undefined" ? window : this`.
function loadScript(relPath) {
  const filePath = path.resolve(rootDir, relPath);
  const code = fs.readFileSync(filePath, 'utf-8');
  // eslint-disable-next-line no-new-func
  new Function('window', code)(globalThis);
}

// Load storage.js first (QuickLinksModule depends on StorageHelper), then
// quicklinks.js. Both run once per test file (vitest isolates each file in its
// own jsdom environment, so globals are fresh).
loadScript('js/storage.js');
loadScript('js/quicklinks.js');

const STORAGE_KEY = 'todo-dashboard:quicklinks';

// Mirror of the module's _isValidHttpUrl, used as a precondition/branching
// helper in the test so we can reason about acceptance vs. rejection without
// relying on the implementation under test.
function isValidHttpUrl(url) {
  if (typeof url !== 'string') return false;
  const t = url.trim();
  if (t === '') return false;
  try {
    const parsed = new URL(t);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Build a fresh #quicklinks-section DOM (matching index.html) into document.body
// so QuickLinksModule.init can mount, cache the form/inputs/list, and create its
// inline validation message element.
function mountQuickLinksSection() {
  document.body.innerHTML = '';
  const section = document.createElement('section');
  section.id = 'quicklinks-section';
  section.innerHTML =
    '<h2>Quick Links</h2>' +
    '<form id="quicklinks-form">' +
    '<input id="quicklink-label" type="text" />' +
    '<input id="quicklink-url" type="url" />' +
    '<button type="submit">Add Link</button>' +
    '</form>' +
    '<div id="quicklinks-list"></div>';
  document.body.appendChild(section);
  return section;
}

// ---------------------------------------------------------------------------
// Generators (fast-check arbitraries)
// ---------------------------------------------------------------------------

// A valid hostname label: lowercase alphanumeric only (non-alnum -> 'a').
const hostLabel = fc
  .string({ minLength: 1, maxLength: 10 })
  .map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, 'a'));

// A valid hostname like "ab.cd.com".
const hostArb = fc
  .tuple(hostLabel, hostLabel, fc.constantFrom('com', 'org', 'net', 'io', 'dev'))
  .map(([a, b, tld]) => `${a}.${b}.${tld}`);

// An optional URL-safe path: "" or "/<encoded>".
const pathArb = fc
  .tuple(fc.boolean(), fc.string({ minLength: 1, maxLength: 15 }))
  .map(([has, s]) => (has ? '/' + encodeURIComponent(s) : ''));

// A guaranteed-valid absolute http/https URL (regardless of fast-check version
// API for webUrl). new URL() parses it to an http or https URL.
const validUrlArb = fc
  .tuple(fc.constantFrom('http', 'https'), hostArb, pathArb)
  .map(([scheme, host, p]) => `${scheme}://${host}${p}`);

// A guaranteed-invalid (non-http/https) URL: explicit dangerous/missing-scheme
// cases plus random junk filtered to ensure it is NOT a valid http/https URL.
const invalidUrlArb = fc.oneof(
  fc.constant('javascript:alert(1)'),
  fc.constant('data:text/html,hello'),
  fc.constant('file:///etc/passwd'),
  fc.constant('ftp://example.com/file'),
  fc.constant('mailto:a@b.com'),
  fc.constant('//example.com/path'), // protocol-relative: new URL throws (no base)
  fc.constant('example.com'), // bare host, no scheme
  fc.constant('not a url'),
  fc.constant(''),
  fc.constant('   '),
  fc.string({ maxLength: 50 }).filter((s) => !isValidHttpUrl(s))
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickLinksModule — Property 14: Link scheme safety', () => {
  beforeEach(() => {
    // Fake timers so the module's validation-message auto-clear setTimeout
    // never schedules a real timer (keeps the run clean, no pending handles).
    vi.useFakeTimers();
    localStorage.clear();
    const section = mountQuickLinksSection();
    window.QuickLinksModule.init(section);
    window.QuickLinksModule._links = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('modules load and expose the expected API', () => {
    expect(typeof window.StorageHelper).toBe('object');
    expect(typeof window.StorageHelper.loadJSON).toBe('function');
    expect(typeof window.QuickLinksModule).toBe('object');
    expect(typeof window.QuickLinksModule.addLink).toBe('function');
  });

  // Feature: todo-dashboard, Property 14: Link scheme safety
  // Validates: Requirements 4.2
  //
  // Acceptance direction: for any valid absolute http/https URL, addLink adds
  // exactly one link whose stored url has an http/https scheme, and the array
  // is persisted to localStorage.
  test('valid http/https URLs are accepted, persisted, and stored with an http/https scheme', () => {
    fc.assert(
      fc.property(validUrlArb, (url) => {
        // Fresh slate for this run.
        localStorage.clear();
        window.QuickLinksModule._links = [];

        window.QuickLinksModule.addLink('My Link', url);

        const links = window.QuickLinksModule._links;
        // Exactly one link was added (mutation occurred).
        expect(links.length).toBe(1);
        // The stored url's scheme is http or https (Property 14).
        const stored = links[0].url;
        const proto = new URL(stored).protocol;
        expect(proto === 'http:' || proto === 'https:').toBe(true);
        // The array was persisted (a storage write occurred).
        expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  // Feature: todo-dashboard, Property 14: Link scheme safety
  // Validates: Requirements 4.2
  //
  // Rejection direction: for any URL that is NOT a valid http/https URL
  // (missing protocol, or javascript:/data:/file:/ftp:/mailto:/protocol-
  // relative/bare/empty), addLink performs no mutation and no storage write,
  // and shows a validation message.
  test('non-http(s) URLs are rejected with no mutation, no storage write, and a validation message', () => {
    fc.assert(
      fc.property(invalidUrlArb, (url) => {
        // Precondition: the generator guarantees this is not a valid http/https URL.
        expect(isValidHttpUrl(url)).toBe(false);

        // Fresh slate for this run.
        localStorage.clear();
        window.QuickLinksModule._links = [];

        window.QuickLinksModule.addLink('My Link', url);

        // No mutation: the link array is unchanged (still empty).
        expect(window.QuickLinksModule._links.length).toBe(0);
        // No storage write: the key was never set (still null).
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        // A validation message is shown (Requirement 4.2).
        const msg = window.QuickLinksModule._messageEl;
        expect(msg).not.toBeNull();
        expect((msg.textContent || '').trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

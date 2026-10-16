// Preloaded (node --require) by traffic-mix.js: the server under measurement
// must never reach the internet (scraper, AI, Codeforces sync). Any request
// to a non-local host fails immediately, as it would when a site is down.
const Module = require("node:module");

const isLocal = (u) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//i.test(String(u?.url || u));
const offline = (u) => Promise.reject(new Error(`offline (traffic-mix): ${String(u?.url || u).slice(0, 80)}`));

const realFetch = globalThis.fetch;
globalThis.fetch = (u, opts) => (isLocal(u) ? realFetch(u, opts) : offline(u));

const load = Module._load;
Module._load = function (request, parent, isMain) {
  const mod = load.apply(this, arguments);
  if (request === "node-fetch") {
    const wrapped = (u, opts) => (isLocal(u) ? mod(u, opts) : offline(u));
    return Object.assign(wrapped, mod, { default: wrapped });
  }
  return mod;
};

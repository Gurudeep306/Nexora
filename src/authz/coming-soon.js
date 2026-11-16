// The page everyone but the owner, admins and early-access users sees while
// the site is private (direct page loads; the React app draws the same screen
// itself: client/src/components/site/ComingSoon.tsx). Nothing but the NG mark
// writing itself, over a faint copy so it never disappears; no visible words.
// The mark is the link to the owner sign-in. Light and dark follow
// prefers-color-scheme (the server cannot know the visitor's theme).
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The mark's geometry (client/src/components/brand/traversal.ts).
const N = "M6.6 25.4V6.9L16.1 25.4";
const G = "M26 11.2C25.2 8.4 22.9 6.9 20.2 6.9H16.1V25.4H21.2C24.2 25.4 26 23.5 26 20.7V17.4H21.4";

function comingSoonHtml({ message = "", signInHref = "/auth?owner=1" } = {}) {
  const label = message ? `NexoraGuru is coming soon. ${message}` : "NexoraGuru is coming soon";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>NexoraGuru · Coming soon</title>
<style>
html, body { margin: 0; }
.cs { --bg: #f0eee6; --ink: #141413; --clay: #d97757; min-height: 100dvh; display: grid; place-items: center; background: var(--bg); color: var(--ink); }
@media (prefers-color-scheme: dark) { .cs { --bg: #1a1917; --ink: #f0eee6; } }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.cs-link { display: grid; place-items: center; padding: 1.5rem; border-radius: 24px; color: inherit; }
.cs-link:focus-visible { outline: 2px solid var(--clay); outline-offset: 4px; }
.cs-mark { width: 128px; height: 128px; overflow: visible; }
.cs-ghost { opacity: 0.16; }
.cs-ink path { stroke-dasharray: 1 2; stroke-dashoffset: 1.02; } /* gap > length: no round cap left behind */
.cs-n { animation: cs-n 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
.cs-g { animation: cs-g 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
.cs-dot { animation: cs-dot 3.2s ease-in-out infinite; }
@keyframes cs-n { 0% { stroke-dashoffset: 1.02; } 17%, 72% { stroke-dashoffset: 0; } 88%, 100% { stroke-dashoffset: -1.02; } }
@keyframes cs-g { 0%, 21% { stroke-dashoffset: 1.02; } 43%, 72% { stroke-dashoffset: 0; } 90%, 100% { stroke-dashoffset: -1.02; } }
@keyframes cs-dot { 0%, 42% { opacity: 0; } 48%, 76% { opacity: 1; } 92%, 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cs-n, .cs-g, .cs-dot { animation: none; } .cs-ink path { stroke-dashoffset: 0; } .cs-dot { opacity: 1; } }
</style>
</head>
<body>
<main class="cs" aria-label="${esc(label)}">
  <h1 class="sr">NexoraGuru · Coming soon</h1>
  <a class="cs-link" href="${esc(signInHref)}" aria-label="Owner sign in">
    <svg class="cs-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
        <g class="cs-ghost"><path d="${N}"/><path d="${G}"/></g>
        <g class="cs-ink"><path class="cs-n" pathLength="1" d="${N}"/><path class="cs-g" pathLength="1" d="${G}"/></g>
      </g>
      <circle class="cs-dot" cx="21.4" cy="17.4" r="2.4" fill="var(--clay)"/>
    </svg>
  </a>
</main>
</body>
</html>`;
}

module.exports = { comingSoonHtml };

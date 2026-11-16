// The page everyone but the owner, admins and early-access users sees while
// the site is private (direct page loads; the React app draws the same screen
// itself: client/src/components/site/ComingSoon.tsx and coming-soon.css).
// Standalone and tiny, in the landing page's field-journal look: parchment,
// one serif line and a binary search finding 23. Light and dark follow
// prefers-color-scheme.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function comingSoonHtml({ message = "", signInHref = "/auth?owner=1" } = {}) {
  const cells = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
    .map((v, k) => `<span class="cs-cell ${({ 4: "a", 7: "b", 5: "c" })[k] || ""}">${v}</span>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>NexoraGuru · Coming soon</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; }
/* The private-mode screen, in the landing page's field-journal look.
   Kept in step with src/authz/coming-soon.js (the server's copy for direct loads). */
.cs {
  --cs-bg: #f0eee6; --cs-card: #faf9f5; --cs-ink: #141413; --cs-ink-2: #3d3d3a; --cs-muted: #6b6a64;
  --cs-line: #cccbc8; --cs-clay: #d97757; --cs-on-clay: #141413;
  --cs-serif: 'Newsreader Variable', Newsreader, Georgia, 'Times New Roman', serif;
  --cs-sans: 'Geist Variable', Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --cs-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
  min-height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; background: var(--cs-bg); color: var(--cs-ink);
  font-family: var(--cs-sans);
}
@media (prefers-color-scheme: dark) { .cs { --cs-bg: #1a1917; --cs-card: #22211e; --cs-ink: #f0eee6; --cs-ink-2: #d4d1c7; --cs-muted: #a5a299; --cs-line: #3a3935; } }
.cs-top, .cs-foot { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem; }
.cs-foot { border-top: 1px solid var(--cs-line); font-size: 12px; color: var(--cs-muted); }
.cs-brand { display: inline-flex; align-items: center; gap: 0.6rem; font-family: var(--cs-serif); font-size: 1.1875rem; color: var(--cs-ink); text-decoration: none; }
.cs-main { display: grid; align-content: center; justify-items: start; width: 100%; max-width: 46rem; margin: 0 auto; padding: 3rem 1.5rem 4rem; }
.cs-label { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cs-muted); }
.cs-title { margin: 1.25rem 0 0; font-family: var(--cs-serif); font-weight: 400; font-size: clamp(2.5rem, 7vw, 4.25rem); line-height: 1.04; letter-spacing: -0.02em; text-wrap: balance; }
.cs-lead { margin: 1.25rem 0 0; max-width: 34rem; font-family: var(--cs-serif); font-size: clamp(1.125rem, 2.4vw, 1.25rem); line-height: 1.45; color: var(--cs-ink-2); }
.cs-row { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; width: 100%; max-width: 30rem; margin-top: 2.75rem; }
.cs-cell { display: grid; place-items: center; aspect-ratio: 1; border-radius: 10px; border: 1px solid var(--cs-line); background: var(--cs-card); font: 500 13px/1 var(--cs-mono); color: var(--cs-muted); }
.cs-cell.a { animation: cs-a 7s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.cs-cell.b { animation: cs-b 7s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.cs-cell.c { animation: cs-c 7s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
@keyframes cs-a { 0%, 4% { border-color: var(--cs-line); color: var(--cs-muted); } 8%, 26% { border-color: var(--cs-ink); color: var(--cs-ink); } 32%, 100% { border-color: var(--cs-line); color: var(--cs-muted); } }
@keyframes cs-b { 0%, 30% { border-color: var(--cs-line); color: var(--cs-muted); } 34%, 52% { border-color: var(--cs-ink); color: var(--cs-ink); } 58%, 100% { border-color: var(--cs-line); color: var(--cs-muted); } }
@keyframes cs-c { 0%, 56% { background: var(--cs-card); border-color: var(--cs-line); color: var(--cs-muted); } 62%, 92% { background: var(--cs-clay); border-color: var(--cs-clay); color: var(--cs-on-clay); } 98%, 100% { background: var(--cs-card); border-color: var(--cs-line); color: var(--cs-muted); } }
.cs-caption { margin-top: 0.75rem; font-size: 12px; color: var(--cs-muted); }
.cs-link { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1.125rem; border: 1px solid var(--cs-line); border-radius: 0 0 8px 8px; background: var(--cs-card); color: var(--cs-ink); font: 500 14px/1 var(--cs-sans); text-decoration: none; cursor: pointer; transition: border-color 300ms; }
.cs-link:hover { border-color: var(--cs-ink); }
.cs-link:focus-visible { outline: 2px solid #c6613f; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .cs-cell.a, .cs-cell.b { animation: none; } .cs-cell.c { animation: none; background: var(--cs-clay); border-color: var(--cs-clay); color: var(--cs-on-clay); } }

.cs-mark { width: 22px; height: 22px; color: var(--cs-ink); }
</style>
</head>
<body>
<div class="cs">
  <header class="cs-top"><span class="cs-brand"><svg class="cs-mark" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 25.4V6.9L16.1 25.4"/><path d="M26 11.2C25.2 8.4 22.9 6.9 20.2 6.9H16.1V25.4H21.2C24.2 25.4 26 23.5 26 20.7V17.4H21.4"/></g><circle cx="21.4" cy="17.4" r="2.4" fill="#D97757"/></svg>NexoraGuru</span></header>
  <main class="cs-main">
    <p class="cs-label" style="margin:0">Coming soon</p>
    <h1 class="cs-title">Every idea in computer science, set in motion.</h1>
    <p class="cs-lead">${esc(message || "We are drawing the last few frames. Check back soon.")}</p>
    <div class="cs-row" aria-hidden="true">${cells}</div>
    <p class="cs-caption" style="margin:0.75rem 0 0">Binary search, finding 23 in three looks.</p>
    <p style="margin:3rem 0 0"><a class="cs-link" href="${esc(signInHref)}">Owner sign in <span aria-hidden="true">→</span></a></p>
  </main>
  <footer class="cs-foot"><span>© ${new Date().getFullYear()} NexoraGuru</span></footer>
</div>
</body>
</html>`;
}

module.exports = { comingSoonHtml };

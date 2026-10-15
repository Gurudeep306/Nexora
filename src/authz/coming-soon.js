// The page everyone but the owner, admins and early-access users sees while
// the site is private. Standalone (no client bundle needed), tiny, and on
// brand: the Traversal mark (client/src/components/brand/traversal.ts) drawn
// inline, light and dark from prefers-color-scheme.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function comingSoonHtml({ message = "", signInHref = "/auth?owner=1" } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>NexoraGuru — coming soon</title>
<style>
  :root { --bg:#f6f7fb; --fg:#12131a; --dim:#5b6070; --line:rgba(18,19,26,.08); --c1:#2f5bea; --c2:#7c3aed; --c3:#0d9488; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg:#07080d; --fg:#eceef6; --dim:#8a90a3; --line:rgba(255,255,255,.08); --c1:#5b8cff; --c2:#9b6bff; --c3:#2dd4bf; } }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--fg); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; display: grid; place-items: center; padding: 24px 16px; overflow: hidden; }
  .glow { position: fixed; inset: auto; width: 640px; height: 640px; border-radius: 50%; filter: blur(120px); opacity: .18; background: radial-gradient(circle, var(--c1), var(--c2) 45%, transparent 70%); pointer-events: none; }
  main { position: relative; text-align: center; max-width: 420px; }
  svg { width: 72px; height: 72px; overflow: visible; }
  .path { stroke-dasharray: 90; stroke-dashoffset: 90; animation: draw 1.6s cubic-bezier(.65,0,.35,1) .2s forwards; }
  circle { opacity: 0; animation: pop .4s ease-out forwards; }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes pop { to { opacity: 1; } }
  h1 { font-size: 28px; letter-spacing: -.02em; margin: 28px 0 8px; font-weight: 650; }
  p { color: var(--dim); margin: 0; }
  a { display: inline-block; margin-top: 32px; color: var(--dim); font-size: 13px; text-decoration: none; border-bottom: 1px solid var(--line); padding-bottom: 2px; }
  a:hover { color: var(--fg); }
  @media (prefers-reduced-motion: reduce) { .path, circle { animation: none; stroke-dashoffset: 0; opacity: 1; } }
</style>
</head>
<body>
<div class="glow" aria-hidden="true"></div>
<main>
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="5" y1="27" x2="27" y2="5"><stop offset="0" style="stop-color:var(--c1)"/><stop offset=".55" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c3)"/></linearGradient></defs>
    <path class="path" d="M7 25V7L15 25V7H25M15 25H25V17H20" fill="none" stroke="url(#g)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="url(#g)"><circle cx="7" cy="25" r="2.15" style="animation-delay:.2s"/><circle cx="15" cy="25" r="2.15" style="animation-delay:.9s"/><circle cx="25" cy="7" r="2.15" style="animation-delay:1.5s"/><circle cx="20" cy="17" r="2.15" style="animation-delay:1.7s"/></g>
  </svg>
  <h1>NexoraGuru is coming soon</h1>
  <p>${esc(message)}</p>
  <a href="${esc(signInHref)}">Owner sign in</a>
</main>
</body>
</html>`;
}

module.exports = { comingSoonHtml };

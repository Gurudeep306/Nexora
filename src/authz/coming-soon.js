// The page everyone but the owner, admins and early-access users sees while
// the site is private (direct page loads; the React app draws the same screen
// itself — client/src/components/site/ComingSoon.tsx). Standalone and tiny:
// the Traversal mark (client/src/components/brand/traversal.ts) drawing itself
// and then sending a signal along its two routes, soft brand light and grain
// like the sign-in page, light and dark from prefers-color-scheme.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function comingSoonHtml({ message = "", signInHref = "/auth?owner=1" } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>NexoraGuru — coming soon</title>
<style>
  :root { --bg:#f5f6fa; --fg:#12131a; --dim:#5b6070; --mute:#8a8fa0; --line:rgba(18,19,26,.12); --c1:#2f5bea; --c2:#7c3aed; --c3:#0d9488; --grain-op:.1; --grain-blend:multiply; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg:#08090e; --fg:#eceef6; --dim:#9aa0b4; --mute:#6b7186; --line:rgba(255,255,255,.12); --c1:#5b8cff; --c2:#9b6bff; --c3:#2dd4bf; --grain-op:.07; --grain-blend:overlay; } }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--fg); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; display: grid; place-items: center; padding: 24px 16px; overflow: hidden; -webkit-font-smoothing: antialiased; }
  .atmos { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
  .atmos::before { content: ""; position: absolute; inset: -12%; filter: blur(10px);
    background: radial-gradient(42% 46% at 68% 22%, color-mix(in oklab, var(--c1) 26%, transparent), transparent 70%),
                radial-gradient(36% 40% at 26% 66%, color-mix(in oklab, var(--c2) 20%, transparent), transparent 70%),
                radial-gradient(40% 30% at 80% 96%, color-mix(in oklab, var(--c3) 16%, transparent), transparent 70%);
    animation: breathe 18s cubic-bezier(.16,1,.3,1) infinite alternate; }
  .atmos::after { content: ""; position: absolute; inset: 0; background-image: ${GRAIN}; background-size: 160px; opacity: var(--grain-op); mix-blend-mode: var(--grain-blend); }
  .dots { position: absolute; inset: 0; background-image: radial-gradient(color-mix(in oklab, var(--fg) 20%, transparent) 1px, transparent 1.3px); background-size: 22px 22px; background-position: center; -webkit-mask-image: radial-gradient(56% 52% at 50% 46%, #000 10%, transparent 100%); mask-image: radial-gradient(56% 52% at 50% 46%, #000 10%, transparent 100%); opacity: .55; }
  @keyframes breathe { from { transform: translate3d(-1.5%,0,0) scale(1); } to { transform: translate3d(1.5%,-2%,0) scale(1.06); } }
  main { position: relative; text-align: center; max-width: 520px; animation: rise .9s cubic-bezier(.16,1,.3,1) both; }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } }
  .mark { position: relative; display: inline-block; }
  .mark::before { content: ""; position: absolute; inset: -28px; border-radius: 50%; filter: blur(18px); background: radial-gradient(circle, color-mix(in oklab, var(--c2) 30%, transparent), transparent 70%); }
  svg { position: relative; width: 88px; height: 88px; overflow: visible; }
  .path { stroke-dasharray: 90; stroke-dashoffset: 90; animation: draw 1.6s cubic-bezier(.65,0,.35,1) .2s forwards; }
  .sig { stroke-dasharray: 6 84; stroke-dashoffset: 90; opacity: 0; animation: signal 3.2s cubic-bezier(.45,0,.2,1) 2s infinite; }
  .bead { opacity: 0; animation: pop .45s ease-out forwards; }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes signal { 0% { stroke-dashoffset: 90; opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
  @keyframes pop { to { opacity: 1; } }
  h1 { font-size: clamp(38px, 8vw, 56px); line-height: 1.02; letter-spacing: -.035em; margin: 40px 0 0; font-weight: 650; }
  .grad { background: linear-gradient(95deg, var(--c1), var(--c2) 55%, var(--c3)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  p { color: var(--dim); margin: 20px auto 0; max-width: 380px; }
  a { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; margin-top: 48px; border-radius: 999px; color: var(--dim); font-size: 13px; font-weight: 500; text-decoration: none; box-shadow: inset 0 0 0 1px var(--line); backdrop-filter: blur(10px); transition: color .2s, box-shadow .2s; }
  a:hover { color: var(--fg); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--c1) 50%, transparent); }
  @media (prefers-reduced-motion: reduce) { .path, .bead, main, .atmos::before { animation: none; stroke-dashoffset: 0; opacity: 1; } .sig { display: none; } }
</style>
</head>
<body>
<div class="atmos" aria-hidden="true"><div class="dots"></div></div>
<main>
  <span class="mark">
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="5" y1="27" x2="27" y2="5"><stop offset="0" style="stop-color:var(--c1)"/><stop offset=".55" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c3)"/></linearGradient></defs>
      <path class="path" d="M7 25V7L15 25V7H25M15 25H25V17H20" fill="none" stroke="url(#g)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="sig" d="M7 25V7L15 25V7H25" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <g fill="url(#g)"><circle class="bead" cx="7" cy="25" r="2.15" style="animation-delay:.2s"/><circle class="bead" cx="15" cy="25" r="2.15" style="animation-delay:.9s"/><circle class="bead" cx="25" cy="7" r="2.15" style="animation-delay:1.5s"/><circle class="bead" cx="20" cy="17" r="2.15" style="animation-delay:1.7s"/></g>
    </svg>
  </span>
  <h1><span class="grad">NexoraGuru</span><br>is coming soon</h1>
  ${message ? `<p>${esc(message)}</p>` : ""}
  <a href="${esc(signInHref)}">Owner sign in <span aria-hidden="true">→</span></a>
</main>
</body>
</html>`;
}

module.exports = { comingSoonHtml };

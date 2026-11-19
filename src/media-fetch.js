// Fetch one statement image/video/audio from a judge, inside the allowlist
// (src/statement-media.js), size-capped. Used by the image proxy in
// server.js and by the statement backfill (src/sources/backfill.js), which
// keeps every figure in the database (src/media-store.js) as it stores the
// statement, so figures survive even if the judge later blocks us.
const crypto = require("crypto");
const fetch = require("node-fetch");
const { isProxyableUrl, isProxyableMediaType } = require("./statement-media");
const SCRAPE_UA = require("./sources/common").UA;

const IMG_MAX_BYTES = 8 * 1024 * 1024;

/** Drop an unread response body so its socket is released (node-fetch stream or web stream). */
function discardBody(upstream) {
  const body = upstream && upstream.body;
  if (!body) return;
  try {
    if (typeof body.destroy === "function") body.destroy();
    else if (typeof body.cancel === "function") body.cancel().catch(() => {});
  } catch {}
}

/** Read a fetch body into a Buffer, aborting as soon as it passes `max` bytes. */
async function readBodyCapped(upstream, max) {
  const declared = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) {
    discardBody(upstream);
    throw new Error("media too large");
  }
  if (!upstream.body) return Buffer.alloc(0);
  const parts = [];
  let total = 0;
  // node-fetch bodies are Node streams and web bodies are ReadableStreams;
  // both are async-iterable, and returning early from the loop destroys/cancels them.
  for await (const chunk of upstream.body) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += b.length;
    if (total > max) {
      discardBody(upstream);
      throw new Error("media too large");
    }
    parts.push(b);
  }
  return Buffer.concat(parts, total);
}

async function fetchProxiedMedia(startUrl) {
  let target = startUrl;
  let upstream = await fetch(target, {
    headers: { "User-Agent": SCRAPE_UA, Accept: "image/avif,image/webp,image/*,video/*,audio/*,*/*;q=0.8" },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  // Follow at most three redirects, staying inside the allowlist.
  for (let hops = 0; hops < 3 && [301, 302, 303, 307, 308].includes(upstream.status); hops++) {
    const loc = upstream.headers.get("location");
    if (!loc) break;
    const next = new URL(loc, target);
    if (!isProxyableUrl(next)) break;
    discardBody(upstream);
    target = next;
    upstream = await fetch(target, {
      headers: { "User-Agent": SCRAPE_UA, Accept: "image/*,video/*,audio/*,*/*;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  }
  const ctype = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!upstream.ok || !isProxyableMediaType(ctype)) {
    discardBody(upstream);
    throw new Error(`upstream ${upstream.status} ${ctype || "unknown type"}`);
  }
  const buf = await readBodyCapped(upstream, IMG_MAX_BYTES);
  if (!buf.length) throw new Error("media empty");
  return {
    buf,
    ctype,
    etag: '"' + crypto.createHash("sha1").update(buf).digest("hex").slice(0, 24) + '"',
    at: Date.now(),
  };
}


/**
 * Keep every figure of a statement (HTML already normalised to absolute
 * URLs): each one not saved yet is fetched and stored, one at a time.
 * Resolves with how many are now saved; never throws.
 */
async function keepFigures(html, { max = 24 } = {}) {
  const store = require("./media-store");
  const urls = store.mediaUrls(html).filter((u) => isProxyableUrl(u)).slice(0, max);
  let kept = 0;
  for (const u of urls) {
    try {
      const key = new URL(u).toString();
      if (await store.load(key).catch(() => null)) {
        kept++;
        continue;
      }
      await store.save(key, await fetchProxiedMedia(new URL(u)));
      kept++;
    } catch {
      /* the page still tries the judge directly, then the proxy */
    }
  }
  return kept;
}

module.exports = { discardBody, readBodyCapped, fetchProxiedMedia, keepFigures, IMG_MAX_BYTES };

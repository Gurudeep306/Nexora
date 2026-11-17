// Fetching one statement image (or video / audio) from a judge, safely:
// only allowed hosts (src/statement-media.js), at most three redirects that
// stay inside the allowlist, only raster images / video / audio, at most
// 8 MB, and an honest User-Agent (src/sources/common.js) — never a browser
// disguise. Used by the image proxy and by the problem importer.
const crypto = require("crypto");
const { isProxyableUrl, isProxyableMediaType } = require("./statement-media");
const { UA } = require("./sources/common");

const MAX_BYTES = 8 * 1024 * 1024;

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

/** Fetch one media file. Resolves to { buf, ctype, etag, at }; throws when it can't. */
async function fetchMedia(startUrl, { fetchImpl = globalThis.fetch } = {}) {
  let target = new URL(String(startUrl));
  if (!isProxyableUrl(target)) throw new Error("not an allowed media host");
  let upstream = await fetchImpl(target, {
    headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,video/*,audio/*,*/*;q=0.8" },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  for (let hops = 0; hops < 3 && [301, 302, 303, 307, 308].includes(upstream.status); hops++) {
    const loc = upstream.headers.get("location");
    if (!loc) break;
    const next = new URL(loc, target);
    if (!isProxyableUrl(next)) break;
    discardBody(upstream);
    target = next;
    upstream = await fetchImpl(target, {
      headers: { "User-Agent": UA, Accept: "image/*,video/*,audio/*,*/*;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  }
  const ctype = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!upstream.ok || !isProxyableMediaType(ctype)) {
    discardBody(upstream);
    throw new Error(`upstream ${upstream.status} ${ctype || "unknown type"}`);
  }
  const buf = await readBodyCapped(upstream, MAX_BYTES);
  if (!buf.length) throw new Error("media empty");
  return {
    buf,
    ctype,
    etag: '"' + crypto.createHash("sha1").update(buf).digest("hex").slice(0, 24) + '"',
    at: Date.now(),
  };
}

module.exports = { fetchMedia, readBodyCapped, discardBody, MAX_BYTES };

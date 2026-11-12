// Streaming reader for GitHub tarballs (ustar + pax + GNU long names).
// Calls onEntry({ path, mode, size, data|null }) for regular files; data is
// null when the file was skipped by `want(path, size)`.
const zlib = require("zlib");

function parseOctal(buf, start, len) {
  const s = buf.toString("ascii", start, start + len).replace(/\0.*$/, "").trim();
  return s ? parseInt(s, 8) : 0;
}

function parsePax(buf) {
  const out = {};
  let i = 0;
  while (i < buf.length) {
    const sp = buf.indexOf(0x20, i);
    if (sp < 0) break;
    const len = parseInt(buf.toString("ascii", i, sp), 10);
    if (!len) break;
    const rec = buf.toString("utf8", sp + 1, i + len - 1);
    const eq = rec.indexOf("=");
    if (eq > 0) out[rec.slice(0, eq)] = rec.slice(eq + 1);
    i += len;
  }
  return out;
}

/**
 * Read a gzipped tar stream (a web ReadableStream or Node stream).
 * Resolves when the archive ends; stops early (and resolves) when the
 * byte budget `maxBytes` of decompressed input is exceeded.
 */
function readTarGz(stream, { want, onEntry, maxBytes = 512 * 1024 * 1024 }) {
  return new Promise((resolve, reject) => {
    const gunzip = zlib.createGunzip();
    let buf = Buffer.alloc(0);
    let state = { kind: "header" };
    let total = 0;
    let longName = null;
    let pax = null;
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      err ? reject(err) : resolve({ truncated: total > maxBytes });
    };

    gunzip.on("data", (chunk) => {
      if (done) return;
      total += chunk.length;
      if (total > maxBytes) {
        gunzip.destroy();
        return finish();
      }
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      try {
        pump();
      } catch (e) {
        finish(e);
      }
    });
    gunzip.on("end", () => finish());
    gunzip.on("error", (e) => finish(e));

    function pump() {
      for (;;) {
        if (state.kind === "header") {
          if (buf.length < 512) return;
          const h = buf.subarray(0, 512);
          buf = buf.subarray(512);
          if (h.every((b) => b === 0)) continue; // end-of-archive padding
          const name = h.toString("utf8", 0, 100).replace(/\0.*$/s, "");
          const prefix = h.toString("utf8", 345, 500).replace(/\0.*$/s, "");
          const size = parseOctal(h, 124, 12);
          const mode = parseOctal(h, 100, 8);
          const type = String.fromCharCode(h[156] || 48);
          let path = pax?.path || longName || (prefix ? `${prefix}/${name}` : name);
          longName = null;
          pax = null;
          const padded = Math.ceil(size / 512) * 512;
          state = { kind: "body", type, path, size, padded, mode };
        }
        if (state.kind === "body") {
          const { type, size, padded } = state;
          const isFile = type === "0" || type === "\0" || type === "7";
          const meta = type === "x" || type === "L" || type === "g";
          // Skip big bodies without buffering them all.
          if (!meta && (!isFile || state.skip === undefined)) {
            if (isFile) {
              const rel = stripRoot(state.path);
              state.rel = rel;
              state.skip = !rel || !want(rel, size);
            } else state.skip = true;
          }
          if (!meta && state.skip) {
            const take = Math.min(buf.length, state.padded - (state.consumed || 0));
            state.consumed = (state.consumed || 0) + take;
            buf = buf.subarray(take);
            if (state.consumed < padded) return;
            if (isFile && state.rel) onEntry({ path: state.rel, mode: state.mode, size, data: null });
            state = { kind: "header" };
            continue;
          }
          if (buf.length < padded) return;
          const body = buf.subarray(0, size);
          buf = buf.subarray(padded);
          if (type === "L") longName = body.toString("utf8").replace(/\0.*$/s, "");
          else if (type === "x") pax = parsePax(body);
          else if (isFile) onEntry({ path: state.rel, mode: state.mode, size, data: Buffer.from(body) });
          state = { kind: "header" };
        }
      }
    }

    // GitHub tarballs wrap everything in "<owner>-<repo>-<sha>/".
    function stripRoot(p) {
      const i = p.indexOf("/");
      return i < 0 ? "" : p.slice(i + 1);
    }

    if (typeof stream.pipe === "function") stream.pipe(gunzip);
    else {
      (async () => {
        try {
          for await (const chunk of stream) {
            if (done) break;
            if (!gunzip.write(chunk)) await new Promise((r) => gunzip.once("drain", r));
          }
          gunzip.end();
        } catch (e) {
          finish(e);
        }
      })();
    }
  });
}

module.exports = { readTarGz };

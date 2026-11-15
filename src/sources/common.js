// Shared plumbing for problem sources: polite HTTP with timeouts and retries,
// and the small HTML helpers every statement parser needs.
const cheerio = require("cheerio");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with a timeout, a browser-like User-Agent and a couple of retries on
 * 429 / 5xx / network errors (with backoff that honours Retry-After).
 * Returns the Response; throws when every attempt failed.
 */
async function http(url, { method = "GET", headers = {}, body, timeoutMs = 20000, retries = 2, accept } = {}) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...(accept ? { Accept: accept } : {}), ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 15000) : 800 * 2 ** attempt);
        last = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        continue;
      }
      return res;
    } catch (e) {
      last = e;
      if (attempt < retries) await sleep(800 * 2 ** attempt);
    }
  }
  throw last || new Error(`Could not reach ${url}`);
}

async function getText(url, opts) {
  const res = await http(url, opts);
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} from ${new URL(url).host}`), { status: res.status });
  return res.text();
}

async function getJson(url, opts = {}) {
  const res = await http(url, { accept: "application/json", ...opts });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} from ${new URL(url).host}`), { status: res.status });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${new URL(url).host} did not answer with JSON (got ${text.slice(0, 60).replace(/\s+/g, " ")}…)`);
  }
}

const load = (html) => cheerio.load(html, { decodeEntities: true });

/**
 * The exact text of a sample block. Judges encode line breaks three ways:
 * real newlines, <br>, and one block element per line (Codeforces wraps every
 * line in <div class="test-example-line">). .text() alone drops the last two.
 */
function preText($, el) {
  const node = $(el).clone();
  node.find("br").replaceWith("\n");
  node.find("div, p, li").each((_, d) => {
    $(d).append("\n");
  });
  return tidySample(node.text());
}

/** Samples compare by lines: unify newlines, strip trailing spaces, keep one final newline. */
function tidySample(s) {
  const lines = String(s ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""));
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.length ? `${lines.join("\n")}\n` : "";
}

/** "2 seconds", "2.0s", "2 sec", "1000 ms" → "2 s" style, as the judge shows it. */
function normalizeTime(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  const ms = t.match(/([\d.]+)\s*(ms|millisecond)/i);
  if (ms) return `${+(Number(ms[1]) / 1000).toFixed(3)} s`;
  const sec = t.match(/([\d.]+)\s*(s\b|sec|second)/i) || t.match(/^([\d.]+)$/);
  return sec ? `${+Number(sec[1]).toFixed(3)} s` : t;
}

/** "256 megabytes", "1024 MiB", "512 MB", "262144 KB", "256M" → "256 MB". */
function normalizeMemory(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  const m = t.match(/([\d.]+)\s*(kib|kb|k\b|mib|mb|m\b|megabytes?|gib|gb|g\b|gigabytes?)/i);
  if (!m) return /^\d+$/.test(t) ? `${t} MB` : t;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mb = /^k/.test(u) ? n / 1024 : /^g/.test(u) ? n * 1024 : n;
  return `${+mb.toFixed(1)} MB`;
}

/** An empty statement result with every field present. */
const blank = () => ({ statement: "", inputSpec: "", outputSpec: "", note: "", timeLimit: "", memLimit: "", samples: [], extra: {} });

/** Wrap a section body with the shared section title used across sources. */
const section = (title, html) => (html && String(html).trim() ? `<div class="section-title">${title}</div>${html}` : "");

/**
 * Markdown → HTML that leaves TeX alone: $…$ / $$…$$ are lifted out before
 * the markdown pass (so "a_i" is never turned into italics) and put back
 * verbatim. Inline HTML in the source is kept, as the judges' own renderers do.
 */
function markdown(text) {
  const { marked } = require("marked");
  const keep = [];
  const lifted = String(text || "").replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, (m) => {
    keep.push(m);
    return `\u0000${keep.length - 1}\u0000`;
  });
  const html = marked.parse(lifted, { gfm: true, breaks: false });
  return html.replace(/\u0000(\d+)\u0000/g, (_m, i) => keep[Number(i)].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
}

/** True when the text already reads as HTML (block tags), not markdown. */
const looksHtml = (s) => /<(p|div|ul|ol|table|h[1-6]|pre|br)\b/i.test(String(s || ""));

module.exports = { markdown, looksHtml, UA, sleep, http, getText, getJson, load, preText, tidySample, normalizeTime, normalizeMemory, blank, section };

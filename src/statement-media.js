/**
 * Media handling for scraped problem statements.
 *
 * Statements come from Codeforces, AtCoder, CodeChef and friends with relative
 * URLs, `srcset`s that only make sense on the source page, and CDNs that
 * hotlink-block anything with a foreign Referer. This module rewrites them into
 * markup that renders on our page, and decides what the image proxy is allowed
 * to fetch.
 */

const PLATFORM_ORIGIN = {
  codeforces: "https://codeforces.com",
  codechef: "https://www.codechef.com",
  atcoder: "https://atcoder.jp",
  leetcode: "https://leetcode.com",
  spoj: "https://www.spoj.com",
  euler: "https://projecteuler.net",
  cses: "https://cses.fi",
  dmoj: "https://dmoj.ca",
  timus: "https://acm.timus.ru",
  kattis: "https://open.kattis.com",
  uva: "https://onlinejudge.org",
};

/* Domains the image proxy may fetch from. Matched by suffix, because problem
   statements reference a long tail of subdomains (m1/m2/m3.codeforces.com,
   img.atcoder.jp, abc123.contest.atcoder.jp) that an exact list could never
   keep up with. Only the judges' own domains belong here: a shared hosting
   suffix (amazonaws.com, cloudfront.net, githubusercontent.com) would let
   anyone put a file behind our origin. */
const IMG_PROXY_DOMAINS = [
  "codeforces.com",
  "codeforces.org",
  "codeforces.es",
  "atcoder.jp",
  "codechef.com",
  "leetcode.com",
  "leetcode.cn",
  "spoj.com",
  "projecteuler.net",
  "hackerrank.com",
  "hackerearth.com",
  "topcoder.com",
  "usaco.org",
  "acmicpc.net",
  "e-olymp.com",
  "cses.fi",
  "dmoj.ca",
  "timus.ru",
  "kattis.com",
  "onlinejudge.org",
  "web.archive.org",
  "archive.org",
];

/* Exact hosts on shared object storage / CDNs that the platforms above keep
   statement media on. */
const IMG_PROXY_HOSTS = [
  "s3-lc-upload.s3.amazonaws.com", // LeetCode
  "hr-challenge-images.s3.amazonaws.com", // HackerRank
  "hr-assets.s3.amazonaws.com",
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "i.imgur.com",
];

/* Path-style S3 (https://s3.amazonaws.com/<bucket>/…): only these buckets. */
const IMG_PROXY_S3_BUCKETS = ["codechef_shared", "hr-challenge-images", "hr-assets", "s3-lc-upload"];

/** True when `host` is an allowed host, or one of the allowed domains or a subdomain of one. */
function isProxyableHost(host) {
  const h = String(host || "").toLowerCase().replace(/\.$/, "");
  if (!h) return false;
  return IMG_PROXY_HOSTS.includes(h) || IMG_PROXY_DOMAINS.some((d) => h === d || h.endsWith("." + d));
}

/** True when the image proxy may fetch `url` (string or URL): https on an allowed host or S3 bucket. */
function isProxyableUrl(url) {
  let u;
  try {
    u = url instanceof URL ? url : new URL(String(url));
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  if (isProxyableHost(u.hostname)) return true;
  if (u.hostname.toLowerCase() === "s3.amazonaws.com") {
    let bucket = "";
    try {
      bucket = decodeURIComponent(u.pathname.split("/")[1] || "");
    } catch {
      return false;
    }
    return IMG_PROXY_S3_BUCKETS.includes(bucket);
  }
  return false;
}

/* What the proxy relays: raster images, video and audio. SVG — or anything
   else a browser could run script in — is never served from our origin. */
const PROXY_MEDIA_TYPES = new Set([
  "image/png", "image/jpeg", "image/pjpeg", "image/gif", "image/webp", "image/avif",
  "image/bmp", "image/x-icon", "image/vnd.microsoft.icon",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/wave", "audio/webm", "audio/aac",
]);

/** True for an upstream Content-Type the image proxy may pass through. */
function isProxyableMediaType(ctype) {
  return PROXY_MEDIA_TYPES.has(String(ctype || "").split(";")[0].trim().toLowerCase());
}

function absolutizeUrl(src, origin) {
  const s = (src || "").trim();
  if (!s || s.startsWith("data:")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^https?:/i.test(s)) return s;
  if (!origin) return s;
  if (s.startsWith("/")) return origin + s;
  return `${origin}/${s}`;
}

/** `/api/imgproxy?url=…` for an absolute https URL, or "" when not proxyable. */
function proxyUrlFor(abs) {
  if (!/^https:/i.test(abs)) return "";
  return `/api/imgproxy?url=${encodeURIComponent(abs)}`;
}

/**
 * Rewrite the media in a scraped statement so it actually renders for us.
 *
 * Images and videos are pointed at the source CDN with `referrerpolicy=
 * no-referrer` — the Referer header is exactly what hotlink checks key on, and
 * a direct CDN hit is far faster than routing bytes through our box. Every
 * element also carries `data-proxy`, the URL the client retries through when
 * the direct load fails; the client remembers which hosts need that and skips
 * the wasted attempt on later statements.
 */
function normalizeStatementHtml(html, problem) {
  if (!html) return html;
  const origin = PLATFORM_ORIGIN[problem && problem.platform] || "";

  let out = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = tag.match(/\ssrc\s*=\s*(["'])([^"']*)\1/i) || tag.match(/\ssrc\s*=\s*([^\s>"']+)/i);
    const raw = m ? (m[2] ?? m[1]) : "";
    const abs = absolutizeUrl(raw.replace(/&amp;/g, "&"), origin);
    if (!abs) return tag;
    // srcset goes: its candidates are relative to the source page, not to us.
    const t = tag
      .replace(/\s(src|srcset|referrerpolicy|loading|decoding|data-proxy|crossorigin)\s*=\s*(["'])[^"']*\2/gi, "")
      .replace(/\ssrc\s*=\s*[^\s>"']+/gi, "");
    const attrs = [
      `src="${abs.replace(/"/g, "&quot;")}"`,
      'referrerpolicy="no-referrer"',
      'loading="lazy"',
      'decoding="async"',
    ];
    const proxy = proxyUrlFor(abs);
    if (proxy) attrs.push(`data-proxy="${proxy}"`);
    return t.replace(/^<img\b/i, `<img ${attrs.join(" ")}`);
  });

  // <video> / <audio> / <source>: absolutize src and poster, and give each one
  // the same proxy fallback so blocked media is recoverable too.
  out = out.replace(/<(video|audio|source)\b[^>]*>/gi, (tag, tagName) => {
    let firstSrc = "";
    let changed = tag.replace(
      /(\s(?:src|poster)\s*=\s*)(["'])([^"']*)\2/gi,
      (_m, pre, q, src) => {
        const abs = absolutizeUrl(src.replace(/&amp;/g, "&"), origin);
        if (/\ssrc\s*=\s*$/i.test(pre) && !firstSrc) firstSrc = abs;
        return `${pre}${q}${abs.replace(/"/g, "&quot;")}${q}`;
      },
    );
    const proxy = proxyUrlFor(firstSrc);
    if (proxy && !/\sdata-proxy\s*=/i.test(changed)) {
      changed = changed.replace(new RegExp(`^<${tagName}\\b`, "i"), `<${tagName} data-proxy="${proxy}"`);
    }
    if (tagName.toLowerCase() !== "source" && !/\sreferrerpolicy\s*=/i.test(changed)) {
      changed = changed.replace(new RegExp(`^<${tagName}\\b`, "i"), `<${tagName} referrerpolicy="no-referrer"`);
    }
    return changed;
  });
  out = out.replace(/<(video|audio)\b(?![^>]*\scontrols)/gi, '<$1 controls preload="metadata"');

  out = out.replace(
    /(<a\b[^>]*?\shref\s*=\s*)(["'])(?!https?:|#|mailto:)([^"']*)\2/gi,
    (_m, pre, q, href) => `${pre}${q}${absolutizeUrl(href, origin)}${q}`,
  );
  return out;
}

/* How each platform writes formulas (see src/sources/math.js). Applied when a
   statement is served, so statements cached before this existed are fixed too. */
const PLATFORM_MATH = { atcoder: "var", codechef: "dollar", euler: "dollar", kattis: "dollar", cses: "paren", timus: "paren", dmoj: "tilde" };

/** CodeChef statements cached by the old scraper are raw markdown: render them. */
function codechefHtml(s) {
  if (!s) return s;
  const { looksHtml, markdown } = require("./sources/common");
  // The old scraper glued "<div class=section-title>…</div>" in front of markdown bodies.
  const m = String(s).match(/^(\s*<div class="section-title">[^<]*<\/div>)([\s\S]*)$/);
  if (m) return looksHtml(m[2]) ? s : m[1] + markdown(m[2]);
  return looksHtml(s) ? s : markdown(s);
}

/** Apply the rewrite to every rich-text field of a scraped statement. */
function normalizeStatement(data, problem) {
  if (!data) return data;
  const platform = problem && problem.platform;
  const { mathify } = require("./sources/math");
  const fix = (html) => {
    let h = html;
    if (platform === "codechef") h = codechefHtml(h);
    if (PLATFORM_MATH[platform]) h = mathify(h, PLATFORM_MATH[platform]);
    return normalizeStatementHtml(h, problem);
  };
  return {
    ...data,
    statement: fix(data.statement),
    inputSpec: fix(data.inputSpec),
    outputSpec: fix(data.outputSpec),
    note: fix(data.note),
  };
}

module.exports = {
  PLATFORM_ORIGIN,
  IMG_PROXY_DOMAINS,
  IMG_PROXY_HOSTS,
  isProxyableHost,
  isProxyableUrl,
  isProxyableMediaType,
  absolutizeUrl,
  proxyUrlFor,
  normalizeStatementHtml,
  normalizeStatement,
};

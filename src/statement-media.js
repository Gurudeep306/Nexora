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
};

/* Domains the image proxy may fetch from. Matched by suffix, because problem
   statements reference a long tail of subdomains (m1/m2/m3.codeforces.com,
   img.atcoder.jp, one-off S3 and CloudFront buckets) that an exact list could
   never keep up with. */
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
  "web.archive.org",
  "archive.org",
  // Object storage / CDNs the platforms above redirect their media to.
  "amazonaws.com",
  "cloudfront.net",
  "akamaized.net",
  "githubusercontent.com",
  "imgur.com",
  "cloudinary.com",
  "jsdelivr.net",
];

/** True when `host` is one of the allowed domains, or a subdomain of one. */
function isProxyableHost(host) {
  const h = String(host || "").toLowerCase();
  return IMG_PROXY_DOMAINS.some((d) => h === d || h.endsWith("." + d));
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

/** Apply the rewrite to every rich-text field of a scraped statement. */
function normalizeStatement(data, problem) {
  if (!data) return data;
  return {
    ...data,
    statement: normalizeStatementHtml(data.statement, problem),
    inputSpec: normalizeStatementHtml(data.inputSpec, problem),
    outputSpec: normalizeStatementHtml(data.outputSpec, problem),
    note: normalizeStatementHtml(data.note, problem),
  };
}

module.exports = {
  PLATFORM_ORIGIN,
  IMG_PROXY_DOMAINS,
  isProxyableHost,
  absolutizeUrl,
  proxyUrlFor,
  normalizeStatementHtml,
  normalizeStatement,
};

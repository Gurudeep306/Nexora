// Every judge writes formulas differently. The client renders one form only —
// Codeforces' $$$inline$$$ and $$$$$$display$$$$$$ — so each source's math is
// rewritten to it here: AtCoder <var>, CodeChef/Euler/Kattis $…$ and $$…$$,
// CSES/Timus \(…\) and \[…\], DMOJ ~…~ and its pre-rendered tex spans.
// Code blocks (<pre>, <code>) are never touched: a $ in a sample is data.

const decode = (s) =>
  String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
// Inside the $$$ markers the text is still HTML, so < > & stay escaped.
const enc = (s) => decode(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (tex) => (tex.trim() ? `$$$${enc(tex.trim())}$$$` : "");
const display = (tex) => (tex.trim() ? `$$$$$$${enc(tex.trim())}$$$$$$` : "");

/** Apply fn to the parts of html outside <pre>, <code>, <script> and <style>. */
function outsideCode(html, fn) {
  const re = /<(pre|code|script|style)\b[\s\S]*?<\/\1>/gi;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    out += fn(html.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + fn(html.slice(last));
}

const STYLES = {
  dollar3: [], // already the client's form
  var: ["var"],
  dollar: ["dollar"],
  paren: ["paren"],
  tilde: ["tilde", "dollar"],
};

function mathify(html, style) {
  if (!html) return html || "";
  const rules = STYLES[style] || [];
  if (!rules.length) return String(html);
  return outsideCode(String(html), (seg) => {
    let s = seg;
    // DMOJ ships each formula pre-rendered: <span class="inline-math"><img …><span class="tex-text">~x~</span></span>
    if (rules.includes("tilde")) {
      s = s
        .replace(/<span class="(inline|display)-math"[^>]*>[\s\S]*?<span class="tex-text"[^>]*>([\s\S]*?)<\/span>\s*<\/span>/g, (_m, kind, tex) => {
          const t = tex.replace(/^\s*(~|\$\$)/, "").replace(/(~|\$\$)\s*$/, "");
          return kind === "display" ? display(t) : inline(t);
        })
        .replace(/~([^~\n<>]{1,400}?)~/g, (_m, tex) => inline(tex));
    }
    if (rules.includes("var")) s = s.replace(/<var>([\s\S]*?)<\/var>/g, (_m, tex) => inline(tex.replace(/<[^>]+>/g, "")));
    if (rules.includes("paren") || rules.includes("dollar")) {
      s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex) => display(tex)).replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex) => inline(tex));
    }
    if (rules.includes("dollar")) {
      // $$…$$ first (display), then $…$: the opening $ is followed by a non-space
      // and the closing one preceded by a non-space, so "$5 and $10" stays text.
      s = s
        .replace(/(?<![\\$])\$\$(?!\$)([\s\S]+?)(?<!\\)\$\$(?!\$)/g, (_m, tex) => display(tex))
        .replace(/(?<![\\$\w])\$(?![\s$])([^$\n]{1,600}?)(?<![\s\\])\$(?![\w$])/g, (_m, tex) => inline(tex))
        .replace(/\\\$/g, "$");
    }
    return s;
  });
}

module.exports = { mathify, outsideCode, decode };

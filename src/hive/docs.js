// Document generation for Hive chat: Markdown → HTML, PDF, Word (.docx) and
// slides. No extra dependencies: a small Markdown parser feeds both an HTML
// renderer (PDF goes through the headless Chrome the server already ships for
// the judge, when available) and a minimal Office Open XML writer.
const zlib = require("zlib");

/* ── Markdown → blocks ───────────────────────────────────────────────── */
function parse(md) {
  const lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    let m;
    if ((m = l.match(/^```(\w[\w+-]*)?\s*$/))) {
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: m[1] || "", text: code.join("\n") });
    } else if ((m = l.match(/^(#{1,6})\s+(.*)$/))) {
      blocks.push({ type: "heading", level: m[1].length, text: m[2].replace(/\s+#+\s*$/, "") });
      i++;
    } else if (/^\s*(---|\*\*\*|___)\s*$/.test(l)) {
      blocks.push({ type: "hr" });
      i++;
    } else if (/^\s*>/.test(l)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ type: "quote", blocks: parse(q.join("\n")) });
    } else if (l.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      blocks.push({ type: "table", head, rows });
    } else if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]/.test(l);
      const items = [];
      while (i < lines.length && (/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const cur = lines[i++];
        const mm = cur.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (mm) {
          const task = mm[3].match(/^\[( |x|X)\]\s+(.*)$/);
          items.push({ text: task ? task[2] : mm[3], depth: Math.min(3, Math.floor(mm[1].length / 2)), checked: task ? task[1] !== " " : null });
        } else items[items.length - 1].text += ` ${cur.trim()}`;
      }
      blocks.push({ type: "list", ordered, items });
    } else {
      const p = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s+)/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))) p.push(lines[i++].trim());
      blocks.push({ type: "para", text: p.join(" ") });
    }
  }
  return blocks;
}

/** Inline Markdown → runs [{ text, b, i, code, link }]. */
function inline(text) {
  const runs = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m;
  const s = String(text);
  while ((m = re.exec(s))) {
    if (m.index > last) runs.push({ text: s.slice(last, m.index) });
    const t = m[0];
    if (m[1]) runs.push({ text: t.slice(1, -1), code: true });
    else if (m[2]) runs.push({ text: t.slice(2, -2), b: true });
    else if (m[3]) runs.push({ text: t.slice(1, -1), i: true });
    else {
      const lm = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      runs.push({ text: lm[1], link: lm[2] });
    }
    last = m.index + t.length;
  }
  if (last < s.length) runs.push({ text: s.slice(last) });
  return runs;
}

/* ── HTML ─────────────────────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeHref = (u) => (/^(https?:|mailto:|#)/i.test(u) ? u : "#");

function inlineHtml(text) {
  return inline(text)
    .map((r) => {
      const t = esc(r.text);
      if (r.code) return `<code>${t}</code>`;
      if (r.b) return `<strong>${t}</strong>`;
      if (r.i) return `<em>${t}</em>`;
      if (r.link) return `<a href="${esc(safeHref(r.link))}">${t}</a>`;
      return t;
    })
    .join("");
}

function blocksHtml(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `<h${b.level}>${inlineHtml(b.text)}</h${b.level}>`;
        case "para":
          return `<p>${inlineHtml(b.text)}</p>`;
        case "code":
          return `<pre><code${b.lang ? ` class="lang-${esc(b.lang)}"` : ""}>${esc(b.text)}</code></pre>`;
        case "hr":
          return "<hr>";
        case "quote":
          return `<blockquote>${blocksHtml(b.blocks)}</blockquote>`;
        case "table":
          return `<table><thead><tr>${b.head.map((h) => `<th>${inlineHtml(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          return `<${tag}>${b.items.map((it) => `<li style="margin-left:${it.depth * 1.2}em">${it.checked === null ? "" : it.checked ? "☑ " : "☐ "}${inlineHtml(it.text)}</li>`).join("")}</${tag}>`;
        }
        default:
          return "";
      }
    })
    .join("\n");
}

const CSS = `
:root { --ink:#1b1f2a; --muted:#5b6475; --line:#e3e6ee; --accent:#4f46e5; }
* { box-sizing: border-box; }
body { font: 15px/1.65 -apple-system, "Segoe UI", Inter, Roboto, sans-serif; color: var(--ink); margin: 0; }
main { max-width: 780px; margin: 0 auto; padding: 56px 48px; }
h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 8px; }
h2 { font-size: 21px; margin: 32px 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
h3 { font-size: 17px; margin: 24px 0 6px; }
p, li { color: var(--ink); }
a { color: var(--accent); }
code { font: 13px/1.5 "JetBrains Mono", ui-monospace, Menlo, monospace; background: #f3f4f8; padding: 1px 5px; border-radius: 4px; }
pre { background: #0f1320; color: #e6e8ef; padding: 14px 16px; border-radius: 10px; overflow: auto; }
pre code { background: none; padding: 0; color: inherit; }
table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }
th, td { border: 1px solid var(--line); padding: 7px 10px; text-align: left; vertical-align: top; }
th { background: #f6f7fb; }
blockquote { margin: 14px 0; padding: 4px 16px; border-left: 3px solid var(--accent); color: var(--muted); }
hr { border: 0; border-top: 1px solid var(--line); margin: 28px 0; }
.meta { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
@page { margin: 18mm 16mm; }
@media print { main { padding: 0; } pre { white-space: pre-wrap; } }
`;

function html(markdown, { title = "Document", subtitle = "" } = {}) {
  const blocks = parse(markdown);
  const hasTitle = blocks[0]?.type === "heading" && blocks[0].level === 1;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body><main>${hasTitle ? "" : `<h1>${esc(title)}</h1>`}${subtitle ? `<div class="meta">${esc(subtitle)}</div>` : ""}${blocksHtml(blocks)}</main></body></html>`;
}

/** Slides: each "## heading" (or --- separator) starts a slide. */
function slidesHtml(markdown, { title = "Slides" } = {}) {
  const parts = String(markdown)
    .split(/\n(?=##\s)|\n---\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const slides = parts.map((p) => `<section class="slide">${blocksHtml(parse(p.replace(/^##\s/, "# ")))}</section>`).join("");
  const css = `${CSS}
body { background: #0b0d14; }
.slide { width: 1280px; height: 720px; margin: 24px auto; padding: 72px 88px; background: linear-gradient(160deg, #ffffff, #f4f5fb); border-radius: 18px; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; justify-content: center; }
.slide h1 { font-size: 46px; margin-bottom: 18px; } .slide p, .slide li { font-size: 24px; line-height: 1.5; }
@page { size: 1280px 720px; margin: 0; } @media print { body { background: none; } .slide { margin: 0; border-radius: 0; } }`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${slides}</body></html>`;
}

/* ── PDF (headless Chrome when the server has it) ─────────────────────── */
async function pdf(htmlText, { landscape = false, width = null, height = null } = {}) {
  if (process.env.DISABLE_PUPPETEER === "1") throw new Error("PDF engine is turned off on this server");
  let browser;
  try {
    const puppeteer = require("puppeteer");
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setContent(htmlText, { waitUntil: "load", timeout: 30000 });
    const opts = width ? { width, height, printBackground: true } : { format: "A4", landscape, printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" } };
    return Buffer.from(await page.pdf(opts));
  } finally {
    await browser?.close().catch(() => {});
  }
}

/* ── DOCX (minimal Office Open XML) ───────────────────────────────────── */
const xesc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runsXml(text, base = {}) {
  return inline(text)
    .map((r) => {
      const pr = [];
      if (r.b || base.b) pr.push("<w:b/>");
      if (r.i || base.i) pr.push("<w:i/>");
      if (r.code || base.code) pr.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:val="clear" w:color="auto" w:fill="F1F2F6"/>');
      if (r.link) pr.push('<w:color w:val="4F46E5"/><w:u w:val="single"/>');
      if (base.color) pr.push(`<w:color w:val="${base.color}"/>`);
      return `<w:r>${pr.length ? `<w:rPr>${pr.join("")}</w:rPr>` : ""}<w:t xml:space="preserve">${xesc(r.text)}</w:t></w:r>`;
    })
    .join("");
}
const para = (inner, style, extra = "") => `<w:p>${style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>` : ""}${inner}</w:p>`;

function blocksDocx(blocks) {
  const out = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        out.push(para(runsXml(b.text), `Heading${Math.min(3, b.level)}`));
        break;
      case "para":
        out.push(para(runsXml(b.text)));
        break;
      case "code":
        for (const line of b.text.split("\n")) out.push(para(`<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${xesc(line || " ")}</w:t></w:r>`, "Code"));
        break;
      case "hr":
        out.push(para("", null, '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D7DAE3"/></w:pBdr>'));
        break;
      case "quote":
        for (const q of b.blocks) if (q.type === "para") out.push(para(runsXml(q.text, { i: true, color: "5B6475" }), "Quote"));
        break;
      case "list":
        b.items.forEach((it, idx) => {
          const mark = it.checked === null ? (b.ordered ? `${idx + 1}. ` : "• ") : it.checked ? "☑ " : "☐ ";
          out.push(para(`<w:r><w:t xml:space="preserve">${mark}</w:t></w:r>${runsXml(it.text)}`, null, `<w:ind w:left="${360 + it.depth * 360}" w:hanging="260"/>`));
        });
        break;
      case "table": {
        const cell = (t, head) => `<w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:color="D7DAE3"/><w:left w:val="single" w:sz="4" w:color="D7DAE3"/><w:bottom w:val="single" w:sz="4" w:color="D7DAE3"/><w:right w:val="single" w:sz="4" w:color="D7DAE3"/></w:tcBorders>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F6F7FB"/>' : ""}</w:tcPr>${para(runsXml(t, { b: head }))}</w:tc>`;
        out.push(`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tr>${b.head.map((h) => cell(h, true)).join("")}</w:tr>${b.rows.map((r) => `<w:tr>${r.map((c) => cell(c, false)).join("")}</w:tr>`).join("")}</w:tbl>`);
        out.push(para(""));
        break;
      }
      default:
        break;
    }
  }
  return out.join("");
}

// CRC-32 for the zip container.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build a zip (deflate) from { name: string|Buffer }. */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const comp = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

function docx(markdown, { title = "Document" } = {}) {
  const blocks = parse(markdown);
  const hasTitle = blocks[0]?.type === "heading" && blocks[0].level === 1;
  const body = (hasTitle ? "" : para(runsXml(title), "Title")) + blocksDocx(blocks);
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const style = (id, name, rpr, ppr = "") => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:qFormat/>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}<w:rPr>${rpr}</w:rPr></w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1B1F2A"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${style("Title", "Title", '<w:b/><w:sz w:val="48"/>', '<w:spacing w:after="240"/>')}${style("Heading1", "heading 1", '<w:b/><w:sz w:val="36"/>', '<w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>')}${style("Heading2", "heading 2", '<w:b/><w:sz w:val="28"/>', '<w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="1"/>')}${style("Heading3", "heading 3", '<w:b/><w:sz w:val="24"/>', '<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/>')}${style("Code", "Code", '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/>', '<w:shd w:val="clear" w:color="auto" w:fill="F1F2F6"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>')}${style("Quote", "Quote", '<w:i/><w:color w:val="5B6475"/>', '<w:ind w:left="360"/>')}</w:styles>`;
  return zip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xesc(title)}</dc:title><dc:creator>Nexora Hive</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "word/styles.xml": styles,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  });
}

const FORMATS = {
  md: { mime: "text/markdown", ext: "md" },
  html: { mime: "text/html", ext: "html" },
  pdf: { mime: "application/pdf", ext: "pdf" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
  slides: { mime: "application/pdf", ext: "pdf" },
};

/**
 * Render Markdown into a file. Returns { buffer, mime, name, note }.
 * PDF falls back to print-ready HTML when the server has no headless Chrome.
 */
async function render(markdown, { format = "pdf", title = "Document", subtitle = "" } = {}) {
  const base = String(title || "document").replace(/[^\w .-]+/g, "").trim().slice(0, 80) || "document";
  if (format === "md") return { buffer: Buffer.from(String(markdown), "utf8"), mime: FORMATS.md.mime, name: `${base}.md` };
  if (format === "docx") return { buffer: docx(markdown, { title }), mime: FORMATS.docx.mime, name: `${base}.docx` };
  const h = format === "slides" ? slidesHtml(markdown, { title }) : html(markdown, { title, subtitle });
  if (format === "html") return { buffer: Buffer.from(h, "utf8"), mime: FORMATS.html.mime, name: `${base}.html` };
  try {
    const buf = format === "slides" ? await pdf(h, { width: "1280px", height: "720px" }) : await pdf(h);
    return { buffer: buf, mime: "application/pdf", name: `${base}${format === "slides" ? "-slides" : ""}.pdf` };
  } catch (e) {
    return { buffer: Buffer.from(h, "utf8"), mime: "text/html", name: `${base}${format === "slides" ? "-slides" : ""}.html`, note: `PDF engine unavailable (${e.message.split("\n")[0].slice(0, 120)}) — saved as print-ready HTML; open it and choose Print → Save as PDF.` };
  }
}

module.exports = { parse, inline, html, slidesHtml, docx, zip, render, FORMATS };

// Read a problem statement out of a PDF (UVa publishes most of its
// statements only as PDFs): the text by section, the sample tests line by
// line, and whether the PDF has pictures the text can't carry.
//
// PDF text has no paragraphs or lines, only pieces placed on the page. Pieces
// at the same height make a line; a bigger gap than usual between lines
// starts a new paragraph. Section headings ("Input", "Sample Output", …) are
// lines of their own.
const { blank } = require("./common");

const HEADINGS = [
  [/^sample\s+input(\s*\d+)?\s*:?$/i, "sampleIn"],
  [/^sample\s+output(\s*\d+)?\s*:?$/i, "sampleOut"],
  [/^input(\s+specification|\s+format)?\s*:?$/i, "input"],
  [/^output(\s+specification|\s+format)?\s*:?$/i, "output"],
  [/^(note|notes|hint|hints|explanation)\s*:?$/i, "note"],
];

// Running headers/footers the judge prints on every page ("Universidad de
// Valladolid OJ: 100 – The 3n + 1 problem 2/2"), and bare page numbers.
const FOOTER = /^(Universidad de Valladolid OJ:.*|\d+\s*\/\s*\d+)$/i;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let unpdf = null;
const lib = () => (unpdf ||= import("unpdf"));

/** Lines of text on every page, top to bottom, with their vertical gap to the line above. */
async function pdfLines(buffer) {
  const { getDocumentProxy } = await lib();
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const lines = [];
  let images = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let cur = null;
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      const y = it.transform[5];
      const h = Math.abs(it.transform[3]) || it.height || 10;
      if (!cur || Math.abs(cur.y - y) > 2) {
        cur = { y, h, page: i, text: "" };
        lines.push(cur);
      }
      cur.text += it.str;
      if (it.hasEOL) cur = null;
    }
    // Pictures: an image painted on the page (figures in the statement).
    try {
      const { OPS } = await lib().then((m) => m.getResolvedPDFJS());
      const ops = await page.getOperatorList();
      ops.fnArray.forEach((f, k) => {
        if (f !== OPS.paintImageXObject && f !== OPS.paintInlineImageXObject && f !== OPS.paintImageMaskXObject) return;
        const [, w, h] = ops.argsArray[k] || [];
        // The judge's wide banner across the top of page 1 is not a figure.
        if (i === 1 && w && h && w / h > 3.5) return;
        if (w && h && w * h < 40 * 40) return; // bullets, tiny marks
        images++;
      });
    } catch {
      /* no operator list: assume none */
    }
  }
  const out = [];
  let prev = null;
  for (const l of lines) {
    const text = l.text.replace(/\s+$/, "");
    if (!text.trim() || FOOTER.test(text.trim())) continue;
    const gap = prev && prev.page === l.page ? prev.y - l.y : 0;
    out.push({ text, h: l.h, gap });
    prev = l;
  }
  return { lines: out, images };
}

const heading = (t) => {
  const s = t.trim();
  for (const [re, kind] of HEADINGS) if (re.test(s)) return kind;
  return null;
};

/** Prose lines into paragraphs: a gap clearly bigger than the line height starts a new one. */
function paragraphs(lines) {
  const paras = [];
  let cur = [];
  for (const l of lines) {
    if (cur.length && l.gap > l.h * 1.9) {
      paras.push(cur.join(" "));
      cur = [];
    }
    cur.push(l.text.trim());
  }
  if (cur.length) paras.push(cur.join(" "));
  return paras
    .map((p) => p.replace(/\s+/g, " ").replace(/- (\w)/g, (m, c) => (/[a-z]/.test(c) ? `-${c}` : m)).trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");
}

/**
 * The statement in a PDF buffer, in the importers' shape:
 * { statement, inputSpec, outputSpec, note, samples, extra }.
 */
async function parsePdfStatement(buffer, { pdfUrl } = {}) {
  const { lines, images } = await pdfLines(buffer);
  const out = blank();
  if (!lines.length) return null;
  // The first line is "<number> <title>"; the page shows the title already.
  const body = lines.slice(1);
  const parts = { intro: [], input: [], output: [], note: [] };
  const samples = [];
  let section = "intro";
  let pendingIn = null;
  let buf = null;
  const flushSample = () => {
    if (!buf) return;
    const text = buf.lines.join("\n").replace(/\n+$/, "");
    if (buf.kind === "sampleIn") pendingIn = text;
    else if (pendingIn != null) {
      samples.push({ input: `${pendingIn}\n`, output: `${text}\n` });
      pendingIn = null;
    }
    buf = null;
  };
  for (const l of body) {
    const h = heading(l.text);
    if (h) {
      flushSample();
      if (h === "sampleIn" || h === "sampleOut") buf = { kind: h, lines: [] };
      else section = h;
      continue;
    }
    if (buf) buf.lines.push(l.text.replace(/\s+$/, ""));
    else parts[section].push(l);
  }
  flushSample();
  out.statement = paragraphs(parts.intro);
  out.inputSpec = paragraphs(parts.input);
  out.outputSpec = paragraphs(parts.output);
  out.note = paragraphs(parts.note);
  out.samples = samples;
  out.extra = { ...(pdfUrl ? { pdf: pdfUrl } : {}), fromPdf: true, ...(images ? { figures: true } : {}) };
  // The page shows the original PDF under the text (figures live there).
  return out;
}

module.exports = { parsePdfStatement, pdfLines, heading };

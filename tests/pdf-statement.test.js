// Statements read out of PDFs (src/sources/pdf-statement.js, used for UVa):
// sections, samples line by line, running footers dropped. The PDF is built
// here, so no third-party statement is stored in the repository.
const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePdfStatement, heading } = require("../src/sources/pdf-statement");

/** A one-page PDF with these lines of text; each line [text, y, fontSize]. */
function makePdf(lines) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = lines.map(([t, y, size = 11]) => `BT /F1 ${size} Tf 72 ${y} Td (${esc(t)}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

test("sections, paragraphs and samples come out of a PDF statement", async () => {
  const buf = makePdf([
    ["10001 Odd Sum", 740, 16],
    ["Given a range [a, b], find the sum of the odd", 700],
    ["integers in it.", 686],
    ["A second paragraph starts after a gap.", 650],
    ["Input", 610, 13],
    ["The first line has T, the number of test cases.", 590],
    ["Output", 550, 13],
    ["For each case print one line.", 530],
    ["Sample Input", 490, 13],
    ["2", 470],
    ["1 5", 456],
    ["3 5", 442],
    ["Sample Output", 410, 13],
    ["Case 1: 9", 390],
    ["Case 2: 8", 376],
    ["Universidad de Valladolid OJ: 10001 - Odd Sum 1/1", 40, 8],
  ]);
  const out = await parsePdfStatement(buf, { pdfUrl: "https://onlinejudge.org/external/100/10001.pdf" });
  assert.equal(out.statement, "<p>Given a range [a, b], find the sum of the odd integers in it.</p>\n<p>A second paragraph starts after a gap.</p>");
  assert.equal(out.inputSpec, "<p>The first line has T, the number of test cases.</p>");
  assert.equal(out.outputSpec, "<p>For each case print one line.</p>");
  assert.deepEqual(out.samples, [{ input: "2\n1 5\n3 5\n", output: "Case 1: 9\nCase 2: 8\n" }], "the footer is not part of the sample");
  assert.deepEqual(out.extra, { pdf: "https://onlinejudge.org/external/100/10001.pdf", fromPdf: true }, "no pictures in this PDF");
  assert.ok(!out.statement.includes("10001"), "the number-and-title line is left to the page");
});

test("several numbered samples pair up in order; text is escaped", async () => {
  const buf = makePdf([
    ["7 Pairs", 740, 16],
    ["Print a < b.", 700],
    ["Sample Input 1", 660, 13],
    ["1", 640],
    ["Sample Output 1", 620, 13],
    ["yes", 600],
    ["Sample Input 2", 580, 13],
    ["2", 560],
    ["Sample Output 2", 540, 13],
    ["no", 520],
  ]);
  const out = await parsePdfStatement(buf);
  assert.equal(out.statement, "<p>Print a &lt; b.</p>");
  assert.deepEqual(out.samples, [
    { input: "1\n", output: "yes\n" },
    { input: "2\n", output: "no\n" },
  ]);
});

test("headings are recognised in their usual spellings", () => {
  assert.equal(heading("Sample Input"), "sampleIn");
  assert.equal(heading("Sample input 2:"), "sampleIn");
  assert.equal(heading("Sample Output"), "sampleOut");
  assert.equal(heading("Input Specification"), "input");
  assert.equal(heading("Output"), "output");
  assert.equal(heading("Notes"), "note");
  assert.equal(heading("Input will be given"), null, "a sentence that starts with Input is not a heading");
});

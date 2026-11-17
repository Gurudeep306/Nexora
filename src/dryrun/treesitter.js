/**
 * Parsers for the dry run's instrumenters (C++, C, Java, JavaScript…),
 * loaded once from the wasm grammars in `tree-sitter-wasms`. Node indexes
 * are JavaScript string indexes, so edits splice straight into the source.
 */
const { Parser, Language } = require('web-tree-sitter');

let ready = null;
const langs = new Map();

async function parserFor(name) {
  if (!ready) ready = Parser.init();
  await ready;
  if (!langs.has(name)) langs.set(name, Language.load(require.resolve(`tree-sitter-wasms/out/tree-sitter-${name}.wasm`)));
  const p = new Parser();
  p.setLanguage(await langs.get(name));
  return p;
}

/**
 * Insert text at positions in `src`. Inserts at the same position keep the
 * order they were added in, unless one has a lower `o` (order key, default 0):
 * that one comes first (an inner closing bracket before an outer one).
 */
function applyEdits(src, edits) {
  const sorted = edits.map((e, i) => ({ ...e, i })).sort((a, b) => b.at - a.at || (b.o || 0) - (a.o || 0) || b.i - a.i);
  let out = src;
  for (const e of sorted) out = out.slice(0, e.at) + e.text + out.slice(e.at);
  return out;
}

module.exports = { parserFor, applyEdits };

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

/** Apply edits ({ at, text }) to `src`; edits at the same place keep their order. */
function applyEdits(src, edits) {
  const sorted = edits.map((e, i) => ({ ...e, i })).sort((a, b) => b.at - a.at || b.i - a.i);
  let out = src;
  for (const e of sorted) out = out.slice(0, e.at) + e.text + out.slice(e.at);
  return out;
}

module.exports = { parserFor, applyEdits };

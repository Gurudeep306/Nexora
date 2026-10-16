/**
 * Markdown + YAML parsing for scripts/build-gate-notes.js.
 *
 * The build script is CommonJS at the repo root; the parser packages are
 * ESM-only client dev dependencies. This module lives inside client/ so Node
 * resolves them from client/node_modules, and the build script import()s it.
 *
 * parseMarkdown → an mdast tree (CommonMark + GFM tables/strikethrough/task
 * lists + $maths$ + :::directives), with source positions.
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkDirective from 'remark-directive'
import YAML from 'yaml'

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkDirective)

export function parseMarkdown(src) {
  return processor.runSync(processor.parse(src))
}

/** { value, errors: [{ line, message }] } — duplicate keys and syntax errors are reported, never thrown. */
export function parseYaml(src) {
  const doc = YAML.parseDocument(src, { uniqueKeys: true, prettyErrors: false })
  const lc = new YAML.LineCounter()
  YAML.parseDocument(src, { lineCounter: lc })
  const errors = doc.errors.map((e) => ({ line: e.linePos?.[0]?.line ?? lc.linePos(e.pos?.[0] ?? 0).line, message: e.message.split('\n')[0] }))
  return { value: errors.length ? null : doc.toJS(), errors }
}

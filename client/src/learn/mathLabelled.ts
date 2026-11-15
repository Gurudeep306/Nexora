import katex from 'katex'

/**
 * Maths that must count as visible text (a table header): KaTeX's visible HTML
 * with the source as its name. The usual output hides the visible part from
 * assistive tech and keeps a visually hidden MathML copy, which leaves a
 * header cell with no visible text.
 */
export function mathLabelled(src: string): string {
  const name = src.replace(/\\(text|mathrm|mathit|mathbf)\{([^}]*)\}/g, '$2').replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim()
  let html: string
  try {
    html = katex.renderToString(src, { displayMode: false, throwOnError: false, strict: false, output: 'html' })
  } catch {
    html = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  const label = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return `<span role="img" aria-label="${label}">${html}</span>`
}

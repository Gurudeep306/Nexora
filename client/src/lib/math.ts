import katex from 'katex'
import 'katex/dist/katex.min.css'

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Codeforces (and mirrors) ship math as $$$…$$$ (inline) and $$$$$$…$$$$$$
 * (display). Swap them for placeholders here; renderMathIn hydrates them with
 * KaTeX after mount so the raw TeX never flashes in the statement.
 */
export function prepareMathHtml(html: string): string {
  if (!html || !html.includes('$$$')) return html
  return html
    .replace(/\$\$\$\$\$\$([\s\S]+?)\$\$\$\$\$\$/g, (_m, tex: string) =>
      `<div class="nx-math nx-math-block" data-tex="${escapeAttr(tex.trim())}"></div>`)
    .replace(/\$\$\$([\s\S]+?)\$\$\$/g, (_m, tex: string) =>
      `<span class="nx-math nx-math-inline" data-tex="${escapeAttr(tex.trim())}"></span>`)
}

export function renderMathIn(root: HTMLElement | null) {
  if (!root) return
  root.querySelectorAll<HTMLElement>('.nx-math').forEach((el) => {
    if (el.dataset.rendered === '1') return
    const tex = el.getAttribute('data-tex') || ''
    try {
      katex.render(tex, el, {
        throwOnError: false,
        displayMode: el.classList.contains('nx-math-block'),
      })
    } catch {
      el.textContent = tex
    }
    el.dataset.rendered = '1'
  })
}

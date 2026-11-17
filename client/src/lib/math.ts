import katex from 'katex'
import 'katex/dist/katex.min.css'

export { prepareMathHtml } from './mathHtml'

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

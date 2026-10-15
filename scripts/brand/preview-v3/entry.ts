// Browser entry for docs/brand/concepts-v3/preview.html (bundled by build-preview-v3.mjs).
import { mountNgMark, type NgConcept } from '../../../client/src/components/brand/concepts/engine'

function mountAll() {
  document.querySelectorAll<HTMLElement>('[data-ng]').forEach((el) => {
    const size = Number(el.dataset.size)
    const animate = el.dataset.animate === 'false' ? false : el.dataset.animate === 'true' ? true : undefined
    el.style.width = el.style.height = `${size}px`
    mountNgMark(el, el.dataset.ng as NgConcept, { size, animate })
  })
}

function setTheme(t: string) {
  document.documentElement.dataset.theme = t
  document.querySelectorAll<HTMLButtonElement>('[data-set-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setTheme === t)))
}

document.addEventListener('DOMContentLoaded', () => {
  mountAll()
  document.querySelectorAll<HTMLButtonElement>('[data-set-theme]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.setTheme!)))
  document.getElementById('replay-all')?.addEventListener('click', () => {
    document.querySelectorAll<HTMLElement>('.stage [data-ng], .bar [data-ng]').forEach((el) => el.click())
  })
})

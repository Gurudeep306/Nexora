/*
  The text side of statement maths, without KaTeX (so tests can run it):
  $$$…$$$ / $$$$$$…$$$$$$ become placeholders that renderMathIn (lib/math.ts)
  fills after mount.
*/
export const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** The TeX inside $$$…$$$ is still HTML text ("0 &lt; t"): back to plain TeX ("0 < t"). */
export const unescapeHtml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

/**
 * Codeforces (and mirrors) ship math as $$$…$$$ (inline) and $$$$$$…$$$$$$
 * (display). Swap them for placeholders here; renderMathIn hydrates them with
 * KaTeX after mount so the raw TeX never flashes in the statement.
 */
export function prepareMathHtml(html: string): string {
  if (!html || !html.includes('$$$')) return html
  return html
    .replace(/\$\$\$\$\$\$([\s\S]+?)\$\$\$\$\$\$/g, (_m, tex: string) =>
      `<div class="nx-math nx-math-block" data-tex="${escapeAttr(unescapeHtml(tex).trim())}"></div>`)
    .replace(/\$\$\$([\s\S]+?)\$\$\$/g, (_m, tex: string) =>
      `<span class="nx-math nx-math-inline" data-tex="${escapeAttr(unescapeHtml(tex).trim())}"></span>`)
}


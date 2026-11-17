/** A Markdown/maths snippet as one plain line, for lists. */
export function stripMarkdown(s: string): string {
  return String(s || '')
    .replace(/\$\$[\s\S]*?\$\$/g, '…')
    .replace(/\$[^$\n]*\$/g, (m) => m.slice(1, -1).replace(/\\[a-z]+/gi, '').replace(/[{}^_]/g, ''))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

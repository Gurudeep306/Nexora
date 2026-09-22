/**
 * Minimal HTML sanitizer for server-seeded rich text (tutorial content, scraped
 * problem statements). Strips scriptable elements and event-handler attributes.
 * Content originates from our own backend, this is defense-in-depth only.
 *
 * Video embeds from YouTube / Vimeo are kept (sandboxed); every other iframe goes.
 */
const EMBED_OK = /^https:\/\/(www\.youtube\.com\/embed\/|www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)[\w\-/?=&%.]+$/i

export function sanitizeHtml(raw: string): string {
  const embeds: string[] = []
  const withTokens = raw.replace(/<\s*iframe\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>\s*<\s*\/\s*iframe\s*>/gi, (m, _q, src: string) => {
    const url = src.replace(/&amp;/g, '&').replace(/^\/\//, 'https://')
    if (!EMBED_OK.test(url)) return m
    embeds.push(
      `<div class="nx-embed"><iframe src="${url.replace(/"/g, '&quot;')}" loading="lazy" referrerpolicy="no-referrer" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe></div>`,
    )
    return `\u0000EMBED${embeds.length - 1}\u0000`
  })
  return withTokens
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*\/?\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/\u0000EMBED(\d+)\u0000/g, (_m, i: string) => embeds[Number(i)] ?? '')
}

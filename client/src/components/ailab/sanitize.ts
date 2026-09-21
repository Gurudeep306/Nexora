/**
 * Minimal HTML sanitizer for server-seeded rich text (tutorial content, scraped
 * problem statements). Strips scriptable elements and event-handler attributes.
 * Content originates from our own backend, this is defense-in-depth only.
 */
export function sanitizeHtml(raw: string): string {
  return raw
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*\/?\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
}

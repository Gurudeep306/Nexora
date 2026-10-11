import DOMPurify from 'dompurify'

/**
 * HTML sanitizer for every piece of rich text we inject with
 * dangerouslySetInnerHTML: scraped problem statements, user-authored Workshop
 * statements, translations and tutorial content. Backed by DOMPurify, which
 * parses with the browser's own HTML parser, so the usual regex bypasses
 * (unquoted/slash-separated handlers, entity-encoded `javascript:` URLs,
 * nested tags) have nothing to slip through.
 *
 * Normal statement markup (tables, code, images, video/audio, inline SVG and
 * MathML) is kept. Video embeds from YouTube / Vimeo are kept, sandboxed; every
 * other iframe goes. Links that open a new tab get rel="noopener noreferrer".
 */

const EMBED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'player.vimeo.com'])
const EMBED_PATH = /^\/(embed|video)\//

/** The https URL of an allowed video embed, or null. */
function embedUrl(src: string | null): string | null {
  if (!src) return null
  let u: URL
  try {
    u = new URL(src.trim(), 'https://invalid.invalid')
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || !EMBED_HOSTS.has(u.hostname.toLowerCase())) return null
  if (!EMBED_PATH.test(u.pathname)) return null
  return u.toString()
}

let purifier: ReturnType<typeof DOMPurify> | null = null

function getPurifier() {
  if (purifier) return purifier
  const p = DOMPurify(window)

  p.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element
    if (el.nodeName === 'IFRAME') {
      const url = embedUrl(el.getAttribute('src'))
      if (!url) {
        el.parentNode?.removeChild(el)
        return
      }
      el.setAttribute('src', url)
      el.setAttribute('loading', 'lazy')
      el.setAttribute('referrerpolicy', 'no-referrer')
      el.setAttribute('allow', 'encrypted-media; picture-in-picture; fullscreen')
      el.setAttribute('allowfullscreen', '')
      el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation')
      return
    }
    if (el.hasAttribute('target')) {
      if (el.getAttribute('target') === '_blank') el.setAttribute('rel', 'noopener noreferrer')
      else el.removeAttribute('target')
    }
  })

  purifier = p
  return p
}

export function sanitizeHtml(raw: string): string {
  if (!raw) return ''
  const body = getPurifier().sanitize(raw, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy', 'decoding'],
    // No page-wide CSS or fake login forms from untrusted statements.
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['srcdoc', 'formaction'],
    RETURN_DOM: true,
  }) as HTMLElement
  // Wrap each surviving embed in the responsive container the CSS expects.
  body.querySelectorAll('iframe').forEach((f) => {
    const parent = f.parentElement
    if (parent && parent.classList.contains('nx-embed')) return
    const wrap = f.ownerDocument.createElement('div')
    wrap.className = 'nx-embed'
    f.replaceWith(wrap)
    wrap.appendChild(f)
  })
  return body.innerHTML
}

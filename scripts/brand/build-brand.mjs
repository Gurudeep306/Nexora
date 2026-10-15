#!/usr/bin/env node
/**
 * NexoraGuru brand builder — writes every logo SVG from one set of geometry.
 *
 *   node scripts/brand/build-brand.mjs      → SVGs (this file, no deps)
 *   node scripts/brand/render-brand.mjs     → PNG/ICO exports (puppeteer, root devDep)
 *
 * The mark ("Diya Shirorekha"): the initials N and G hang from one continuous
 * headline bar, the way Devanagari letters hang from their shirorekha, and a
 * diya flame — the guru's light of knowledge — sits on that line between them.
 * Gold-foil letters are extruded toward the bottom right (light from the top
 * left), bevelled with masked highlight/shade bands, and cast a soft contact
 * shadow onto a deep-indigo tile carrying a faint mandala.
 *
 * All artwork lives on a 32-unit grid. The flat variant (≤32 px) is hinted to
 * even grid units so 16 px and 32 px renders land on whole pixels; the master
 * keeps the same proportions with slightly heavier strokes.
 *
 * Every effect is resolution-independent (stacked offsets, masks, Gaussian
 * blur — no lighting filters), so the master stays crisp from 48 px to 1024 px.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const OUT = join(ROOT, 'client', 'public', 'brand')
const CONCEPTS = join(ROOT, 'docs', 'brand', 'concepts')
const WM = JSON.parse(readFileSync(join(HERE, 'wordmark-paths.json'), 'utf8'))

export const COLORS = {
  indigo: '#15123f',
  indigoDeep: '#08071c',
  ivory: '#f6f1e4',
  gold: '#f2c14e',
  goldDeep: '#a8661a',
  saffron: '#ff9933',
}

const r = (n) => +n.toFixed(3)

/* ───────────────────────── shared geometry ───────────────────────── */

/** Diya flame: a teardrop with a round belly; `lean` tips the point. */
function flamePath(cx, tip, base, lean = 0, belly = 0.3) {
  const h = base - tip
  const hw = belly * h // belly radius; belly centre sits at base - belly radius
  const by = base - hw
  const tx = cx + lean
  return [
    `M${r(tx)} ${r(tip)}`,
    `C${r(tx + 0.2 * hw)} ${r(tip + 0.28 * h)} ${r(cx + hw)} ${r(tip + 0.42 * h)} ${r(cx + hw)} ${r(by)}`,
    `A${r(hw)} ${r(hw)} 0 0 1 ${r(cx - hw)} ${r(by)}`,
    `C${r(cx - hw)} ${r(tip + 0.44 * h)} ${r(tx - 0.25 * hw)} ${r(tip + 0.3 * h)} ${r(tx)} ${r(tip)}Z`,
  ].join('')
}

/**
 * The NG monogram on its shirorekha, as filled outlines.
 * `w` = stem weight, `top`/`base` = headline top / baseline.
 */
function ngShapes({ w = 2.4, top = 10, base = 26, bar = 2.25 }) {
  const hb = top + bar // headline bottom
  // N: 6..14
  const nL = 6, nR = 14
  const lStem = `M${nL} ${top}H${r(nL + w)}V${base}H${nL}Z`
  const rStem = `M${r(nR - w)} ${top}H${nR}V${base}H${r(nR - w)}Z`
  // diagonal band: parallel edges from the top-left to the bottom-right stem
  const dW = w * 1.12 // horizontal width of the band (reads as ≈ w on the slant)
  const yT = hb - 0.6, yB = base
  const diagonal = `M${nL} ${r(yT)}H${r(nL + dW)}L${nR} ${yB}H${r(nR - dW)}Z`
  // G: 17.6..26, squared top (the headline), round bowl, spur on the right
  const gL = 17.6, gR = 26, ro = 3.8, ri = Math.max(0.6, ro - w)
  const spurTop = 16.8, spurIn = 21.8, spurBot = spurTop + w * 0.92
  const G =
    `M${gL} ${top}V${r(base - ro)}Q${gL} ${base} ${r(gL + ro)} ${base}H${r(gR - ro)}Q${gR} ${base} ${gR} ${r(base - ro)}` +
    `V${spurTop}H${spurIn}V${r(spurBot)}H${r(gR - w)}V${r(base - w - ri)}` +
    `Q${r(gR - w)} ${r(base - w)} ${r(gR - w - ri)} ${r(base - w)}H${r(gL + w + ri)}` +
    `Q${r(gL + w)} ${r(base - w)} ${r(gL + w)} ${r(base - w - ri)}V${top}Z`
  const headline = `M4 ${top}H28V${r(hb)}H4Z`
  return [headline, lStem, diagonal, rStem, G]
}

/** Hinted flat geometry: even units → whole pixels at 16 px and 32 px. */
function ngShapesFlat() {
  return [
    'M4 10H28V12H4Z', // shirorekha
    'M6 10H8V26H6Z', // N left stem
    'M12 10H14V26H12Z', // N right stem
    'M6 11H8.6L14 23.4V26H11.4L6 13.6Z', // N diagonal
    'M18 10V22.6Q18 26 21.4 26H22.6Q26 26 26 22.6V17H22V19H24V22.6Q24 24 22.6 24H21.4Q20 24 20 22.6V10Z', // G
  ]
}

const FLAME = { cx: 15.8, tip: 2.7, base: 10.15, lean: 0.45 }

/* ───────────────────────── material system ───────────────────────── */

/**
 * Render a glyph as a 3D gold object.
 * glyph: { defs: string (a <g id="{p}glyph"> with unpainted children), kind: 'fill'|'stroke' }
 */
function gold3d(p, glyphDefs, kind, opt = {}) {
  const {
    depth = 0.62, // extrusion depth in grid units
    dir = [0.55, 0.85], // extrusion direction (down-right, away from a top-left light)
    steps = 16,
    bbox = [4, 3, 28, 27],
    shadow = true,
    warmAt = null, // [x, y] of a light (the diya) that warms the nearby face
  } = opt
  const paint = (c) => (kind === 'fill' ? `fill="${c}"` : `stroke="${c}"`)
  const [x1, y1, x2, y2] = bbox
  const len = Math.hypot(...dir)
  const [ux, uy] = [dir[0] / len, dir[1] / len]
  const ext = []
  for (let i = steps; i >= 1; i--) {
    const t = (i / steps) * depth
    ext.push(`<use href="#${p}glyph" transform="translate(${r(ux * t)} ${r(uy * t)})"/>`)
  }
  const hl = 0.17, sh = 0.26 // bevel band widths
  const defs = `
    ${glyphDefs}
    <linearGradient id="${p}foil" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="#fff5d1"/>
      <stop offset=".16" stop-color="#f9da82"/>
      <stop offset=".36" stop-color="#e4a83c"/>
      <stop offset=".52" stop-color="#fbe3a0"/>
      <stop offset=".7" stop-color="#d4952e"/>
      <stop offset="1" stop-color="#9a5c16"/>
    </linearGradient>
    <linearGradient id="${p}ext" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="#8a5216"/>
      <stop offset=".55" stop-color="#5e3509"/>
      <stop offset="1" stop-color="#341b04"/>
    </linearGradient>
    <mask id="${p}mface" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
      <use href="#${p}glyph" ${paint('#fff')}/>
    </mask>
    ${warmAt ? `<radialGradient id="${p}lamp" gradientUnits="userSpaceOnUse" cx="${warmAt[0]}" cy="${warmAt[1]}" r="6">
      <stop offset="0" stop-color="#fff4c2" stop-opacity=".85"/>
      <stop offset=".4" stop-color="#ffd37a" stop-opacity=".3"/>
      <stop offset="1" stop-color="#ffd37a" stop-opacity="0"/>
    </radialGradient>` : ''}
    <mask id="${p}mhl" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
      <g filter="url(#${p}soft)"><use href="#${p}glyph" ${paint('#fff')}/>
      <use href="#${p}glyph" ${paint('#000')} transform="translate(${hl} ${r(hl * 1.3)})"/></g>
    </mask>
    <mask id="${p}msh" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
      <g filter="url(#${p}soft)"><use href="#${p}glyph" ${paint('#fff')}/>
      <use href="#${p}glyph" ${paint('#000')} transform="translate(${-sh} ${r(-sh * 1.3)})"/></g>
    </mask>
    <filter id="${p}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".07"/></filter>
    <filter id="${p}cast" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".62"/></filter>
    <filter id="${p}tight" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".22"/></filter>`
  const body = `
    ${shadow ? `<g opacity=".75" filter="url(#${p}cast)" ${paint('#020109')} transform="translate(${r(ux * depth + 0.35)} ${r(uy * depth + 0.75)})"><use href="#${p}glyph"/></g>
    <g opacity=".4" filter="url(#${p}tight)" ${paint('#020109')} transform="translate(${r(ux * depth * 1.05)} ${r(uy * depth * 1.05 + 0.12)})"><use href="#${p}glyph"/></g>` : ''}
    <g ${paint(`url(#${p}ext)`)}>${ext.join('')}</g>
    <use href="#${p}glyph" ${paint(`url(#${p}foil)`)}/>
    <g mask="url(#${p}mhl)"><rect x="0" y="0" width="32" height="32" fill="#fffbe9" opacity=".75"/></g>
    <g mask="url(#${p}msh)"><rect x="0" y="0" width="32" height="32" fill="#5a2f05" opacity=".5"/></g>
    ${warmAt ? `<g mask="url(#${p}mface)"><rect x="0" y="0" width="32" height="32" fill="url(#${p}lamp)"/></g>` : ''}`
  return { defs, body }
}

/** Four-point specular glint. */
function glint(x, y, s, p) {
  return `<g transform="translate(${x} ${y})" opacity=".95">
    <circle r="${r(s * 0.55)}" fill="#fff" opacity=".55" filter="url(#${p}glintblur)"/>
    <path d="M0 ${-s}Q${r(s * 0.09)} ${r(-s * 0.09)} ${s} 0Q${r(s * 0.09)} ${r(s * 0.09)} 0 ${s}Q${r(-s * 0.09)} ${r(s * 0.09)} ${-s} 0Q${r(-s * 0.09)} ${r(-s * 0.09)} 0 ${-s}Z" fill="#fffef6"/>
  </g>`
}

function flame3d(p, f = FLAME, { glow = true } = {}) {
  const outer = flamePath(f.cx, f.tip, f.base, f.lean, 0.26)
  const inner = flamePath(f.cx + 0.03, f.tip + 3.3, f.base - 0.45, f.lean * 0.5, 0.27)
  const defs = `
    <linearGradient id="${p}flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ffd76e"/>
      <stop offset=".35" stop-color="#ffa22a"/>
      <stop offset=".8" stop-color="#f26a0c"/>
      <stop offset="1" stop-color="#d9480f"/>
    </linearGradient>
    <linearGradient id="${p}core" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fffdf2"/>
      <stop offset="1" stop-color="#ffe6a0"/>
    </linearGradient>
    <radialGradient id="${p}halo" gradientUnits="userSpaceOnUse" cx="${f.cx}" cy="${r(f.tip + 3.6)}" r="6.5">
      <stop offset="0" stop-color="#ffb347" stop-opacity=".55"/>
      <stop offset=".45" stop-color="#ff8a1f" stop-opacity=".16"/>
      <stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/>
    </radialGradient>
    <filter id="${p}fblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".35"/></filter>
    <filter id="${p}cblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".1"/></filter>`
  const body = `
    ${glow ? `<circle cx="${f.cx}" cy="${r(f.tip + 3.6)}" r="6.5" fill="url(#${p}halo)"/>` : ''}
    <path d="${outer}" fill="#ff7a1a" opacity=".7" filter="url(#${p}fblur)"/>
    <path d="${outer}" fill="url(#${p}flame)"/>
    <path d="${inner}" fill="url(#${p}core)" filter="url(#${p}cblur)"/>`
  return { defs, body }
}

/** Deep-indigo tile with a faint mandala and a gilded rim. */
function tile(p, { mandala = true, bleed = false, palette = 'indigo' } = {}) {
  const pal = {
    indigo: ['#25206a', '#120f3a', '#07061a', '#14b8a6'],
    peacock: ['#0f5160', '#07303a', '#03161c', '#2dd4bf'],
    maroon: ['#4a1027', '#200a2c', '#0a0718', '#f59e0b'],
  }[palette]
  const shape = bleed ? `<rect width="32" height="32"/>` : `<rect x=".5" y=".5" width="31" height="31" rx="7.2"/>`
  const petals = []
  if (mandala) {
    for (let i = 0; i < 16; i++) {
      const a = (i * 360) / 16
      petals.push(`<path transform="rotate(${a} 16 17)" d="M16 4.6Q17.6 7.2 16 9.8Q14.4 7.2 16 4.6Z"/>`)
    }
  }
  const defs = `
    <clipPath id="${p}tile">${shape}</clipPath>
    <linearGradient id="${p}bg" x1="0" y1="0" x2=".75" y2="1">
      <stop offset="0" stop-color="${pal[0]}"/>
      <stop offset=".55" stop-color="${pal[1]}"/>
      <stop offset="1" stop-color="${pal[2]}"/>
    </linearGradient>
    <radialGradient id="${p}warm" gradientUnits="userSpaceOnUse" cx="15.8" cy="7.5" r="17">
      <stop offset="0" stop-color="#ff9f43" stop-opacity=".30"/>
      <stop offset=".5" stop-color="#ff7a1a" stop-opacity=".07"/>
      <stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}cool" gradientUnits="userSpaceOnUse" cx="3" cy="31" r="17">
      <stop offset="0" stop-color="${pal[3]}" stop-opacity=".2"/>
      <stop offset="1" stop-color="${pal[3]}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe7a8" stop-opacity=".7"/>
      <stop offset=".3" stop-color="#ffe7a8" stop-opacity=".12"/>
      <stop offset=".75" stop-color="#c98a26" stop-opacity=".1"/>
      <stop offset="1" stop-color="#c98a26" stop-opacity=".45"/>
    </linearGradient>`
  const body = `
    <g clip-path="url(#${p}tile)">
      <rect width="32" height="32" fill="url(#${p}bg)"/>
      <rect width="32" height="32" fill="url(#${p}cool)"/>
      <rect width="32" height="32" fill="url(#${p}warm)"/>
      ${mandala ? `<g fill="none" stroke="#f6d27a" stroke-width=".09" opacity=".16">
        <circle cx="16" cy="17" r="13.6"/><circle cx="16" cy="17" r="10.3"/><circle cx="16" cy="17" r="4.1"/>
        ${petals.join('')}
      </g>` : ''}
      <ellipse cx="13" cy="-1" rx="20" ry="7" fill="#fff" opacity=".05"/>
    </g>
    ${bleed ? '' : `<rect x=".66" y=".66" width="30.68" height="30.68" rx="7.04" fill="none" stroke="url(#${p}rim)" stroke-width=".2"/>`}`
  return { defs, body }
}

/* ───────────────────────── marks ───────────────────────── */

function svg(viewBox, inner, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${extra}>${inner}</svg>\n`
}

/** Master 3D mark. `scale` < 1 shrinks the artwork into a safe zone (maskable). */
function masterMark(p = 'm', { bleed = false, scale = 1, title = 'NexoraGuru' } = {}) {
  const t = tile(p, { bleed })
  const glyphDefs = `<g id="${p}glyph">${ngShapes({}).map((d) => `<path d="${d}"/>`).join('')}</g>`
  const g = gold3d(p, glyphDefs, 'fill', { warmAt: [FLAME.cx, FLAME.base + 0.4] })
  const f = flame3d(p)
  const art = `${g.body}${f.body}${glint(4.75, 10.25, 0.95, p)}${glint(24.6, 25.4, 0.5, p)}`
  // optical centre: the flame makes the art top-heavy, so nudge it down a touch
  const k = scale * 0.92
  const tr = `translate(${r(16 - 16 * k)} ${r(16.4 - 16 * k)}) scale(${k})`
  return `<title>${title}</title><defs>${t.defs}${g.defs}${f.defs}
    <filter id="${p}glintblur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation=".35"/></filter></defs>
    ${t.body}<g transform="${tr}">${art}</g>`
}

/** Flat mark for ≤32 px: no bevel, no blur, hinted geometry. */
function flatMark(p = 'f', { title = 'NexoraGuru' } = {}) {
  return `<title>${title}</title><defs>
    <linearGradient id="${p}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#211c5f"/><stop offset="1" stop-color="#0d0b2c"/></linearGradient>
    <linearGradient id="${p}au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdd85"/><stop offset="1" stop-color="#eaa93a"/></linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#${p}bg)"/>
  <g fill="url(#${p}au)">${ngShapesFlat().map((d) => `<path d="${d}"/>`).join('')}</g>
  <path d="${flamePath(16, 3.6, 10, 0.2)}" fill="#ff9a2e"/>
  <path d="${flamePath(16, 6.2, 9.7, 0.1)}" fill="#ffe7a3"/>`
}

/* ───────────────────────── wordmark / lockups ───────────────────────── */

function wordmark(p, { x, baseline, cap, dark }) {
  const s = cap / WM.capHeight
  const nexoraFill = dark ? '#f6f1e4' : '#17143f'
  const guru = dark
    ? ['#fde9ad', '#efbd52', '#c98a26']
    : ['#c4811c', '#a8661a', '#7f4a0f']
  return {
    width: WM.advance * s,
    defs: `<linearGradient id="${p}wg" gradientUnits="userSpaceOnUse" x1="0" y1="${r(baseline - cap)}" x2="0" y2="${baseline}">
      <stop offset="0" stop-color="${guru[0]}"/><stop offset=".55" stop-color="${guru[1]}"/><stop offset="1" stop-color="${guru[2]}"/></linearGradient>`,
    body: `<g transform="translate(${r(x)} ${r(baseline)}) scale(${r(s)})">
      <path fill="${nexoraFill}" d="${WM.nexora}"/>
      <path fill="url(#${p}wg)" d="${WM.guru}"/>
    </g>`,
  }
}

function lockup({ dark }) {
  const H = 128 // mark height
  const cap = 44
  const gap = 30
  const wm = wordmark('w', { x: H + gap, baseline: H / 2 + cap / 2, cap, dark })
  const W = Math.ceil(H + gap + wm.width + 4)
  const inner = `<title>NexoraGuru</title><defs>${wm.defs}</defs>
  <svg x="0" y="0" width="${H}" height="${H}" viewBox="0 0 32 32">${masterMark('m')}</svg>
  ${wm.body}`
  return svg(`0 0 ${W} ${H}`, inner, ` width="${W}" height="${H}"`)
}

/* ───────────────────────── concepts ───────────────────────── */

/** B — Lotus Seal: an interlaced NG medallion inside an eight-petal lotus, peacock tones. */
function conceptLotus() {
  const p = 'b'
  const t = tile(p, { palette: 'peacock', mandala: false })
  const petals = []
  for (let i = 0; i < 8; i++) {
    const a = i * 45 + 22.5
    petals.push(`<path transform="rotate(${a} 16 16.2)" d="M16 1.9Q19.9 6.2 16 10.4Q12.1 6.2 16 1.9Z"/>`)
  }
  const petalDefs = `<g id="${p}glyph">${petals.join('')}</g>`
  const lotus = gold3d(p, petalDefs, 'fill', { depth: 0.45, bbox: [2, 2, 30, 30] })
  const q = 'c'
  // interlaced N + G, stroked
  const ng = `<g id="${q}glyph" fill="none" stroke-width="1.55" stroke-linejoin="miter" stroke-miterlimit="10">
      <path d="M10.6 20.6V11.6L15.6 20.6V11.6"/>
      <path d="M21.6 13.1A4.9 4.9 0 1 0 22.4 17H18.6"/>
    </g>`
  const mono = gold3d(q, ng, 'stroke', { depth: 0.5, bbox: [10, 11, 23, 21] })
  return svg('0 0 32 32', `<title>Concept B — Lotus Seal</title><defs>${t.defs}${lotus.defs}${mono.defs}
    <radialGradient id="disc" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#123d63"/><stop offset="1" stop-color="#071a2e"/></radialGradient></defs>
    ${t.body}${lotus.body}
    <circle cx="16" cy="16.2" r="9.1" fill="url(#disc)" stroke="#e9bb57" stroke-width=".38"/>
    <circle cx="16" cy="16.2" r="8.35" fill="none" stroke="#e9bb57" stroke-width=".1" opacity=".6"/>
    ${mono.body}`)
}

/** C — Gopuram Gate: N and G standing inside a stepped temple-tower frame, with a kalasha finial. */
function conceptGopuram() {
  const p = 'g'
  const t = tile(p, { palette: 'maroon', mandala: false })
  const frame = `<g id="${p}glyph">
      <path fill-rule="evenodd" d="M4.6 28.4V22.6H6.2V17.8H8V13.4H10V9.6H11.4V7.4Q11.4 5.8 13 5.8H19Q20.6 5.8 20.6 7.4V9.6H22V13.4H24V17.8H25.8V22.6H27.4V28.4Z
        M7.2 27V22.4Q7.2 13 16 13Q24.8 13 24.8 22.4V27Z"/>
      <path d="M15.2 5.9Q15.2 4.1 16 2.6Q16.8 4.1 16.8 5.9Z"/><path d="M12.6 5.9Q12.6 4.6 13.2 3.6Q13.8 4.6 13.8 5.9Z"/><path d="M18.2 5.9Q18.2 4.6 18.8 3.6Q19.4 4.6 19.4 5.9Z"/>
    </g>`
  const fr = gold3d(p, frame, 'fill', { depth: 0.55, bbox: [4, 2, 28, 29] })
  const q = 'h'
  const letters = `<g id="${q}glyph">
      <path d="M9.4 26.6V17.4H11.2L14.6 23V17.4H16.1V26.6H14.4L10.9 21V26.6Z"/>
      <path d="M22.8 19.4Q22 17.2 19.9 17.2Q16.9 17.2 16.9 21.9Q16.9 26.8 19.9 26.8Q22.9 26.8 22.9 23.4V21.8H19.9V23.2H21.3Q21.3 25.3 19.9 25.3Q18.5 25.3 18.5 21.9Q18.5 18.7 19.9 18.7Q20.9 18.7 21.3 19.8Z"/>
    </g>`
  const lt = gold3d(q, letters, 'fill', { depth: 0.5, bbox: [9, 17, 23, 27] })
  return svg('0 0 32 32', `<title>Concept C — Gopuram Gate</title><defs>${t.defs}${fr.defs}${lt.defs}</defs>
    ${t.body}${fr.body}${lt.body}`)
}

/* ───────────────────────── write ───────────────────────── */

export function build() {
  mkdirSync(OUT, { recursive: true })
  mkdirSync(CONCEPTS, { recursive: true })
  const files = {
    [join(OUT, 'ngmark.svg')]: svg('0 0 32 32', masterMark('m')),
    [join(OUT, 'ngmark-flat.svg')]: svg('0 0 32 32', flatMark('f')),
    [join(OUT, 'ngmark-maskable.svg')]: svg('0 0 32 32', masterMark('m', { bleed: true, scale: 0.74 })),
    [join(OUT, 'ngmark-apple.svg')]: svg('0 0 32 32', masterMark('m', { bleed: true, scale: 0.88 })),
    [join(OUT, 'lockup-on-dark.svg')]: lockup({ dark: true }),
    [join(OUT, 'lockup-on-light.svg')]: lockup({ dark: false }),
    [join(CONCEPTS, 'concept-a-diya-shirorekha.svg')]: svg('0 0 32 32', masterMark('m', { title: 'Concept A — Diya Shirorekha' })),
    [join(CONCEPTS, 'concept-b-lotus-seal.svg')]: conceptLotus(),
    [join(CONCEPTS, 'concept-c-gopuram-gate.svg')]: conceptGopuram(),
  }
  // legacy icon paths (old bookmarks, static pages in public/) get the new flat mark
  files[join(ROOT, 'client', 'public', 'favicon.svg')] = files[join(OUT, 'ngmark-flat.svg')]
  files[join(ROOT, 'client', 'public', 'nexora.svg')] = files[join(OUT, 'ngmark-flat.svg')]
  files[join(ROOT, 'public', 'favicon.svg')] = files[join(OUT, 'ngmark-flat.svg')]
  for (const [f, c] of Object.entries(files)) writeFileSync(f, c.replace(/\n\s+/g, '\n'))
  return Object.keys(files)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const f of build()) console.log('wrote', f.replace(ROOT + '/', ''))
}

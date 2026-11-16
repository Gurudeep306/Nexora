/**
 * "Portraits": 16 people drawn in a flat editorial style that sits on the
 * Field Journal's paper: muted backgrounds, flat skin with one shade, hair
 * as solid shapes, ink features and a clay accent here and there. No
 * gradients and no glows. Shown in a circle, so the head sits centred.
 *
 * One rig (proportions, light from the upper left) shared by everyone, so
 * the set reads as one family. Fixed 64x64 SVGs, nothing random. Built into
 * client/public/avatars/<id>.svg by build-set.mjs alongside the Clay set.
 * The ids must also be in client/src/lib/avatar.ts and src/avatar-set.js.
 */

const INK = '#1C1B19'
const LIP = '#9A4A3A'

const SKIN = {
  fair: ['#F3CDAF', '#DFAD8C'],
  wheat: ['#E5B48E', '#CC966F'],
  tan: ['#CF9771', '#B57B56'],
  brown: ['#A9724D', '#8C5B3C'],
  deep: ['#7E5237', '#643F29'],
}
const HAIR = { black: '#1E1C1B', soft: '#2E2420', brown: '#4F3426', auburn: '#6E3B26', grey: '#9C978E' }
const BG = {
  sage: '#C9D5BF',
  ochre: '#EBCB92',
  clay: '#EDB29A',
  slate: '#BCC7D3',
  oat: '#E3D9C8',
  plum: '#D5BCC8',
  mint: '#C4DCD1',
  sand: '#E9D6B4',
}
const CLOTH = {
  ink: '#22252B',
  clay: '#D97757',
  slate: '#4D5E70',
  moss: '#5F7552',
  ochre: '#C99A3E',
  paper: '#F4EFE3',
  plum: '#7B4F68',
  navy: '#2F3B57',
  teal: '#2F6F6A',
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body.replace(/\s*\n\s*/g, '')}</svg>`

/* ── Pieces ───────────────────────────────────────────────────────────── */

const back = (bg) => `<rect width="64" height="64" fill="${bg}"/><circle cx="32" cy="30" r="21" fill="#fff" fill-opacity=".2"/>`

function body(cloth, collar, skinShade) {
  const torso = `<path d="M8 64C8 53 18 47.5 32 47.5S56 53 56 64Z" fill="${cloth}"/><path d="M40 49C48 51.5 56 56 56 64H44C45 58 43.5 53 40 49Z" fill="#000" fill-opacity=".14"/>`
  const collars = {
    crew: `<path d="M26 48.2C27.5 51.6 36.5 51.6 38 48.2" fill="none" stroke="${skinShade}" stroke-width="1.6"/>`,
    v: `<path d="M26.5 48L32 55.5L37.5 48Z" fill="${skinShade}"/>`,
    shirt: `<path d="M25.5 47.8L31 54L28 56.5Z M38.5 47.8L33 54L36 56.5Z" fill="#F4EFE3"/><path d="M27 48.4L32 54.6L37 48.4Z" fill="${skinShade}"/>`,
    kurta: `<path d="M27 48.4L32 53L37 48.4Z" fill="${skinShade}"/><path d="M32 53V62" stroke="#00000033" stroke-width="1"/><circle cx="32" cy="56.5" r=".8" fill="#00000055"/><circle cx="32" cy="59.5" r=".8" fill="#00000055"/>`,
    hoodie: `<path d="M20 49.5C22 56 42 56 44 49.5" fill="none" stroke="#00000030" stroke-width="2.4"/><path d="M28.5 54V60M35.5 54V60" stroke="#F4EFE3" stroke-width="1.1" stroke-linecap="round"/>`,
  }
  return torso + (collars[collar] ?? '')
}

const neck = (s) => `<path d="M27 38H37V48C37 51.5 27 51.5 27 48Z" fill="${s[1]}"/><path d="M27 40.6C29.4 43.2 34.6 43.2 37 40.6V43.6C34.6 45.6 29.4 45.6 27 43.6Z" fill="#000" fill-opacity=".12"/>`
const ears = (s) => `<ellipse cx="21.6" cy="30.5" rx="2.2" ry="3" fill="${s[1]}"/><ellipse cx="42.4" cy="30.5" rx="2.2" ry="3" fill="${s[1]}"/>`
const head = (s) => `<path d="M21.5 28.5C21.5 19 26 15.5 32 15.5S42.5 19 42.5 28.5C42.5 37 38 42.2 32 42.2S21.5 37 21.5 28.5Z" fill="${s[0]}"/><path d="M38.6 18.4C41.6 21 42.5 24.6 42.5 28.5C42.5 37 38 42.2 32 42.2C36.6 39.4 39.4 34 39.4 27.6C39.4 24.2 39.2 21 38.6 18.4Z" fill="${s[1]}" fill-opacity=".6"/>`

function face(s, { brow = HAIR.black, eyes = 'open', smile = 'soft', blush = true } = {}) {
  const e =
    eyes === 'closed'
      ? `<path d="M26.6 30.2Q28.2 31.6 29.8 30.2M34.2 30.2Q35.8 31.6 37.4 30.2" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>`
      : `<ellipse cx="28.2" cy="30.1" rx="1.15" ry="1.45" fill="${INK}"/><ellipse cx="35.8" cy="30.1" rx="1.15" ry="1.45" fill="${INK}"/><circle cx="28.6" cy="29.6" r=".35" fill="#fff"/><circle cx="36.2" cy="29.6" r=".35" fill="#fff"/>`
  const b = `<path d="M25.9 26.6Q28.2 25.3 30.3 26.4M33.7 26.4Q35.8 25.3 38.1 26.6" fill="none" stroke="${brow}" stroke-width="1.15" stroke-linecap="round"/>`
  const nose = `<path d="M32.3 31.2Q31 34 32.6 34.6" fill="none" stroke="${s[1]}" stroke-width="1" stroke-linecap="round"/>`
  const mouths = {
    soft: `<path d="M29.4 37Q32 38.8 34.6 37" fill="none" stroke="${LIP}" stroke-width="1.15" stroke-linecap="round"/>`,
    grin: `<path d="M29 36.6Q32 40.2 35 36.6Z" fill="${LIP}"/><path d="M29.8 36.9H34.2" stroke="#fff" stroke-width=".7"/>`,
    calm: `<path d="M30 37.3H34" stroke="${LIP}" stroke-width="1.15" stroke-linecap="round"/>`,
  }
  const cheeks = blush ? `<circle cx="25.6" cy="34.2" r="1.9" fill="#E07A5F" fill-opacity=".22"/><circle cx="38.4" cy="34.2" r="1.9" fill="#E07A5F" fill-opacity=".22"/>` : ''
  return cheeks + b + e + nose + mouths[smile]
}

/* Hair: [behind the head, in front of the head]. */
const HAIRCUTS = {
  short: (c) => ['', `<path d="M21.2 28C20.4 18.6 26 14.4 32.2 14.4C38.6 14.4 43.8 18.4 42.8 28C41.6 22.6 38.4 20.6 34 21.2C30.2 21.8 25.4 21.2 21.2 28Z" fill="${c}"/>`],
  part: (c) => ['', `<path d="M21 28.5C20 18 26 14 32.4 14.2C39.4 14.4 44.6 19.6 42.9 28.4C42 23.4 40 21.6 36.6 20.6C33 23.4 26.4 23 21 28.5Z" fill="${c}"/><path d="M36.6 20.6C35.6 18.6 34.4 17.6 32.6 16.8" stroke="#ffffff26" stroke-width=".8" fill="none"/>`],
  quiff: (c) => ['', `<path d="M21.3 27.6C20.6 19.6 24.4 15.6 28.6 14.6C30 12.2 35.6 11.4 39.2 13.8C43.4 16.4 43.6 22.4 42.7 27.6C41.4 22.4 38.6 21.4 34.8 21C30.4 20.6 24.6 21.8 21.3 27.6Z" fill="${c}"/>`],
  curls: (c) =>
    [
      '',
      `<g fill="${c}"><circle cx="22.8" cy="24.5" r="3.6"/><circle cx="25.6" cy="19.4" r="4"/><circle cx="31" cy="16.6" r="4.4"/><circle cx="36.8" cy="18" r="4.2"/><circle cx="41" cy="22.6" r="3.8"/><circle cx="42" cy="27" r="2.6"/><circle cx="21.8" cy="28.2" r="2.4"/><path d="M23 25C27 22 37 21.6 41.2 25L41 20H23Z"/></g>`,
    ],
  afro: (c) => [
    `<g fill="${c}"><circle cx="32" cy="24" r="15.5"/><circle cx="19.5" cy="28" r="6"/><circle cx="44.5" cy="28" r="6"/></g>`,
    `<path d="M22 26C24.5 20.5 39.5 20.5 42 26C41.6 21 37.6 18 32 18S22.4 21 22 26Z" fill="${c}"/>`,
  ],
  long: (c) => [
    `<path d="M19.4 29C19.4 17.6 25.4 13.4 32 13.4S44.6 17.6 44.6 29V49C44.6 51 41.6 52 39 50.6V36H25V50.6C22.4 52 19.4 51 19.4 49Z" fill="${c}"/>`,
    `<path d="M21.2 29.5C21 19 26.4 15 32 15S43.2 19.2 42.8 29.5C41.6 23 37.6 19.8 33.6 19.6C31.2 23 26.4 25.6 21.2 29.5Z" fill="${c}"/>`,
  ],
  bob: (c) => [
    `<path d="M19.6 30C19.6 18.4 25.4 13.6 32 13.6S44.4 18.4 44.4 30V39.5C44.4 41.4 41.2 41.8 39.6 40.6V32H24.4V40.6C22.8 41.8 19.6 41.4 19.6 39.5Z" fill="${c}"/>`,
    `<path d="M21.2 27.8C21.6 18.8 26.4 15.2 32 15.2S42.6 18.8 42.8 27.8C40 23.2 36 22.4 32 22.4S24 23.2 21.2 27.8Z" fill="${c}"/>`,
  ],
  bun: (c) => [
    `<circle cx="32" cy="11.6" r="5.2" fill="${c}"/>`,
    `<path d="M21.2 28.6C20.6 19 26 15 32 15S43.4 19 42.8 28.6C41.4 23.6 37.6 20.2 32 20.2S22.6 23.6 21.2 28.6Z" fill="${c}"/><path d="M28 14.8Q32 13.2 36 14.8" stroke="#ffffff22" stroke-width=".8" fill="none"/>`,
  ],
  braid: (c) => [
    `<path d="M19.8 29.4C19.8 18 25.6 13.8 32 13.8S44.2 18 44.2 29.4V36H19.8Z" fill="${c}"/><g fill="${c}"><ellipse cx="43.6" cy="40" rx="3" ry="3.6"/><ellipse cx="44.4" cy="46" rx="2.8" ry="3.4"/><ellipse cx="45" cy="51.6" rx="2.6" ry="3.2"/></g><circle cx="45.2" cy="56" r="1.4" fill="#D97757"/>`,
    `<path d="M21.2 28.8C21 19.4 26.2 15.4 32 15.4S43 19.4 42.8 28.8C40.6 23.4 36.6 20.6 32 20.6S23.4 23.4 21.2 28.8Z" fill="${c}"/>`,
  ],
  bald: (c) => ['', `<path d="M21.4 30C20.8 26 21.4 23.6 22.4 22.4L23.2 29Z M42.6 30C43.2 26 42.6 23.6 41.6 22.4L40.8 29Z" fill="${c}"/>`],
}

/* Extras drawn over the face. */
const glasses = (frame = INK) =>
  `<g fill="none" stroke="${frame}" stroke-width="1.1"><rect x="24.6" y="27.6" width="7" height="5.4" rx="2.2"/><rect x="32.4" y="27.6" width="7" height="5.4" rx="2.2"/><path d="M31.6 30H32.4M24.6 29.6L21.8 28.8M39.4 29.6L42.2 28.8"/></g>`
const roundGlasses = (frame = INK) => `<g fill="none" stroke="${frame}" stroke-width="1.1"><circle cx="28.2" cy="30.2" r="3.2"/><circle cx="35.8" cy="30.2" r="3.2"/><path d="M31.4 30H32.6"/></g>`
const bindi = `<circle cx="32" cy="25" r=".95" fill="#C0392B"/>`
const studs = (c = '#E7C46B') => `<circle cx="21.4" cy="33.6" r="1" fill="${c}"/><circle cx="42.6" cy="33.6" r="1" fill="${c}"/>`
const hoops = (c = '#E7C46B') => `<g fill="none" stroke="${c}" stroke-width=".9"><circle cx="21.4" cy="35" r="1.8"/><circle cx="42.6" cy="35" r="1.8"/></g>`
const beard = (c) => `<path d="M21.8 30C22 37.4 26 42.8 32 42.8S42 37.4 42.2 30C41 34.6 38.4 36.4 36 36.4C34.6 35.2 29.4 35.2 28 36.4C25.6 36.4 23 34.6 21.8 30Z" fill="${c}"/><path d="M29.4 37.4Q32 38.6 34.6 37.4" stroke="${LIP}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`
const stubble = (c) => `<path d="M23 33C24 39 28 42 32 42S40 39 41 33C39 37.6 35.6 39 32 39S25 37.6 23 33Z" fill="${c}" fill-opacity=".28"/>`
const moustache = (c) => `<path d="M28.2 35.6C29.6 34.4 31.2 34.6 32 35.4C32.8 34.6 34.4 34.4 35.8 35.6C34.6 36.4 33 36.4 32 35.8C31 36.4 29.4 36.4 28.2 35.6Z" fill="${c}"/>`
const headphones = (band = INK, cup = '#D97757') =>
  `<path d="M19.6 31C19.4 19 25 12.6 32 12.6S44.6 19 44.4 31" fill="none" stroke="${band}" stroke-width="2.2"/><rect x="17" y="27.4" width="5.4" height="9" rx="2.6" fill="${cup}"/><rect x="41.6" y="27.4" width="5.4" height="9" rx="2.6" fill="${cup}"/>`
const pencil = `<g transform="rotate(-28 44 18)"><rect x="41" y="12" width="2.4" height="12" fill="#E7C46B"/><path d="M41 24L42.2 27L43.4 24Z" fill="#F3CDAF"/><rect x="41" y="11" width="2.4" height="1.6" fill="#D97757"/></g>`

const hijab = (c, fold = '#00000022') => [
  `<path d="M16.6 33C16.6 18.6 23.6 12.6 32 12.6S47.4 18.6 47.4 33C47.4 43 44 48 40 51L44 64H20L24 51C20 48 16.6 43 16.6 33Z" fill="${c}"/>`,
  `<path d="M22.4 27C23.6 20 27.4 17.6 32 17.6S40.4 20 41.6 27C40 21.6 36.4 20.2 32 20.2S24 21.6 22.4 27Z" fill="${c}"/><path d="M23.6 44C27 48 37 48 40.4 44" stroke="${fold}" stroke-width="1.4" fill="none"/>`,
]
const turban = (c, fold = '#00000026') =>
  `<path d="M20.4 26.6C19.6 16.4 25.4 11.2 32 11.2S44.4 16.4 43.6 26.6C40.8 22.8 36.6 21.6 32 21.8S23.2 22.8 20.4 26.6Z" fill="${c}"/><path d="M21.6 23.6C25 17.6 35 15.6 42.4 21.4M22.6 19.2C27.4 14.6 36.2 14 41 17.4" stroke="${fold}" stroke-width="1.3" fill="none"/><path d="M30 21.8L32 18.6L34 21.8Z" fill="${fold}"/>`

/* ── Assemble ─────────────────────────────────────────────────────────── */

function person(p) {
  const s = SKIN[p.skin]
  const hc = HAIR[p.hair ?? 'black']
  const cut = p.cut ? HAIRCUTS[p.cut](hc) : ['', '']
  const hj = p.hijab ? hijab(p.hijab) : null
  return svg(
    back(BG[p.bg]) +
      '<g transform="translate(32 40) scale(1.1) translate(-32 -40)">' +
      cut[0] +
      (hj ? hj[0] : '') +
      body(CLOTH[p.cloth], p.collar ?? 'crew', s[1]) +
      neck(s) +
      (hj ? '' : ears(s)) +
      head(s) +
      (hj ? hj[1] : '') +
      face(s, { brow: p.brow ?? hc, eyes: p.eyes, smile: p.smile, blush: p.blush ?? true }) +
      (p.stubble ? stubble(hc) : '') +
      (p.beard ? beard(hc) : '') +
      (p.moustache ? moustache(hc) : '') +
      cut[1] +
      (p.turban ? turban(p.turban) : '') +
      (p.bindi ? bindi : '') +
      (p.studs ? studs() : '') +
      (p.hoops ? hoops() : '') +
      (p.glasses === 'round' ? roundGlasses() : p.glasses ? glasses() : '') +
      (p.headphones ? headphones() : '') +
      (p.pencil ? pencil : '') +
      '</g>',
  )
}

const PEOPLE = [
  { id: 'asha', skin: 'tan', bg: 'clay', cloth: 'ink', cut: 'long', bindi: true, studs: true, smile: 'soft' },
  { id: 'vikram', skin: 'wheat', bg: 'slate', cloth: 'navy', collar: 'shirt', cut: 'part', glasses: true, stubble: true, smile: 'calm' },
  { id: 'meera', skin: 'brown', bg: 'sage', cloth: 'clay', collar: 'kurta', cut: 'braid', hoops: true, smile: 'grin' },
  { id: 'rohan', skin: 'tan', bg: 'ochre', cloth: 'slate', collar: 'hoodie', cut: 'quiff', headphones: true, smile: 'grin' },
  { id: 'fatima', skin: 'wheat', bg: 'mint', cloth: 'teal', hijab: '#3D4F63', glasses: 'round', smile: 'soft' },
  { id: 'kabir', skin: 'deep', bg: 'oat', cloth: 'moss', collar: 'crew', cut: 'afro', smile: 'grin' },
  { id: 'priya', skin: 'fair', bg: 'plum', cloth: 'paper', collar: 'v', cut: 'bob', hair: 'soft', studs: true, smile: 'soft' },
  { id: 'harpreet', skin: 'wheat', bg: 'sand', cloth: 'slate', collar: 'shirt', turban: '#2F3B57', beard: true, smile: 'soft' },
  { id: 'tara', skin: 'deep', bg: 'ochre', cloth: 'plum', cut: 'curls', hoops: true, smile: 'grin' },
  { id: 'nikhil', skin: 'brown', bg: 'mint', cloth: 'ink', collar: 'hoodie', cut: 'short', glasses: true, smile: 'soft' },
  { id: 'ishita', skin: 'tan', bg: 'slate', cloth: 'ochre', collar: 'crew', cut: 'bun', glasses: 'round', pencil: true, smile: 'soft' },
  { id: 'yusuf', skin: 'tan', bg: 'sage', cloth: 'paper', collar: 'kurta', cut: 'short', beard: true, smile: 'calm' },
  { id: 'ananya', skin: 'fair', bg: 'clay', cloth: 'navy', collar: 'crew', cut: 'long', hair: 'brown', headphones: true, smile: 'grin' },
  { id: 'sameer', skin: 'brown', bg: 'plum', cloth: 'clay', collar: 'crew', cut: 'curls', moustache: true, smile: 'soft' },
  { id: 'divya', skin: 'brown', bg: 'oat', cloth: 'moss', collar: 'v', cut: 'long', bindi: true, glasses: true, smile: 'soft' },
  { id: 'raghav', skin: 'wheat', bg: 'sand', cloth: 'ink', collar: 'shirt', cut: 'bald', hair: 'grey', beard: true, glasses: 'round', smile: 'soft', brow: '#7C776F' },
]

export const PORTRAIT_SET = PEOPLE.map((p) => ({ id: p.id, svg: person(p) }))

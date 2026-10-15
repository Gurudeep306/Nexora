/**
 * NexoraGuru avatar set, round 1: three hand-authored style directions with
 * 6 samples each. Every avatar is a fixed 64x64 SVG drawn by hand. The small
 * helpers below only share the scaffolding (background, shoulders, head) so a
 * set keeps the same lighting and proportions; nothing is random.
 *
 * All three are full-bleed circles, so they drop into the existing
 * rounded-full <Avatar> without extra framing.
 */

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body.replace(/\s*\n\s*/g, '')}</svg>`

/* ─────────────────────────────────────────────────────────────────────
   A · CLAY: soft 3D characters. One key light from the upper left, warm
   skin gradients, a soft contact shadow under the chin, glossy eyes.
   ───────────────────────────────────────────────────────────────────── */

const SKIN = {
  porcelain: ['#FFE7D8', '#F5C6AA', '#DB9F82'],
  sand: ['#F9D5B3', '#E8B28A', '#C78C64'],
  honey: ['#EEC092', '#D49C69', '#AE7647'],
  bronze: ['#CB9165', '#A86E45', '#82502E'],
  cocoa: ['#A06C4B', '#7A4A2E', '#57311C'],
}

const EYE = '#2A1A14'
const MOUTH = '#5A2419'
const clayEyes = (o = {}) => {
  const open = (x) =>
    `<ellipse cx="${x}" cy="32" rx="1.95" ry="2.35" fill="${EYE}"/><circle cx="${x + 0.65}" cy="31.15" r=".65" fill="#fff"/>`
  const shut = (x) =>
    `<path d="M${x - 2.1} 32.7q2.1-2.6 4.2 0" fill="none" stroke="${EYE}" stroke-width="1.5" stroke-linecap="round"/>`
  return (o.l === 'shut' ? shut(26.5) : open(26.5)) + (o.r === 'shut' ? shut(37.5) : open(37.5))
}
const claySmile = `<path d="M28.6 37.7q3.4 3 6.8 0" fill="none" stroke="${MOUTH}" stroke-width="1.5" stroke-linecap="round"/>`
const clayGrin = `<path d="M28 36.8h8q0 4.6-4 4.6t-4-4.6z" fill="${MOUTH}"/><path d="M30 40.2q2-1.5 4 0q-1 1.2-2 1.2t-2-1.2z" fill="#E8706A"/>`
const clayBlush = (o = 0.3) =>
  `<ellipse cx="22.4" cy="36.4" rx="2.7" ry="1.6" fill="#FF6F61" opacity="${o}"/><ellipse cx="41.6" cy="36.4" rx="2.7" ry="1.6" fill="#FF6F61" opacity="${o}"/>`
const shine = (d, o = 0.38) =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="1.4" stroke-linecap="round"/>`

function clay({ bg, skin, hair = ['#000', '#000'], shirt, back = '', over = '', front = '', face, extra = '', head, ears = true }) {
  const [hi, base, shade] = skin
  return svg(`
    <defs>
      <radialGradient id="bg" cx=".3" cy=".22" r=".95"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
      <radialGradient id="sk" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
      <radialGradient id="sh" cx=".35" cy=".05" r="1.05"><stop offset="0" stop-color="${shirt[0]}"/><stop offset="1" stop-color="${shirt[1]}"/></radialGradient>
      <linearGradient id="hr" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${hair[0]}"/><stop offset="1" stop-color="${hair[1]}"/></linearGradient>
      <clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath>
    </defs>
    <g clip-path="url(#c)">
      <circle cx="32" cy="32" r="32" fill="url(#bg)"/>
      ${back}
      <path d="M5 66C5 53 16 46.5 32 46.5S59 53 59 66z" fill="url(#sh)"/>
      <path d="M26.8 38h10.4v8.4q-5.2 4-10.4 0z" fill="${shade}"/>
      <ellipse cx="32" cy="45.6" rx="6.4" ry="2.3" fill="#000" opacity=".14"/>
      ${over}
      ${ears ? `<circle cx="17.8" cy="32.4" r="3.2" fill="${base}"/><circle cx="46.2" cy="32.4" r="3.2" fill="${base}"/>` : ''}
      ${head ?? `<ellipse cx="32" cy="30" rx="14.6" ry="15.6" fill="url(#sk)"/>`}
      <ellipse cx="32" cy="35.2" rx="1.3" ry=".9" fill="${shade}" opacity=".6"/>
      ${front}
      ${face}
      ${extra}
    </g>`)
}

const CLAY = [
  {
    id: 'mira',
    name: 'Mira',
    svg: clay({
      bg: ['#FFDCCB', '#F2A486'],
      skin: SKIN.sand,
      hair: ['#6A4434', '#2E1B15'],
      shirt: ['#6FD0C3', '#2C8A80'],
      back: `<rect x="14.4" y="11" width="35.2" height="34.5" rx="14.5" fill="url(#hr)"/>`,
      front:
        `<path d="M17.4 29.5C16.6 19 22.8 13 32 13s15.4 6 14.6 16.5c-3.6-2.4-7.6-6.4-9.4-10.2C33.6 24 25.6 27.4 17.4 29.5z" fill="url(#hr)"/>` +
        shine('M22.4 17.6q4-3 9-3.3'),
      face: clayEyes() + claySmile + clayBlush(),
    }),
  },
  {
    id: 'kai',
    name: 'Kai',
    svg: clay({
      bg: ['#D2F2E1', '#82CCA9'],
      skin: SKIN.bronze,
      hair: ['#46342E', '#16100E'],
      shirt: ['#FFD978', '#E59E35'],
      front:
        `<g fill="url(#hr)"><ellipse cx="32" cy="19.6" rx="14" ry="7.6"/><circle cx="20" cy="22" r="4.6"/><circle cx="23.6" cy="16" r="4.6"/><circle cx="29" cy="12.8" r="4.6"/><circle cx="35" cy="12.8" r="4.6"/><circle cx="40.4" cy="16" r="4.6"/><circle cx="44" cy="22" r="4.6"/><circle cx="18.6" cy="26.4" r="3.2"/><circle cx="45.4" cy="26.4" r="3.2"/></g>` +
        shine('M26.4 11.2q2.6-1.4 5.2-.4', 0.3) +
        shine('M37.8 12.6q2.4.2 4 2', 0.3),
      face: clayEyes() + clayGrin + clayBlush(0.26),
    }),
  },
  {
    id: 'noor',
    name: 'Noor',
    svg: clay({
      bg: ['#FFF2C6', '#F2C95E'],
      skin: SKIN.honey,
      shirt: ['#A38FEF', '#6248C6'],
      ears: false,
      over:
        `<defs><linearGradient id="hj" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#C9B8FA"/><stop offset="1" stop-color="#7A60D6"/></linearGradient></defs>` +
        `<path d="M13.5 33C13.5 19 21.5 10.5 32 10.5S50.5 19 50.5 33c0 9-2 14 3 21-6 5-13.5 6.5-21.5 6.5S16.5 59 10.5 54c5-7 3-12 3-21z" fill="url(#hj)"/>` +
        `<path d="M19.5 43q12.5 9 25 0" fill="none" stroke="#4B3497" stroke-opacity=".28" stroke-width="1.6" stroke-linecap="round"/>`,
      head: `<ellipse cx="32" cy="31" rx="12.6" ry="14.2" fill="url(#sk)"/>`,
      front:
        `<path d="M19.2 28C20.2 19.8 25.4 15.4 32 15.4S43.8 19.8 44.8 28C41.2 23 36.8 20.8 32 20.8S22.8 23 19.2 28z" fill="url(#hj)"/>` +
        shine('M20.6 17q4.4-4.6 11.4-5', 0.42),
      face: clayEyes({ l: 'shut', r: 'shut' }) + claySmile + clayBlush(0.3),
    }),
  },
  {
    id: 'arjun',
    name: 'Arjun',
    svg: clay({
      bg: ['#D7E8FF', '#88B1F0'],
      skin: ['#E9B88A', '#CB905F', '#A46B3F'],
      hair: ['#3E3744', '#141118'],
      shirt: ['#7884F5', '#3B44BE'],
      front:
        `<path d="M17.2 30C15.6 18.4 22.4 11 32.6 11 43 11 49.2 18.6 46.8 30c-1-3.8-2.8-6.8-5.6-8.8-6.6 1.4-14.4.6-19.6-3.2-2 3.4-3.6 7.2-4.4 12z" fill="url(#hr)"/>` +
        shine('M36 13.4q5 1 8 4.6'),
      face:
        clayEyes() +
        claySmile +
        clayBlush(0.22) +
        `<g fill="none" stroke="#24212B" stroke-width="1.45"><circle cx="26.5" cy="32" r="4.5"/><circle cx="37.5" cy="32" r="4.5"/><path d="M31 31.4q1-.8 2 0"/><path d="M22 31.2l-3.8-1M42 31.2l3.8-1"/></g>` +
        `<path d="M23.6 30.6q.7-1.8 2.5-2.3" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'zara',
    name: 'Zara',
    svg: clay({
      bg: ['#EEE1FF', '#B394EE'],
      skin: SKIN.cocoa,
      hair: ['#46322C', '#140C0A'],
      shirt: ['#FFA382', '#E35B45'],
      back: `<g fill="url(#hr)"><circle cx="32" cy="23" r="17.5"/><circle cx="17.5" cy="20" r="7.5"/><circle cx="46.5" cy="20" r="7.5"/><circle cx="24" cy="10.5" r="8"/><circle cx="40" cy="10.5" r="8"/><circle cx="32" cy="7.5" r="8"/><circle cx="15.4" cy="29" r="5.6"/><circle cx="48.6" cy="29" r="5.6"/></g>`,
      front:
        `<path d="M17.6 28.5C17.8 20 24 15.8 32 15.8S46.2 20 46.4 28.5C42.4 23.6 37.6 21.4 32 21.4S21.6 23.6 17.6 28.5z" fill="url(#hr)"/>` +
        shine('M20.4 9.6q4.4-4.2 10-4.4', 0.28),
      face: clayEyes({ r: 'shut' }) + claySmile.replace(MOUTH, '#2A0F08') + clayBlush(0.3),
      extra: `<circle cx="17.4" cy="36.8" r="1.7" fill="#FFD36E"/><circle cx="46.6" cy="36.8" r="1.7" fill="#FFD36E"/>`,
    }),
  },
  {
    id: 'leo',
    name: 'Leo',
    svg: clay({
      bg: ['#E0EED4', '#A2C78A'],
      skin: SKIN.porcelain,
      hair: ['#F4A05C', '#BD551C'],
      shirt: ['#5A6BA0', '#252F58'],
      front:
        `<path d="M17 29C15 19 21 12 30 11.5c3-2.5 8-2.5 11-.5-2 .5-3 1.3-3.5 2C44 14 48.5 20 47 29c-2-5-5-8-9-9.5-1 2.5-4 4-8 3.5 1-1.5 1.3-2.5 1-3.5-4 2.5-9 3.5-12 3.5-1 2-1.5 4-2 6z" fill="url(#hr)"/>` +
        shine('M33 12.6q4-.4 7 1.6', 0.42),
      face:
        clayEyes() +
        clayGrin +
        clayBlush(0.32) +
        `<g fill="#C27A55" opacity=".7"><circle cx="23.2" cy="34.6" r=".55"/><circle cx="24.8" cy="35.8" r=".55"/><circle cx="22.4" cy="36.2" r=".55"/><circle cx="40.8" cy="34.6" r=".55"/><circle cx="39.2" cy="35.8" r=".55"/><circle cx="41.6" cy="36.2" r=".55"/></g>`,
    }),
  },
]

/* ─────────────────────────────────────────────────────────────────────
   B · INK: flat editorial portraits. One ink colour for every line and
   all hair, flat fills, a single offset shade crescent on each face.
   ───────────────────────────────────────────────────────────────────── */

const INK = '#1D1B26'
const INK_SKIN = {
  light: ['#FBDDC9', '#EDBFA2'],
  medium: ['#EAB68E', '#D29670'],
  tan: ['#CB8F64', '#B07450'],
  brown: ['#9C6545', '#81502F'],
  deep: ['#70432A', '#56311C'],
}
const PAPER = '#FFFDF8'
const st = (w = 2.2) =>
  `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`

const inkEyes = `<circle cx="27" cy="31" r="1.6" fill="${INK}"/><circle cx="37" cy="31" r="1.6" fill="${INK}"/>`
const inkShut = `<path d="M25 31.6q2-2.2 4 0M35 31.6q2-2.2 4 0" fill="none" ${st(1.8)}/>`
const inkNose = `<path d="M32.6 31.8v4h-1.8" fill="none" ${st(1.8)}/>`
const inkSmile = `<path d="M28.8 39.4q3.2 2.4 6.4 0" fill="none" ${st(1.8)}/>`
const inkOpen = `<path d="M28.4 38.6h7.2q0 4.2-3.6 4.2t-3.6-4.2z" fill="${INK}" ${st(1.4)}/>`
const inkCheeks = (c = '#F2846C', o = 0.5) =>
  `<circle cx="23.4" cy="36" r="2.4" fill="${c}" opacity="${o}"/><circle cx="40.6" cy="36" r="2.4" fill="${c}" opacity="${o}"/>`

function ink({ bg, skin, shirt, back = '', front = '', face, extra = '' }) {
  const [base, shade] = skin
  const HEAD = 'cx="32" cy="30" rx="13.4" ry="15"'
  return svg(`
    <defs>
      <clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath>
      <clipPath id="h"><ellipse ${HEAD}/></clipPath>
    </defs>
    <g clip-path="url(#c)">
      <circle cx="32" cy="32" r="32" fill="${bg}"/>
      ${back}
      <path d="M7 67C7 54 17 47.6 32 47.6S57 54 57 67z" fill="${shirt}" ${st()}/>
      <path d="M27.4 40v8.2q4.6 3.2 9.2 0V40" fill="${shade}" ${st()}/>
      <circle cx="18.8" cy="31.6" r="3" fill="${base}" ${st()}/><circle cx="45.2" cy="31.6" r="3" fill="${base}" ${st()}/>
      <ellipse ${HEAD} fill="${shade}"/>
      <ellipse cx="30" cy="29.4" rx="13.4" ry="15" fill="${base}" clip-path="url(#h)"/>
      <ellipse ${HEAD} fill="none" ${st()}/>
      ${front}
      ${face}
      ${extra}
    </g>`)
}

const INKS = [
  {
    id: 'ada',
    name: 'Ada',
    svg: ink({
      bg: '#F7C9B5',
      skin: INK_SKIN.light,
      shirt: PAPER,
      back: `<path d="M15.2 44V29C15.2 17.4 22.4 10.8 32 10.8S48.8 17.4 48.8 29v15z" fill="${INK}"/>`,
      front: `<path d="M18.4 27C18.8 18.6 24.4 14 32 14s13.2 4.6 13.6 13c-5.2-1-9.8-3.6-12.4-7.4-2.6 4-7.8 6.4-14.8 7.4z" fill="${INK}"/>`,
      face: inkEyes + inkNose + inkSmile + inkCheeks(),
    }),
  },
  {
    id: 'tobi',
    name: 'Tobi',
    svg: ink({
      bg: '#C6DCBC',
      skin: INK_SKIN.brown,
      shirt: '#F2B84B',
      front: `<g fill="${INK}"><ellipse cx="32" cy="19.4" rx="13.6" ry="7.4"/><circle cx="20.2" cy="22" r="4.4"/><circle cx="23.8" cy="16.2" r="4.4"/><circle cx="29.2" cy="13" r="4.4"/><circle cx="34.8" cy="13" r="4.4"/><circle cx="40.2" cy="16.2" r="4.4"/><circle cx="43.8" cy="22" r="4.4"/></g>`,
      face: inkEyes + inkNose + inkSmile + inkCheeks('#E0735A', 0.45),
    }),
  },
  {
    id: 'mei',
    name: 'Mei',
    svg: ink({
      bg: '#BDD5F6',
      skin: INK_SKIN.medium,
      shirt: PAPER,
      back: `<circle cx="32" cy="9.6" r="7" fill="${INK}"/>`,
      front: `<path d="M18.6 28C18 18.6 24 13.6 32 13.6S46 18.6 45.4 28C42 22.4 37.6 19.4 32 19.4S22 22.4 18.6 28z" fill="${INK}"/>`,
      face:
        inkEyes +
        inkNose +
        inkSmile +
        inkCheeks() +
        `<g fill="#fff" fill-opacity=".25" ${st(1.8)}><circle cx="27" cy="31.2" r="4.4"/><circle cx="37" cy="31.2" r="4.4"/></g><path d="M31.4 30.6q.6-.6 1.2 0" fill="none" ${st(1.6)}/>`,
    }),
  },
  {
    id: 'amara',
    name: 'Amara',
    svg: ink({
      bg: '#F6DC93',
      skin: INK_SKIN.deep,
      shirt: '#7C6CF0',
      back: `<path d="M12.6 52C9.6 41 13.8 35 13.8 27.4 13.8 16.4 22 10 32 10s18.2 6.4 18.2 17.4c0 7.6 4.2 13.6 1.2 24.6z" fill="${INK}"/>`,
      front: `<path d="M18.6 29.5C18 19 24.2 13.8 32 13.8S46 19 45.4 29.5C42.4 24 37 20.4 32 18.4 27 20.4 21.6 24 18.6 29.5z" fill="${INK}"/>`,
      face: inkShut + inkNose + inkSmile + inkCheeks('#E0735A', 0.5),
      extra: `<circle cx="18.8" cy="37.6" r="2.3" fill="none" stroke="#F2B84B" stroke-width="1.6"/>`,
    }),
  },
  {
    id: 'ravi',
    name: 'Ravi',
    svg: ink({
      bg: '#D7C9F4',
      skin: INK_SKIN.tan,
      shirt: '#2F9E86',
      front:
        `<path d="M18.6 27C18.2 17.6 24 12.6 32 12.6s13.8 5 13.4 14.4c-2.8-4-6.6-5.8-13.4-5.8S21.4 23 18.6 27z" fill="${INK}"/>` +
        `<path d="M18.8 32.4c0 9.2 5.6 13.6 13.2 13.6S45.2 41.6 45.2 32.4c-2 3-4.2 4.4-6.2 4.6-1.6-1.6-4-2.4-7-2.4s-5.4.8-7 2.4c-2-.2-4.2-1.6-6.2-4.6z" fill="${INK}"/>`,
      face: inkEyes + inkNose + `<path d="M29.2 40.2q2.8 1.8 5.6 0" fill="none" stroke="${INK_SKIN.tan[0]}" stroke-width="1.7" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'finn',
    name: 'Finn',
    svg: ink({
      bg: '#A9DCCB',
      skin: INK_SKIN.light,
      shirt: '#2B2838',
      front:
        `<path d="M18.6 27.6c-.8 3.2-.2 5.4 1 7l1.8-7z M45.4 27.6c.8 3.2.2 5.4-1 7l-1.8-7z" fill="${INK}"/>` +
        `<path d="M17.6 25C17.6 14.4 24.2 9.2 32 9.2S46.4 14.4 46.4 25z" fill="#E8604A" ${st()}/>` +
        `<rect x="16" y="21.6" width="32" height="6.6" rx="3.3" fill="#E8604A" ${st()}/>` +
        `<circle cx="32" cy="8.4" r="3.4" fill="${PAPER}" ${st()}/>`,
      face: inkEyes + inkNose + inkOpen + inkCheeks(),
    }),
  },
]

/* ─────────────────────────────────────────────────────────────────────
   C · ORBS: glossy gradient spheres with tiny faces. Same light rig on
   every orb: key light upper left, warm bounce from below, soft rim.
   ───────────────────────────────────────────────────────────────────── */

function orb({ c, bounce, inkc, face }) {
  const eye = (x) =>
    `<ellipse cx="${x}" cy="34" rx="2.6" ry="3.5" fill="${inkc}"/><circle cx="${x + 0.9}" cy="32.6" r=".9" fill="#fff"/>`
  const arcUp = (x) =>
    `<path d="M${x - 2.8} 35.2q2.8-3.6 5.6 0" fill="none" stroke="${inkc}" stroke-width="2.2" stroke-linecap="round"/>`
  const arcDown = (x) =>
    `<path d="M${x - 2.8} 33.4q2.8 3 5.6 0" fill="none" stroke="${inkc}" stroke-width="2.2" stroke-linecap="round"/>`
  const smile = `<path d="M27.6 41.4q4.4 3.8 8.8 0" fill="none" stroke="${inkc}" stroke-width="2.2" stroke-linecap="round"/>`
  const parts = {
    eyes: eye(25) + eye(39),
    happy: arcUp(25) + arcUp(39),
    calm: arcDown(25) + arcDown(39),
    wink: eye(25) + arcUp(39),
    smile,
    small: `<path d="M29.4 41.4q2.6 2 5.2 0" fill="none" stroke="${inkc}" stroke-width="2.2" stroke-linecap="round"/>`,
    grin: `<path d="M26.8 39.6h10.4q0 6-5.2 6t-5.2-6z" fill="${inkc}"/><path d="M29.4 44.2q2.6-2 5.2 0q-1.3 1.4-2.6 1.4t-2.6-1.4z" fill="#FF7E7E"/>`,
    o: `<ellipse cx="32" cy="42.4" rx="2.5" ry="2.9" fill="${inkc}"/>`,
    blush: `<ellipse cx="19.6" cy="40.2" rx="3.4" ry="2" fill="#fff" opacity=".28"/><ellipse cx="44.4" cy="40.2" rx="3.4" ry="2" fill="#fff" opacity=".28"/>`,
  }
  return svg(`
    <defs>
      <radialGradient id="b" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="${c[0]}"/><stop offset=".5" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>
      <radialGradient id="r" cx=".72" cy="1.02" r=".62"><stop offset="0" stop-color="${bounce}" stop-opacity=".8"/><stop offset="1" stop-color="${bounce}" stop-opacity="0"/></radialGradient>
      <radialGradient id="s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="32" cy="32" r="32" fill="url(#b)"/>
    <circle cx="32" cy="32" r="32" fill="url(#r)"/>
    <ellipse cx="21" cy="16" rx="11" ry="6.8" transform="rotate(-32 21 16)" fill="url(#s)"/>
    <circle cx="32" cy="32" r="31.4" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.2"/>
    ${face.map((k) => parts[k]).join('')}`)
}

const ORBS = [
  { id: 'ember', name: 'Ember', svg: orb({ c: ['#FFC6AE', '#FF7A6B', '#C2366E'], bounce: '#FFB86B', inkc: '#4A0F2A', face: ['eyes', 'smile', 'blush'] }) },
  { id: 'mint', name: 'Mint', svg: orb({ c: ['#D8FFEC', '#5FD8AE', '#1C8C7E'], bounce: '#C4F06A', inkc: '#08392F', face: ['happy', 'smile', 'blush'] }) },
  { id: 'iris', name: 'Iris', svg: orb({ c: ['#DCDFFF', '#7C86FF', '#3B32B8'], bounce: '#E38CFF', inkc: '#140D45', face: ['wink', 'smile'] }) },
  { id: 'sol', name: 'Sol', svg: orb({ c: ['#FFF3BF', '#FFC24A', '#E8762A'], bounce: '#FF7A6B', inkc: '#4A2207', face: ['eyes', 'grin'] }) },
  { id: 'bloom', name: 'Bloom', svg: orb({ c: ['#FFDAF5', '#F08ADB', '#9446C9'], bounce: '#FFB0C8', inkc: '#3A0F45', face: ['eyes', 'o', 'blush'] }) },
  { id: 'tide', name: 'Tide', svg: orb({ c: ['#CDF5FF', '#4CC3F0', '#1F62C7'], bounce: '#7CF0E0', inkc: '#06264D', face: ['calm', 'small'] }) },
]

export const DIRECTIONS = [
  {
    key: 'clay',
    letter: 'A',
    title: 'Clay',
    line: 'Soft 3D characters: one key light, warm skin gradients, glossy eyes, a contact shadow under the chin. Friendly and premium, like Memoji drawn as vectors.',
    notes: ['Most personality per pixel', 'Skin-tone range built in', 'Gradients carry the 3D, so it holds up at 24 px'],
    avatars: CLAY,
  },
  {
    key: 'ink',
    letter: 'B',
    title: 'Ink',
    line: 'Flat editorial portraits: one ink colour for every line and all hair, flat fills, a single offset shade on each face. Calm and grown-up, in the Notion and Micah family.',
    notes: ['Quietest and most "product"', 'Works like a pen illustration on paper', 'Line weight softens at 24 px'],
    avatars: INKS,
  },
  {
    key: 'orbs',
    letter: 'C',
    title: 'Orbs',
    line: 'Glossy gradient spheres with tiny faces: one shared light rig, key light upper left, warm bounce from below. Abstract like Arc or Linear, with a wink of personality.',
    notes: ['Reads best at small sizes', 'No skin or gender to represent', 'Identity comes from colour and expression'],
    avatars: ORBS,
  },
]

/**
 * The NexoraGuru avatar set: 16 hand-drawn "Clay" characters.
 *
 * Every avatar is a fixed 64x64 SVG. The helpers here only share the
 * scaffolding (background, shoulders, neck, head, face) so the whole set keeps
 * one light rig (key light upper left), one set of proportions and one
 * palette. Nothing is random; edit a character by editing its entry.
 *
 * Built into client/public/avatars/<id>.svg by build-set.mjs. The id list
 * must match client/src/lib/avatar.ts and src/avatar-set.js (a test checks).
 */

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body.replace(/\s*\n\s*/g, '')}</svg>`

/* Palette ─────────────────────────────────────────────────────────── */

// Skin: highlight, base, shade.
const SKIN = {
  porcelain: ['#FFE7D8', '#F5C6AA', '#DB9F82'],
  sand: ['#F9D5B3', '#E8B28A', '#C78C64'],
  honey: ['#EEC092', '#D49C69', '#AE7647'],
  bronze: ['#CB9165', '#A86E45', '#82502E'],
  cocoa: ['#A06C4B', '#7A4A2E', '#57311C'],
}

// Backgrounds: light centre, deeper edge. Eight families, each used twice.
const BG = {
  peach: ['#FFDCCB', '#F2A486'],
  mint: ['#D2F2E1', '#82CCA9'],
  butter: ['#FFF2C6', '#F2C95E'],
  sky: ['#D7E8FF', '#88B1F0'],
  lilac: ['#EEE1FF', '#B394EE'],
  sage: ['#E0EED4', '#A2C78A'],
  rose: ['#FFDDE6', '#F09AB4'],
  aqua: ['#D0F3F5', '#6FC6CF'],
}

const SHIRT = {
  teal: ['#6FD0C3', '#2C8A80'],
  mustard: ['#FFD978', '#E59E35'],
  lavender: ['#A38FEF', '#6248C6'],
  indigo: ['#7884F5', '#3B44BE'],
  coral: ['#FFA382', '#E35B45'],
  navy: ['#5A6BA0', '#252F58'],
  plum: ['#D58BC0', '#8E3D7C'],
  cream: ['#FBF7EF', '#D3CABA'],
  pink: ['#FF9DB0', '#DB4E6E'],
  green: ['#8AD496', '#3E8F55'],
  orange: ['#FFB574', '#E5762A'],
}

const HAIR = {
  brown: ['#6A4434', '#2E1B15'],
  black: ['#3E3744', '#141118'],
  coily: ['#46342E', '#16100E'],
  deep: ['#46322C', '#140C0A'],
  ginger: ['#F4A05C', '#BD551C'],
  blonde: ['#F7DA92', '#D39E3C'],
  chestnut: ['#94603E', '#4E2E1C'],
  walnut: ['#4E382C', '#1E130E'],
}

/* Face ────────────────────────────────────────────────────────────── */

const EYE = '#2A1A14'
const MOUTH = '#5A2419'
const eyes = ({ l = 'open', r = 'open' } = {}) => {
  const open = (x) =>
    `<ellipse cx="${x}" cy="32" rx="1.95" ry="2.35" fill="${EYE}"/><circle cx="${x + 0.65}" cy="31.15" r=".65" fill="#fff"/>`
  const shut = (x) =>
    `<path d="M${x - 2.1} 32.7q2.1-2.6 4.2 0" fill="none" stroke="${EYE}" stroke-width="1.5" stroke-linecap="round"/>`
  return (l === 'shut' ? shut(26.5) : open(26.5)) + (r === 'shut' ? shut(37.5) : open(37.5))
}
const smile = (c = MOUTH) =>
  `<path d="M28.6 37.7q3.4 3 6.8 0" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`
const grin = `<path d="M28 36.8h8q0 4.6-4 4.6t-4-4.6z" fill="${MOUTH}"/><path d="M30 40.2q2-1.5 4 0q-1 1.2-2 1.2t-2-1.2z" fill="#E8706A"/>`
const blush = (o = 0.3) =>
  `<ellipse cx="22.4" cy="36.4" rx="2.7" ry="1.6" fill="#FF6F61" opacity="${o}"/><ellipse cx="41.6" cy="36.4" rx="2.7" ry="1.6" fill="#FF6F61" opacity="${o}"/>`
const freckles = (c) =>
  `<g fill="${c}" opacity=".7"><circle cx="23.2" cy="34.6" r=".55"/><circle cx="24.8" cy="35.8" r=".55"/><circle cx="22.4" cy="36.2" r=".55"/><circle cx="40.8" cy="34.6" r=".55"/><circle cx="39.2" cy="35.8" r=".55"/><circle cx="41.6" cy="36.2" r=".55"/></g>`
const shine = (d, o = 0.38) =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="1.4" stroke-linecap="round"/>`
const grad = (id, [a, b]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const hoops = `<g fill="none" stroke="#FFD36E" stroke-width="1.3"><circle cx="17.4" cy="37.6" r="1.9"/><circle cx="46.6" cy="37.6" r="1.9"/></g>`

/* Scaffold ────────────────────────────────────────────────────────── */

function clay({ bg, skin, hair = HAIR.black, shirt, defs = '', back = '', over = '', front = '', face, extra = '', head, ears = true }) {
  const [hi, base, shade] = skin
  return svg(`
    <defs>
      <radialGradient id="bg" cx=".3" cy=".22" r=".95"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
      <radialGradient id="sk" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
      <radialGradient id="sh" cx=".35" cy=".05" r="1.05"><stop offset="0" stop-color="${shirt[0]}"/><stop offset="1" stop-color="${shirt[1]}"/></radialGradient>
      ${grad('hr', hair)}
      ${defs}
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

/* The set ─────────────────────────────────────────────────────────── */

const AVATARS = [
  {
    id: 'mira',
    name: 'Mira',
    svg: clay({
      bg: BG.peach,
      skin: SKIN.sand,
      hair: HAIR.brown,
      shirt: SHIRT.teal,
      back: `<rect x="14.4" y="11" width="35.2" height="34.5" rx="14.5" fill="url(#hr)"/>`,
      front:
        `<path d="M17.4 29.5C16.6 19 22.8 13 32 13s15.4 6 14.6 16.5c-3.6-2.4-7.6-6.4-9.4-10.2C33.6 24 25.6 27.4 17.4 29.5z" fill="url(#hr)"/>` +
        shine('M22.4 17.6q4-3 9-3.3'),
      face: eyes() + smile() + blush(),
    }),
  },
  {
    id: 'kai',
    name: 'Kai',
    svg: clay({
      bg: BG.mint,
      skin: SKIN.bronze,
      hair: HAIR.coily,
      shirt: SHIRT.mustard,
      front:
        `<g fill="url(#hr)"><ellipse cx="32" cy="19.6" rx="14" ry="7.6"/><circle cx="20" cy="22" r="4.6"/><circle cx="23.6" cy="16" r="4.6"/><circle cx="29" cy="12.8" r="4.6"/><circle cx="35" cy="12.8" r="4.6"/><circle cx="40.4" cy="16" r="4.6"/><circle cx="44" cy="22" r="4.6"/><circle cx="18.6" cy="26.4" r="3.2"/><circle cx="45.4" cy="26.4" r="3.2"/></g>` +
        shine('M26.4 11.2q2.6-1.4 5.2-.4', 0.3) +
        shine('M37.8 12.6q2.4.2 4 2', 0.3),
      face: eyes() + grin + blush(0.26),
    }),
  },
  {
    id: 'noor',
    name: 'Noor',
    svg: clay({
      bg: BG.butter,
      skin: SKIN.honey,
      shirt: SHIRT.lavender,
      ears: false,
      defs: grad('hj', ['#C9B8FA', '#7A60D6']),
      over:
        `<path d="M13.5 33C13.5 19 21.5 10.5 32 10.5S50.5 19 50.5 33c0 9-2 14 3 21-6 5-13.5 6.5-21.5 6.5S16.5 59 10.5 54c5-7 3-12 3-21z" fill="url(#hj)"/>` +
        `<path d="M19.5 43q12.5 9 25 0" fill="none" stroke="#4B3497" stroke-opacity=".28" stroke-width="1.6" stroke-linecap="round"/>`,
      head: `<ellipse cx="32" cy="31" rx="12.6" ry="14.2" fill="url(#sk)"/>`,
      front:
        `<path d="M19.2 28C20.2 19.8 25.4 15.4 32 15.4S43.8 19.8 44.8 28C41.2 23 36.8 20.8 32 20.8S22.8 23 19.2 28z" fill="url(#hj)"/>` +
        shine('M20.6 17q4.4-4.6 11.4-5', 0.42),
      face: eyes({ l: 'shut', r: 'shut' }) + smile() + blush(0.3),
    }),
  },
  {
    id: 'arjun',
    name: 'Arjun',
    svg: clay({
      bg: BG.sky,
      skin: ['#E9B88A', '#CB905F', '#A46B3F'],
      hair: HAIR.black,
      shirt: SHIRT.indigo,
      front:
        `<path d="M17.2 30C15.6 18.4 22.4 11 32.6 11 43 11 49.2 18.6 46.8 30c-1-3.8-2.8-6.8-5.6-8.8-6.6 1.4-14.4.6-19.6-3.2-2 3.4-3.6 7.2-4.4 12z" fill="url(#hr)"/>` +
        shine('M36 13.4q5 1 8 4.6'),
      face:
        eyes() +
        smile() +
        blush(0.22) +
        `<g fill="none" stroke="#24212B" stroke-width="1.45"><circle cx="26.5" cy="32" r="4.5"/><circle cx="37.5" cy="32" r="4.5"/><path d="M31 31.4q1-.8 2 0"/><path d="M22 31.2l-3.8-1M42 31.2l3.8-1"/></g>` +
        `<path d="M23.6 30.6q.7-1.8 2.5-2.3" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'zara',
    name: 'Zara',
    svg: clay({
      bg: BG.lilac,
      skin: SKIN.cocoa,
      hair: HAIR.deep,
      shirt: SHIRT.coral,
      back: `<g fill="url(#hr)"><circle cx="32" cy="23" r="17.5"/><circle cx="17.5" cy="20" r="7.5"/><circle cx="46.5" cy="20" r="7.5"/><circle cx="24" cy="10.5" r="8"/><circle cx="40" cy="10.5" r="8"/><circle cx="32" cy="7.5" r="8"/><circle cx="15.4" cy="29" r="5.6"/><circle cx="48.6" cy="29" r="5.6"/></g>`,
      front:
        `<path d="M17.6 28.5C17.8 20 24 15.8 32 15.8S46.2 20 46.4 28.5C42.4 23.6 37.6 21.4 32 21.4S21.6 23.6 17.6 28.5z" fill="url(#hr)"/>` +
        shine('M20.4 9.6q4.4-4.2 10-4.4', 0.28),
      face: eyes({ r: 'shut' }) + smile('#2A0F08') + blush(0.3),
      extra: `<circle cx="17.4" cy="36.8" r="1.7" fill="#FFD36E"/><circle cx="46.6" cy="36.8" r="1.7" fill="#FFD36E"/>`,
    }),
  },
  {
    id: 'leo',
    name: 'Leo',
    svg: clay({
      bg: BG.sage,
      skin: SKIN.porcelain,
      hair: HAIR.ginger,
      shirt: SHIRT.navy,
      front:
        `<path d="M17 29C15 19 21 12 30 11.5c3-2.5 8-2.5 11-.5-2 .5-3 1.3-3.5 2C44 14 48.5 20 47 29c-2-5-5-8-9-9.5-1 2.5-4 4-8 3.5 1-1.5 1.3-2.5 1-3.5-4 2.5-9 3.5-12 3.5-1 2-1.5 4-2 6z" fill="url(#hr)"/>` +
        shine('M33 12.6q4-.4 7 1.6', 0.42),
      face: eyes() + grin + blush(0.32) + freckles('#C27A55'),
    }),
  },
  {
    id: 'sana',
    name: 'Sana',
    svg: clay({
      bg: BG.rose,
      skin: SKIN.sand,
      hair: HAIR.black,
      shirt: SHIRT.plum,
      back: `<path d="M14 42V28C14 17 22 11 32 11s18 6 18 17v14q0 4-4 4H18q-4 0-4-4z" fill="url(#hr)"/>`,
      over: `<path d="M14.4 30c-.6 9 .2 16 1.6 22.4q3.4 2 6.6 0c-1.4-7.4-2-14.6-1.8-22.4zM49.6 30c.6 9-.2 16-1.6 22.4q-3.4 2-6.6 0c1.4-7.4 2-14.6 1.8-22.4z" fill="url(#hr)"/>`,
      front:
        `<path d="M17.4 30C16.8 19.4 23.4 13.4 32 13.4S47.2 19.4 46.6 30C44 24 39.4 20 32 17.4 24.6 20 20 24 17.4 30z" fill="url(#hr)"/>` +
        shine('M35.4 14.4q6 1.4 8.6 6.4'),
      face: eyes() + smile() + blush(),
    }),
  },
  {
    id: 'dev',
    name: 'Dev',
    svg: clay({
      bg: BG.aqua,
      skin: SKIN.bronze,
      hair: HAIR.black,
      shirt: SHIRT.cream,
      defs: grad('cp', ['#FF967A', '#D9493A']),
      front:
        `<path d="M17.4 30.4c-.6-3.2-.2-6 .8-8.2l3.4.6c-1.2 2.4-1.8 4.8-1.8 7.6zM46.6 30.4c.6-3.2.2-6-.8-8.2l-3.4.6c1.2 2.4 1.8 4.8 1.8 7.6z" fill="url(#hr)"/>` +
        `<path d="M16.6 25C16.6 15 23.4 9.4 32 9.4S47.4 15 47.4 25z" fill="url(#cp)"/>` +
        `<path d="M32 9.6V24.4" stroke="#8E2A20" stroke-opacity=".3" stroke-width="1"/>` +
        `<circle cx="32" cy="9.8" r="1.5" fill="#B83A2E"/>` +
        `<path d="M15.6 23.8h32.8c3 0 3.8 3.8.6 4.4-5.4 1-11 1.6-17 1.6s-11.6-.6-17-1.6c-3.2-.6-2.4-4.4.6-4.4z" fill="#B83A2E"/>` +
        shine('M21.6 15.6q4.4-4 10-4.2', 0.45),
      face: eyes() + grin + blush(0.24),
    }),
  },
  {
    id: 'ivy',
    name: 'Ivy',
    svg: clay({
      bg: BG.sky,
      skin: SKIN.porcelain,
      hair: HAIR.blonde,
      shirt: SHIRT.pink,
      back: `<path d="M42 13.6c7-4.2 14.6-.2 14.6 8.4 0 7-4 11.6-3.4 18-4.4-3.2-6.6-8-6.6-13.2 0-3.4-1.8-6.4-4.6-8.6z" fill="url(#hr)"/>`,
      front:
        `<path d="M17.4 28.6C17 19 23.4 13 32 13s15 6 14.6 15.6C43 22 37.6 18.6 32 18.6s-11 3.2-14.6 10z" fill="url(#hr)"/>` +
        `<circle cx="44" cy="15" r="2.3" fill="#FF7A9A"/>` +
        shine('M21.8 17.6q4.4-3.4 10-3.6', 0.5),
      face: eyes({ r: 'shut' }) + smile() + blush(0.34),
    }),
  },
  {
    id: 'omar',
    name: 'Omar',
    svg: clay({
      bg: BG.butter,
      skin: SKIN.cocoa,
      hair: HAIR.deep,
      shirt: SHIRT.teal,
      front:
        `<path d="M17.6 26.6C17.6 17.4 24 12.4 32 12.4s14.4 5 14.4 14.2c-2.6-3.6-6.6-5.4-14.4-5.4s-11.8 1.8-14.4 5.4z" fill="url(#hr)"/>` +
        `<path d="M17.6 31c0 9.4 6.2 15 14.4 15s14.4-5.6 14.4-15c-1.6 3.2-3.6 5.6-6 6.4-1.8-1.8-4.6-2.8-8.4-2.8s-6.6 1-8.4 2.8c-2.4-.8-4.4-3.2-6-6.4z" fill="url(#hr)"/>` +
        shine('M23.4 14.4q4-1.6 8.6-1.4', 0.28),
      face: eyes() + smile('#C99172'),
    }),
  },
  {
    id: 'hana',
    name: 'Hana',
    svg: clay({
      bg: BG.aqua,
      skin: SKIN.sand,
      hair: HAIR.black,
      shirt: SHIRT.mustard,
      back: `<circle cx="32" cy="10.4" r="6.6" fill="url(#hr)"/><rect x="15" y="12" width="34" height="28" rx="13" fill="url(#hr)"/>`,
      front:
        `<path d="M17.4 28.2C16.8 19 23.4 13.2 32 13.2S47.2 19 46.6 28.2c-4-1.4-9-2.2-14.6-2.2s-10.6.8-14.6 2.2z" fill="url(#hr)"/>` +
        `<rect x="27.6" y="14.6" width="8.8" height="2.6" rx="1.3" fill="#FF8A6E"/>` +
        shine('M28.6 6.6q3.4-1.2 6 .6', 0.4),
      face: eyes({ l: 'shut', r: 'shut' }) + smile() + blush(0.34),
    }),
  },
  {
    id: 'ravi',
    name: 'Ravi',
    svg: clay({
      bg: BG.mint,
      skin: SKIN.honey,
      hair: HAIR.walnut,
      shirt: SHIRT.navy,
      defs: grad('hp', ['#FF9C84', '#DE4F3E']),
      front:
        `<path d="M17.4 29C16 19 22 12 31 12c2-1.6 6-1.8 8.4-.2C45 13.4 48.6 20 46.6 29c-1.6-3.4-3.6-6-6.4-7.4-1.4 1.4-3.6 2-6 1.6 1-.8 1.4-1.8 1.4-2.8-3 2-8 3-11.8 2.6-2.4 1.6-4.2 4-6.4 6z" fill="url(#hr)"/>` +
        `<path d="M15.2 30.4C15.2 16.8 22.6 9.2 32 9.2s16.8 7.6 16.8 21.2" fill="none" stroke="#2B2838" stroke-width="2.6" stroke-linecap="round"/>` +
        `<rect x="12" y="26.8" width="7.2" height="11.6" rx="3.6" fill="url(#hp)"/><rect x="44.8" y="26.8" width="7.2" height="11.6" rx="3.6" fill="url(#hp)"/>` +
        shine('M13.8 29.4v4', 0.5) +
        shine('M46.6 29.4v4', 0.5),
      face: eyes() + smile() + blush(0.24),
    }),
  },
  {
    id: 'ama',
    name: 'Ama',
    svg: clay({
      bg: BG.rose,
      skin: SKIN.cocoa,
      shirt: SHIRT.lavender,
      defs: grad('wr', ['#FFCB62', '#E5822A']),
      front:
        `<path d="M15.8 27.4C14 15.6 21.2 6.6 32 6.6s18 9 16.2 20.8C44.8 23 39 21 32 21s-12.8 2-16.2 6.4z" fill="url(#wr)"/>` +
        `<path d="M25.8 8.4c2.4-5 10-5 12.4 0-1.8 2.4-3.8 3.4-6.2 3.4s-4.4-1-6.2-3.4z" fill="#D5711F"/>` +
        `<path d="M18.6 22q13.4-9 26.8 0" fill="none" stroke="#B8561A" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>` +
        `<g fill="#fff" opacity=".55"><circle cx="22" cy="16" r=".9"/><circle cx="28" cy="13.4" r=".9"/><circle cx="36" cy="13.4" r=".9"/><circle cx="42" cy="16" r=".9"/><circle cx="25" cy="19.4" r=".9"/><circle cx="32" cy="17.6" r=".9"/><circle cx="39" cy="19.4" r=".9"/></g>`,
      face: eyes() + smile('#2A0F08') + blush(0.3),
      extra: hoops,
    }),
  },
  {
    id: 'theo',
    name: 'Theo',
    svg: clay({
      bg: BG.peach,
      skin: SKIN.porcelain,
      hair: HAIR.chestnut,
      shirt: SHIRT.cream,
      defs: grad('bn', ['#6FD0C3', '#2C8A80']),
      front:
        `<path d="M17.4 30.4c-.6-3.6-.2-6.4.8-8.6l4.4.4c-1.6 2.6-2.6 5-3 8.2zM46.6 30.4c.6-3.6.2-6.4-.8-8.6l-4.4.4c1.6 2.6 2.6 5 3 8.2z" fill="url(#hr)"/>` +
        `<path d="M16.4 24.6C16.4 14 23.2 8.4 32 8.4S47.6 14 47.6 24.6z" fill="url(#bn)"/>` +
        `<rect x="15.2" y="21.4" width="33.6" height="7.2" rx="3.6" fill="#2A8278"/>` +
        `<path d="M20 22.6v5M24 22.4v5.6M28 22.2v6M32 22.2v6M36 22.2v6M40 22.4v5.6M44 22.6v5" stroke="#000" stroke-opacity=".14" stroke-width="1"/>` +
        `<circle cx="32" cy="8.2" r="3.8" fill="#F4F1EA"/>` +
        shine('M21.4 15q4.4-3.8 9.6-4', 0.42),
      face: eyes() + smile() + blush(0.32),
    }),
  },
  {
    id: 'lina',
    name: 'Lina',
    svg: clay({
      bg: BG.sage,
      skin: SKIN.honey,
      hair: HAIR.chestnut,
      shirt: SHIRT.orange,
      back: `<path d="M14 40V27C14 16.6 22 10.6 32 10.6S50 16.6 50 27v13c0 3.6-2.6 6-5.6 6-2 0-3-1-4-2.4H23.6c-1 1.4-2 2.4-4 2.4-3 0-5.6-2.4-5.6-6z" fill="url(#hr)"/>`,
      front:
        `<path d="M17.4 29.4C16.6 19 23 12.8 32 12.8c8.4 0 14.6 5.4 14.8 14.4-3.2-4.6-8-7.2-13.4-7.6-2.6 4.6-8.4 8-16 9.8z" fill="url(#hr)"/>` +
        shine('M33 14.6q6.4.6 10 5', 0.38),
      face: eyes() + smile() + blush(0.28) + freckles('#9C6440'),
    }),
  },
  {
    id: 'jay',
    name: 'Jay',
    svg: clay({
      bg: BG.lilac,
      skin: SKIN.bronze,
      hair: HAIR.black,
      shirt: SHIRT.green,
      front:
        `<path d="M17.2 28C16.4 18 21.4 11 32 11s15.6 7 14.8 17c-1.6-2.6-3.6-4.6-6.2-5.6-5.4 1.2-12.2 1.2-17.2 0-2.6 1-4.6 3-6.2 5.6z" fill="url(#hr)"/>` +
        shine('M22.4 13.4q5-1.8 10.4-1.4', 0.3),
      face:
        eyes() +
        smile() +
        blush(0.22) +
        `<g fill="none" stroke="#1F1C24" stroke-width="1.45"><rect x="21.4" y="28.4" width="10" height="7.4" rx="2.6"/><rect x="32.6" y="28.4" width="10" height="7.4" rx="2.6"/><path d="M31.4 31h1.2M21.4 30.4l-3.4-.8M42.6 30.4l3.4-.8"/></g>` +
        `<path d="M23 30.8l2.4-1.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>`,
    }),
  },
]

export const AVATAR_SET = AVATARS

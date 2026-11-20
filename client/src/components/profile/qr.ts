/*
 * Minimal QR Code encoder (byte mode, error correction level M or H,
 * versions 1–10 → up to 213 bytes at M and 119 at H, plenty for a profile
 * URL). Level H survives about 30% damage, which is what lets the styled
 * code carry the NexoraGuru mark in its centre. Follows the structure of
 * Project Nayuki's reference implementation, trimmed to what we need.
 * Returns a square matrix of booleans (true = dark module).
 */

export type QrLevel = 'M' | 'Q' | 'H'
// Per version 1–10 (index 0 unused), from the QR specification.
const ECC: Record<QrLevel, { perBlock: number[]; blocks: number[]; format: number }> = {
  M: { perBlock: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], blocks: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5], format: 0 },
  Q: { perBlock: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24], blocks: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8], format: 3 },
  H: { perBlock: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28], blocks: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8], format: 2 },
}

function rawDataModules(ver: number): number {
  let r = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2
    r -= (25 * n - 10) * n - 55
    if (ver >= 7) r -= 36
  }
  return r
}
const dataCodewords = (ver: number, lv: QrLevel) => Math.floor(rawDataModules(ver) / 8) - ECC[lv].perBlock[ver] * ECC[lv].blocks[ver]

function gfMul(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}
function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)))
  }
  return result
}

function alignmentPositions(ver: number, size: number): number[] {
  if (ver === 1) return []
  const n = Math.floor(ver / 7) + 2
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2
  const out = [6]
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos)
  return out
}

export function encodeQr(text: string, level: QrLevel = 'M'): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text))
  let ver = 1
  for (; ver <= 10; ver++) {
    const ccBits = ver <= 9 ? 8 : 16
    if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver, level) * 8) break
  }
  if (ver > 10) throw new Error('Text too long for QR')
  const ccBits = ver <= 9 ? 8 : 16

  // Bit stream: mode, length, data, terminator, padding.
  const bits: number[] = []
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, ccBits)
  bytes.forEach((b) => push(b, 8))
  const capacity = dataCodewords(ver, level) * 8
  push(0, Math.min(4, capacity - bits.length))
  push(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8)
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0))

  // Split into blocks, add ECC, interleave.
  const numBlocks = ECC[level].blocks[ver]
  const eccLen = ECC[level].perBlock[ver]
  const rawCodewords = Math.floor(rawDataModules(ver) / 8)
  const numShort = numBlocks - (rawCodewords % numBlocks)
  const shortLen = Math.floor(rawCodewords / numBlocks)
  const divisor = rsDivisor(eccLen)
  const blocks: number[][] = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, divisor)
    if (i < numShort) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const codewords: number[] = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((b, j) => {
      if (i !== shortLen - eccLen || j >= numShort) codewords.push(b[i])
    })
  }

  // Matrix with function patterns.
  const size = ver * 4 + 17
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (x: number, y: number, dark: boolean) => {
    mod[y][x] = dark
    fn[y][x] = true
  }
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0)
    set(i, 6, i % 2 === 0)
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        const x = cx + dx
        const y = cy + dy
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4)
      }
  }
  finder(3, 3)
  finder(size - 4, 3)
  finder(3, size - 4)
  const al = alignmentPositions(ver, size)
  al.forEach((ax, i) =>
    al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }),
  )
  const drawFormat = (mask: number) => {
    const d = (ECC[level].format << 3) | mask
    let rem = d
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const b = ((d << 10) | rem) ^ 0x5412
    const bit = (i: number) => ((b >>> i) & 1) !== 0
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6))
    set(8, 8, bit(7))
    set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true)
  }
  drawFormat(0)
  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const b = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) !== 0
      const a = size - 11 + (i % 3)
      const c = Math.floor(i / 3)
      set(a, c, dark)
      set(c, a, dark)
    }
  }

  // Data, zig-zag.
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!fn[y][x] && i < codewords.length * 8) {
          mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0
          i++
        }
      }
    }
  }

  // Pick the mask with the lowest (simplified) penalty.
  const MASKS: ((x: number, y: number) => boolean)[] = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ]
  const apply = (m: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]
  }
  const penalty = () => {
    let p = 0
    let dark = 0
    for (let y = 0; y < size; y++) {
      let runX = 1
      let runY = 1
      for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++
        if (x > 0) {
          runX = mod[y][x] === mod[y][x - 1] ? runX + 1 : 1
          if (runX === 5) p += 3
          else if (runX > 5) p++
          runY = mod[x][y] === mod[x - 1][y] ? runY + 1 : 1
          if (runY === 5) p += 3
          else if (runY > 5) p++
        }
        if (x > 0 && y > 0) {
          const c = mod[y][x]
          if (c === mod[y][x - 1] && c === mod[y - 1][x] && c === mod[y - 1][x - 1]) p += 3
        }
      }
    }
    const total = size * size
    p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
    return p
  }
  let best = 0
  let bestP = Infinity
  for (let m = 0; m < 8; m++) {
    apply(m)
    drawFormat(m)
    const p = penalty()
    if (p < bestP) {
      bestP = p
      best = m
    }
    apply(m) // undo (XOR)
  }
  apply(best)
  drawFormat(best)
  return mod
}

/** SVG path ("M x y h1 v1 h-1 z" per dark module) for a QR matrix with a quiet zone. */
export function qrPath(matrix: boolean[][], quiet = 2): { d: string; size: number } {
  let d = ''
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x + quiet} ${y + quiet}h1v1h-1z`
    }),
  )
  return { d, size: matrix.length + quiet * 2 }
}

/**
 * The QR drawn as a printed tag: rounded ink dots for data, rounded "eyes"
 * for the three finders, and a clear centre for the mark. Returns SVG markup
 * (viewBox in modules, quiet zone included); `centre` is the side of the
 * cleared square in modules (0 for none). Use level H when there's a centre.
 */
export function qrArt(matrix: boolean[][], { quiet = 3, ink = '#1C1B19', paper = '#FFFFFF', centre = 0, mark = '', eye: eyeInk = '' } = {}): { svg: string; size: number } {
  const n = matrix.length
  const size = n + quiet * 2
  const c0 = Math.floor((n - centre) / 2)
  const inCentre = (x: number, y: number) => centre > 0 && x >= c0 - 1 && x <= c0 + centre && y >= c0 - 1 && y <= c0 + centre
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
  let dots = ''
  let joins = ''
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark || inFinder(x, y) || inCentre(x, y)) return
      // Each dark module is a dot; runs are joined into strokes (a separate
      // path, so overlapping shapes can't cancel each other out).
      const r = 0.44
      dots += `M${x + quiet + 0.5 - r} ${y + quiet + 0.5}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
      if (row[x + 1] && !inFinder(x + 1, y) && !inCentre(x + 1, y)) joins += `M${x + quiet + 0.5} ${y + quiet + 0.5 - r}h1v${2 * r}h-1z`
      if (matrix[y + 1]?.[x] && !inFinder(x, y + 1) && !inCentre(x, y + 1)) joins += `M${x + quiet + 0.5 - r} ${y + quiet + 0.5}h${2 * r}v1h${-2 * r}z`
    }),
  )
  const eye = (fx: number, fy: number) => {
    const x = fx + quiet
    const y = fy + quiet
    return `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${ink}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="${eyeInk || ink}"/>`
  }
  const centreArt =
    centre > 0
      ? `<rect x="${c0 + quiet - 0.5}" y="${c0 + quiet - 0.5}" width="${centre + 1}" height="${centre + 1}" rx="${(centre + 1) * 0.24}" fill="${paper}"/>` +
        mark.replace('<svg ', `<svg x="${c0 + quiet + 0.35}" y="${c0 + quiet + 0.35}" width="${centre - 0.7}" height="${centre - 0.7}" `)
      : ''
  const svg = `<rect width="${size}" height="${size}" fill="${paper}"/><path d="${dots}" fill="${ink}"/><path d="${joins}" fill="${ink}"/>${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}${centreArt}`
  return { svg, size }
}

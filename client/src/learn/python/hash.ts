/** A short fingerprint of a code example (FNV-1a, 32 bits): a recorded output belongs to exactly this code and input. */
export function codeHash(code: string, stdin = ''): string {
  let h = 0x811c9dc5
  const s = `${code}\u0000${stdin}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/*
  Guru on the student's own device (docs/voice/BLUEPRINT.md §4.6): which size
  of model this device can run, from what the browser reports. Pure rules,
  tested in tests/voice-brain.test.js.

    L  Qwen3.5-4B   about 2.8 GB 16 GB laptops, good GPUs
    M  Qwen3.5-2B   about 1.4 GB 8 GB laptops, good phones
    S  Qwen3.5-0.8B about 470 MB 4–6 GB devices that pass the speed test (550 MB without fp16)
    —  no WebGPU, and iPhone/iPad Safari (it closes tabs above ~2 GB): the server

  A GPU is required. WebAssembly on the CPU was measured and is far too slow
  (the site isn't cross-origin isolated, so it gets one thread: well under one
  word a second), and its runtime lacks the 4-bit word-table operation.

  Base Qwen3.5 models (Apache-2.0) for now; our own fine-tuned "Guru S/M/L,
  built on Qwen3.5" replace them later (§5). Built from the official ONNX
  exports in onnx-community, 4-bit weights. The 2B and 4B exports also hold a
  picture encoder; the text-generation pipeline loads only the text parts.

  Dependency-free and type-strippable.
*/

export type TierId = 'S' | 'M' | 'L'

export interface Tier {
  id: TierId
  /** What students see. */
  name: string
  /** Hugging Face model id (ONNX export for transformers.js). */
  model: string
  /** 4-bit weights: with fp16 maths on a GPU that has it, else plain 4-bit. */
  dtypeF16: string
  dtypePlain: string
  /** Download, rounded, in MB: the fp16 build, and the plain one. */
  mb: number
  mbPlain: number
  /** Below this many tokens a second in the speed test, the tier is too slow here. */
  minTokensPerSec: number
}

export const TIERS: Record<TierId, Tier> = {
  L: { id: 'L', name: 'Guru L', model: 'onnx-community/Qwen3.5-4B-ONNX-OPT', dtypeF16: 'q4f16', dtypePlain: 'q4', mb: 2800, mbPlain: 3100, minTokensPerSec: 6 },
  M: { id: 'M', name: 'Guru M', model: 'onnx-community/Qwen3.5-2B-ONNX-OPT', dtypeF16: 'q4f16', dtypePlain: 'q4', mb: 1400, mbPlain: 1550, minTokensPerSec: 6 },
  S: { id: 'S', name: 'Guru S', model: 'onnx-community/Qwen3.5-0.8B-Text-ONNX', dtypeF16: 'q4f16', dtypePlain: 'q4', mb: 470, mbPlain: 550, minTokensPerSec: 5 },
}

/** What the browser tells us about this device (all optional: unknown counts as "no"). */
export interface DeviceInfo {
  /** navigator.gpu exists and an adapter was found. */
  webgpu: boolean
  /** The adapter has 'shader-f16'. */
  f16: boolean
  /** navigator.deviceMemory in GB (Chrome caps it at 8). */
  memoryGB?: number
  /** The adapter's maxBufferSize, bytes. */
  maxBufferBytes?: number
  /** iPhone or iPad (any browser there is Safari underneath). */
  ios?: boolean
  /** Tiers that crashed or were too slow on this device before. */
  failed?: TierId[]
}

const GB = 1024 ** 3

/**
 * The biggest tier this device should try, or null for "use the server".
 * `failed` steps down: a tier that crashed or was slow here is not tried again.
 */
export function pickTier(d: DeviceInfo): Tier | null {
  if (d.ios) return null
  const mem = d.memoryGB ?? 0
  const buf = d.maxBufferBytes ?? 0
  const failed = new Set(d.failed ?? [])
  const fits: TierId[] = []
  if (d.webgpu && d.f16) {
    // Chrome reports at most 8 GB, so "16 GB" shows as a GPU that takes large buffers.
    if (mem >= 8 && buf >= 2 * GB) fits.push('L')
    if (mem >= 8 && buf >= 1 * GB) fits.push('M')
    if (mem >= 4 || !d.memoryGB) fits.push('S')
  } else if (d.webgpu && (mem >= 4 || !d.memoryGB)) {
    // A GPU without fp16 (older laptops, many phones): the small model, plain 4-bit.
    fits.push('S')
  }
  // No WebGPU: the server (see the note at the top).
  const id = fits.find((t) => !failed.has(t))
  return id ? TIERS[id] : null
}

/** The next smaller tier, after a crash or a slow speed test. */
export function stepDown(t: TierId): TierId | null {
  return t === 'L' ? 'M' : t === 'M' ? 'S' : null
}

/** The build this device downloads: fp16 maths where the GPU has it. */
export const dtypeFor = (t: Tier, d: Pick<DeviceInfo, 'f16'>): string => (d.f16 ? t.dtypeF16 : t.dtypePlain)

/** The download for this tier on this device, in MB. */
export const downloadMb = (t: Tier, d: Pick<DeviceInfo, 'f16'>): number => (d.f16 ? t.mb : t.mbPlain)

/** Why this device uses the server, in plain words. */
export function unsupportedWhy(info: DeviceInfo): string {
  if (info.ios) return 'iPhone and iPad close big pages, so Guru answers from the server there.'
  if (!info.webgpu) return 'This browser can’t use the graphics chip, which Guru needs to answer quickly here, so Guru answers from the server. Chrome or Edge on a laptop usually can.'
  if (info.failed?.length) return 'Guru was too slow or couldn’t start on this device before, so Guru answers from the server.'
  return 'This device has too little memory for Guru on the device; Guru answers from the server.'
}

/** Tokens a second after the first one: the worker's `ms` starts at the first token, so the GPU's warm-up doesn't count. */
export function tokensPerSec(r: { tokens: number; ms: number }): number {
  const n = r.tokens - 1
  return n > 0 && r.ms > 0 ? (n / r.ms) * 1000 : 0
}

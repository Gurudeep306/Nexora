/* In-browser LLM engine (WebLLM / WebGPU) — the AI tutor's real model.
 *
 * Everything runs locally in the visitor's browser: no server, no API keys,
 * no third-party calls. The model weights download once (cached by the
 * browser afterwards) and generation happens on the GPU via WebGPU.
 *
 * The module is a singleton state machine:
 *   idle → loading (with progress) → ready
 *                                  → error (WebGPU missing / download failed)
 * Components subscribe via useSyncExternalStore-friendly listeners.
 */

export type EngineState = 'idle' | 'loading' | 'ready' | 'error'

export interface EngineModel {
  id: string
  label: string
  /** Approximate download / VRAM footprint in MB. */
  sizeMb: number
  hint: string
}

/** Curated from the WebLLM prebuilt registry (q4f16_1 quantisation). */
export const ENGINE_MODELS: EngineModel[] = [
  {
    id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 Coder 7B',
    sizeMb: 5107,
    hint: 'Best answers — strongest code & reasoning. ~5 GB download.',
  },
  {
    id: 'Phi-4-mini-instruct-q4f16_1-MLC',
    label: 'Phi-4 mini 3.8B',
    sizeMb: 3438,
    hint: 'Great balance of speed and quality. ~3.4 GB download.',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B',
    sizeMb: 2264,
    hint: 'Fast and light — good for slower machines. ~2.3 GB download.',
  },
  {
    id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 Coder 1.5B',
    sizeMb: 1630,
    hint: 'Fastest — modest hardware. ~1.6 GB download.',
  },
]

/** Sensible default: 3B-class models run well on almost any WebGPU device. */
export const DEFAULT_MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC'

const MODEL_STORAGE_KEY = 'nexora:llm:model'

export function savedModelId(): string {
  try {
    const v = localStorage.getItem(MODEL_STORAGE_KEY)
    if (v && ENGINE_MODELS.some((m) => m.id === v)) return v
  } catch {
    /* private mode */
  }
  return DEFAULT_MODEL_ID
}

export function rememberModelId(id: string) {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, id)
  } catch {
    /* non-fatal */
  }
}

export function webgpuSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

/* ------------------------------------------------------------------ */
/* Engine singleton                                                    */
/* ------------------------------------------------------------------ */

type ChatRole = 'system' | 'user' | 'assistant'
export interface ChatTurn {
  role: ChatRole
  content: string
}

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  /** Called with the full text so far on every streamed token batch. */
  onChunk?: (textSoFar: string) => void
  signal?: AbortSignal
}

interface EngineSnapshot {
  state: EngineState
  modelId: string | null
  /** 0..1 while loading. */
  progress: number
  progressText: string
  error: string | null
}

type EngineLike = {
  chat: {
    completions: {
      create: (req: unknown) => Promise<AsyncIterable<{ choices?: { delta?: { content?: string }; message?: { content?: string } }[] }>>
    }
  }
  unload?: () => Promise<void>
}

class LlmEngine {
  private snapshot: EngineSnapshot = {
    state: 'idle',
    modelId: null,
    progress: 0,
    progressText: '',
    error: null,
  }
  private engine: EngineLike | null = null
  private loadPromise: Promise<EngineLike> | null = null
  private listeners = new Set<() => void>()

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = (): EngineSnapshot => this.snapshot

  private set(patch: Partial<EngineSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((fn) => fn())
  }

  /** Load (or reuse) the model. Safe to call concurrently — shares one promise. */
  async load(modelId: string = savedModelId()): Promise<EngineLike> {
    if (this.engine && this.snapshot.modelId === modelId) return this.engine
    if (this.loadPromise && this.snapshot.modelId === modelId) return this.loadPromise

    if (!webgpuSupported()) {
      this.set({
        state: 'error',
        error:
          'This browser does not expose WebGPU, which the on-device model needs. Use a recent Chrome, Edge, or Safari 18+ on a device with a GPU.',
      })
      throw new Error('WebGPU unavailable')
    }

    // Switching models: unload the old one first.
    if (this.engine) {
      try {
        await this.engine.unload?.()
      } catch {
        /* best effort */
      }
      this.engine = null
      this.loadPromise = null
    }

    this.set({ state: 'loading', modelId, progress: 0, progressText: 'Initialising…', error: null })
    this.loadPromise = (async () => {
      const webllm = await import('@mlc-ai/web-llm')
      const engine = (await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (p: { progress: number; text: string }) => {
          this.set({ progress: p.progress, progressText: p.text })
        },
      })) as unknown as EngineLike
      this.engine = engine
      this.set({ state: 'ready', progress: 1, progressText: 'Model ready' })
      return engine
    })().catch((err: unknown) => {
      this.loadPromise = null
      this.set({
        state: 'error',
        error:
          err instanceof Error
            ? `Could not start the on-device model: ${err.message}`
            : 'Could not start the on-device model.',
      })
      throw err
    })
    return this.loadPromise
  }

  /** Streaming chat completion. Returns the full generated text. */
  async generate(messages: ChatTurn[], opts: GenerateOptions = {}): Promise<string> {
    const engine = this.engine ?? (await this.load())
    const stream = (await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 1024,
      stream_options: { include_usage: false },
    })) as AsyncIterable<{ choices?: { delta?: { content?: string } }[] }>

    let full = ''
    for await (const chunk of stream) {
      if (opts.signal?.aborted) break
      const piece = chunk.choices?.[0]?.delta?.content ?? ''
      if (piece) {
        full += piece
        opts.onChunk?.(full)
      }
    }
    if (!full) throw new Error('The model returned an empty response — try again.')
    return full
  }

  /** One-shot (non-streaming) completion, same path underneath. */
  async complete(messages: ChatTurn[], opts: Omit<GenerateOptions, 'onChunk'> = {}): Promise<string> {
    return this.generate(messages, opts)
  }
}

export const llmEngine = new LlmEngine()

/* ------------------------------------------------------------------ */
/* Animation-spec extraction (Kronos 3D animator parity)               */
/* ------------------------------------------------------------------ */

/** Pulls the ```nexora_animation JSON block out of a model reply, if any. */
export function extractAnimationSpec(reply: string): unknown | null {
  const m = reply.match(/```(?:nexora_animation|json)\s*\n([\s\S]*?)```/)
  if (!m) return null
  try {
    const spec = JSON.parse(m[1]) as Record<string, unknown>
    if (!Array.isArray(spec.frames) || spec.frames.length === 0) return null
    return spec
  } catch {
    return null
  }
}

/** Strips the animation block so the prose part renders cleanly. */
export function stripAnimationBlock(reply: string): string {
  return reply.replace(/```(?:nexora_animation|json)\s*\n[\s\S]*?```/, '').trim()
}

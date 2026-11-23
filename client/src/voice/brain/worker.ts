/// <reference lib="webworker" />
/*
  Guru on the student's own device: the model runs here, off the page's main
  thread (docs/voice/BLUEPRINT.md §4.6). transformers.js (Apache-2.0) loads
  from jsDelivr at a pinned version; the model from Hugging Face, kept in the
  browser's cache after the first download.

  Messages in:  { type: 'load', model, dtype, device }
                { type: 'generate', id, messages, maxTokens }
  Messages out: { type: 'progress', loaded, total } · { type: 'ready', device }
                { type: 'token', id, text } · { type: 'done', id, text, tokens, ms, firstMs }
                  (ms counts from the first token, so the GPU's warm-up is left out)
                { type: 'error', id?, error }
*/
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js'

interface Gen {
  (input: string, o: Record<string, unknown>): Promise<unknown>
  tokenizer: { apply_chat_template(m: unknown, o: Record<string, unknown>): string }
}
let gen: Gen | null = null
let lib: { TextStreamer: new (tok: unknown, o: Record<string, unknown>) => unknown } | null = null

const post = (m: Record<string, unknown>) => (self as unknown as Worker).postMessage(m)

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as Record<string, unknown>
  try {
    if (m.type === 'load') {
      const t = (await import(/* @vite-ignore */ TRANSFORMERS)) as {
        pipeline: (task: string, model: string, o: Record<string, unknown>) => Promise<Gen>
        TextStreamer: new (tok: unknown, o: Record<string, unknown>) => unknown
        env: { allowLocalModels: boolean }
      }
      t.env.allowLocalModels = false
      lib = t
      const files = new Map<string, { loaded: number; total: number }>()
      gen = await t.pipeline('text-generation', String(m.model), {
        device: m.device,
        dtype: m.dtype,
        progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status !== 'progress' || !p.file) return
          files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
          let loaded = 0
          let total = 0
          for (const f of files.values()) {
            loaded += f.loaded
            total += f.total
          }
          post({ type: 'progress', loaded, total })
        },
      })
      post({ type: 'ready', device: m.device })
      return
    }
    if (m.type === 'generate') {
      if (!gen || !lib) throw new Error('not loaded')
      const id = m.id
      // Thinking off: Guru answers in a few spoken sentences.
      const prompt = gen.tokenizer.apply_chat_template(m.messages, { tokenize: false, add_generation_prompt: true, enable_thinking: false })
      let text = ''
      let tokens = 0
      let first = 0
      const t0 = performance.now()
      const streamer = new lib.TextStreamer(gen.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        token_callback_function: () => {
          if (!first) first = performance.now()
          tokens++
        },
        callback_function: (piece: string) => {
          text += piece
          post({ type: 'token', id, text: piece })
        },
      })
      await gen(prompt, { max_new_tokens: Number(m.maxTokens) || 220, do_sample: false, repetition_penalty: 1.1, streamer })
      post({ type: 'done', id, text, tokens, ms: Math.round(performance.now() - (first || t0)), firstMs: Math.round((first || performance.now()) - t0) })
    }
  } catch (err) {
    post({ type: 'error', id: m.id, error: err instanceof Error ? err.message : String(err) })
  }
}

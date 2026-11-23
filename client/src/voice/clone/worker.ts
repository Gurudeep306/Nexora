/// <reference lib="webworker" />
/*
  The student's own voice, on their device (docs/voice/VIRTUAL_TEACHER.md
  §3.2.7). Chatterbox (MIT, Resemble AI; the ONNX export from
  onnx-community) runs here, off the page's main thread, through
  transformers.js (Apache-2.0) from jsDelivr at a pinned version. The model
  comes from Hugging Face once and stays in the browser's cache. The voice
  sample never leaves the device.

  Messages in:  { type: 'load', device, lm }       lm: the language model's build ('q4f16' | 'q4')
                { type: 'voice', audio }            24 kHz mono Float32Array: made into a voice print, once
                { type: 'say', id, text }
  Messages out: { type: 'progress', loaded, total } · { type: 'ready' } · { type: 'voiced' }
                { type: 'audio', id, audio, ms }    24 kHz mono Float32Array; ms = time it took
                { type: 'error', id?, error }
*/
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/dist/transformers.min.js'
const MODEL = 'onnx-community/chatterbox-ONNX'

interface TensorLike {
  dims: number[]
  data: Float32Array
}
interface Lib {
  AutoProcessor: { from_pretrained(id: string, o?: Record<string, unknown>): Promise<Processor> }
  ChatterboxModel: { from_pretrained(id: string, o: Record<string, unknown>): Promise<Model> }
  Tensor: new (type: string, data: Float32Array, dims: number[]) => TensorLike
  env: { allowLocalModels: boolean }
}
interface Processor {
  tokenizer: (text: string) => Record<string, unknown>
}
interface Model {
  encode_speech(audio: TensorLike): Promise<Record<string, unknown>>
  generate(o: Record<string, unknown>): Promise<TensorLike>
}

let lib: Lib | null = null
let processor: Processor | null = null
let model: Model | null = null
/** The voice print: the speech encoder's outputs for the student's sample. */
let voice: Record<string, unknown> | null = null

const post = (m: Record<string, unknown>, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer)

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as Record<string, unknown>
  try {
    if (m.type === 'load') {
      lib = (await import(/* @vite-ignore */ TRANSFORMERS)) as Lib
      lib.env.allowLocalModels = false
      const files = new Map<string, { loaded: number; total: number }>()
      const progress_callback = (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status !== 'progress' || !p.file) return
        files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
        let loaded = 0
        let total = 0
        for (const f of files.values()) {
          loaded += f.loaded
          total += f.total
        }
        post({ type: 'progress', loaded, total })
      }
      processor = await lib.AutoProcessor.from_pretrained(MODEL)
      model = await lib.ChatterboxModel.from_pretrained(MODEL, {
        device: m.device,
        dtype: { embed_tokens: 'fp32', speech_encoder: 'fp32', language_model: m.lm, conditional_decoder: 'fp32' },
        progress_callback,
      })
      post({ type: 'ready' })
      return
    }
    if (m.type === 'voice') {
      if (!lib || !model) throw new Error('not loaded')
      const audio = m.audio as Float32Array
      voice = await model.encode_speech(new lib.Tensor('float32', audio, [1, audio.length]))
      post({ type: 'voiced' })
      return
    }
    if (m.type === 'say') {
      if (!processor || !model || !voice) throw new Error('no voice yet')
      const text = String(m.text)
      const t0 = performance.now()
      const inputs = processor.tokenizer(text)
      // About 25 speech tokens a second, and about 15 characters a second of speech: room for slow speech, never endless.
      const max = Math.min(1000, Math.round(text.length * 2.5) + 60)
      const wav = await model.generate({ ...inputs, ...voice, exaggeration: 0.5, max_new_tokens: max })
      const audio = Float32Array.from(wav.data)
      post({ type: 'audio', id: m.id, audio, ms: Math.round(performance.now() - t0) }, [audio.buffer])
    }
  } catch (err) {
    post({ type: 'error', id: m.id, error: err instanceof Error ? err.message : String(err) })
  }
}

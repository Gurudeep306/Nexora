import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('/tmp/claude-0/-home-user/fdd3e57e-72d2-53f4-91a0-02a1542ad58d/scratchpad/teacher/tts/package.json')
const ort = require('onnxruntime-node')
const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'))
// Read the 24 kHz 16-bit WAV, resample to 16 kHz (linear is fine for this test).
const buf = fs.readFileSync(process.argv[2])
let off = 12, rate = 24000, data = null
while (off < buf.length) { const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4); if (id === 'fmt ') rate = buf.readUInt32LE(off + 12); if (id === 'data') { data = buf.subarray(off + 8, off + 8 + size); break } off += 8 + size }
const pcm = new Float32Array(data.length / 2); for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2) / 32768
const n = Math.floor(pcm.length * 16000 / rate), x = new Float32Array(n)
for (let i = 0; i < n; i++) { const s = i * rate / 16000, a = Math.floor(s), f = s - a; x[i] = (pcm[a] || 0) * (1 - f) + (pcm[a + 1] || 0) * f }
let t0 = performance.now()
const sess = await ort.InferenceSession.create('wav2arkit_cpu.onnx', { intraOpNumThreads: Number(process.env.THREADS || 4) })
const load = performance.now() - t0
t0 = performance.now()
const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', x, [1, n]) })
const ms = performance.now() - t0
const y = out[sess.outputNames[0]]
const [, frames, k] = y.dims
const curves = []; for (let f = 0; f < frames; f++) { const o = {}; for (let j = 0; j < k; j++) { const v = y.data[f * k + j]; if (v > 0.01) o[cfg.blendshape_names[j]] = +v.toFixed(3) } curves.push(o) }
fs.writeFileSync(process.argv[3], JSON.stringify({ fps: 30, frames: curves }))
console.log(`audio ${(n / 16000).toFixed(2)} s · model load ${load.toFixed(0)} ms · inference ${ms.toFixed(0)} ms · ${((n / 16000) * 1000 / ms).toFixed(1)}x real time · ${frames} frames`)
const jaw = curves.map((c) => c.jawOpen || 0); console.log('jawOpen max', Math.max(...jaw).toFixed(2), 'mean', (jaw.reduce((a, b) => a + b) / jaw.length).toFixed(2))

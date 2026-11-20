/*
  The one-click connection test in Admin → Live. In the owner's own browser:
  open a private test room on one way of connecting, join it twice, send a
  moving test picture and a tone from the first connection, and check the
  second one really receives video frames and sound. Every step is timed.
  No camera or microphone is used.
*/
import { api } from '@/lib/api'
import { LiveSession } from './session'

export type StepState = 'wait' | 'run' | 'ok' | 'bad'
export type Step = { id: string; label: string; state: StepState; detail?: string }
export type Which = 'cloudflare' | 'livekit' | 'direct'

const STEPS: Omit<Step, 'state'>[] = [
  { id: 'room', label: 'Open a private test room' },
  { id: 'connect', label: 'Connect to the video server' },
  { id: 'send', label: 'Send a test picture and sound' },
  { id: 'receive', label: 'Receive the picture on a second connection' },
  { id: 'frames', label: 'Video frames keep arriving' },
  { id: 'sound', label: 'Sound arrives' },
]

/** A moving test picture (a turning clock hand) and a quiet tone. */
function testTracks() {
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 180
  const g = c.getContext('2d')!
  let t = 0
  const id = window.setInterval(() => {
    t += 1
    g.fillStyle = '#1c1b19'
    g.fillRect(0, 0, 320, 180)
    g.strokeStyle = '#d97757'
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(160, 90)
    g.lineTo(160 + Math.cos(t / 8) * 60, 90 + Math.sin(t / 8) * 60)
    g.stroke()
    g.fillStyle = '#f2f0ea'
    g.font = '16px monospace'
    g.fillText(`NexoraGuru test ${t}`, 12, 24)
  }, 66)
  const video = c.captureStream(15).getVideoTracks()[0]
  const ac = new AudioContext()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  gain.gain.value = 0.02
  osc.frequency.value = 440
  const dest = ac.createMediaStreamDestination()
  osc.connect(gain).connect(dest)
  osc.start()
  const audio = dest.stream.getAudioTracks()[0]
  const silent = ac.createMediaStreamDestination().stream.getAudioTracks()[0]
  return {
    video,
    audio,
    silent,
    stop: () => {
      window.clearInterval(id)
      video.stop()
      audio.stop()
      silent.stop()
      void ac.close()
    },
  }
}

const until = async (cond: () => boolean, ms: number) => {
  const t0 = performance.now()
  while (!cond()) {
    if (performance.now() - t0 > ms) return false
    await new Promise((r) => setTimeout(r, 100))
  }
  return true
}
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`

export async function runSelfTest(which: Which, onSteps: (s: Step[]) => void, opts: { simulcast?: boolean } = {}): Promise<boolean> {
  const steps: Step[] = STEPS.map((s) => ({ ...s, state: 'wait' }))
  const set = (id: string, state: StepState, detail?: string) => {
    const s = steps.find((x) => x.id === id)!
    s.state = state
    s.detail = detail
    onSteps(steps.map((x) => ({ ...x })))
  }
  const fail = (id: string, why: string) => {
    set(id, 'bad', why)
    return false
  }
  let A: LiveSession | null = null
  let B: LiveSession | null = null
  let code = ''
  const media = testTracks()
  // Shown like a real tile (off screen), so the server sends the full size.
  const el = document.createElement('video')
  el.muted = true
  el.playsInline = true
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;height:360px'
  document.body.appendChild(el)
  try {
    set('room', 'run')
    const r = await api.post<{ ok: true; code: string }>('/api/admin/live/selftest', { which, ...(opts.simulcast === false ? { simulcast: false } : {}) }).catch((e: Error) => e)
    if (r instanceof Error) return fail('room', r.message)
    code = r.code
    set('room', 'ok', code)

    set('connect', 'run')
    let t0 = performance.now()
    A = new LiveSession(code)
    void A.join({ mic: true, cam: true, micTrack: media.audio, camTrack: media.video })
    const inRoom = await until(() => A!.get().phase === 'in' || A!.get().phase === 'error', 15_000)
    if (!inRoom || A.get().phase !== 'in') return fail('connect', A.get().message || 'Did not get into the room in 15 seconds.')
    const kind = A.get().transport
    const wanted = which === 'cloudflare' ? 'cf' : which === 'livekit' ? 'sfu' : 'mesh'
    if (kind !== wanted) return fail('connect', `The room used ${kind} instead of ${which}.`)
    const linked = await until(() => A!.get().media_status === 'connected' || A!.get().media_status === 'failed', 15_000)
    if (!linked || A.get().media_status === 'failed') return fail('connect', 'Could not connect to the video server.')
    set('connect', 'ok', secs(performance.now() - t0))

    set('send', 'run')
    t0 = performance.now()
    const sent = await until(() => !!A!.get().self?.cam && !!A!.get().self?.mic, 15_000)
    if (!sent) return fail('send', A.get().notices.at(-1)?.text || 'The server did not take the test picture.')
    set('send', 'ok', secs(performance.now() - t0))

    set('receive', 'run')
    t0 = performance.now()
    B = new LiveSession(code)
    void B.join({ mic: false, cam: false, micTrack: media.silent, camTrack: null })
    const aId = A.get().self!.peerId
    const got = await until(() => !!B!.get().media[aId]?.cam, 25_000)
    if (!got) return fail('receive', 'The second connection did not receive the picture in 25 seconds. On a strict network (college or office Wi-Fi), video servers can be blocked.')
    B.attach(aId, 'cam', el)
    void el.play().catch(() => {})
    const shown = await until(() => el.videoWidth > 0, 15_000)
    if (!shown) return fail('receive', 'The picture arrived but no frame played.')
    set('receive', 'ok', `${secs(performance.now() - t0)} · ${el.videoWidth}×${el.videoHeight}`)

    set('frames', 'run')
    const first = el.currentTime
    const moving = await until(() => el.currentTime > first + 1, 8000)
    if (!moving) return fail('frames', 'Frames stopped after the first one.')
    set('frames', 'ok', 'Smooth for 1 s')

    set('sound', 'run')
    const heard = await until(() => !!B!.get().media[aId]?.mic, 10_000)
    if (!heard) return fail('sound', 'No sound track arrived.')
    set('sound', 'ok')
    return true
  } finally {
    B?.leave()
    A?.leave()
    media.stop()
    el.srcObject = null
    el.remove()
    if (code) void api.post(`/api/admin/live/rooms/${code}/end`).catch(() => {})
  }
}

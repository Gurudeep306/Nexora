/*
  The photos Pratibimb asks for (docs/pratibimb/SPEC.md, stage C1), each with a plain instruction, why
  it helps, and the checks a frame must pass. Five are needed; the rest make the model better.
  Turns use the person's own left and right (the live view is shown mirrored, like a mirror).
*/
import type { Reading } from './coach'

export type ShotId = 'front' | 'left' | 'right' | 'smile' | 'waist' | 'far-left' | 'far-right' | 'up' | 'down' | 'open' | 'brows'

export interface Shot {
  id: ShotId
  title: string
  say: string
  why: string
  need: boolean
  /** 'face' = head and shoulders; 'waist' = waist up */
  frame: 'face' | 'waist'
  /** the shot's own check (angle or expression); null when fine */
  pose: (r: Reading, base: Baseline) => string | null
  /** which way the arrow on the guide points */
  arrow?: 'left' | 'right' | 'up' | 'down'
}

/** Taken from the front photo: the person's own straight-ahead values. */
export interface Baseline {
  tilt: number
}
export const DEFAULT_BASE: Baseline = { tilt: 0.42 }

const straight = (r: Reading) => (Math.abs(r.yaw) > 10 ? (r.yaw > 0 ? 'Turn a little to your right, face the camera' : 'Turn a little to your left, face the camera') : null)
const level = (r: Reading, b: Baseline) => (r.tilt < b.tilt - 0.06 ? 'Lower your chin a little' : r.tilt > b.tilt + 0.06 ? 'Raise your chin a little' : null)
const calm = (r: Reading) => (r.smile > 0.35 ? 'Relax your face (no smile for this one)' : r.jaw > 0.2 ? 'Close your mouth gently' : null)

export const SHOTS: Shot[] = [
  {
    id: 'front', title: 'Straight on', need: true, frame: 'face',
    say: 'Look straight at the camera with a relaxed face.',
    why: 'The main view of your face: shape, eyes, nose and lips.',
    pose: (r, b) => straight(r) ?? level(r, b) ?? calm(r),
  },
  {
    id: 'left', title: 'Turn left', need: true, frame: 'face', arrow: 'left',
    say: 'Turn your head slowly to your left, about halfway. Keep your eyes on the camera.',
    why: 'The side of your face: cheek, jaw and nose shape.',
    pose: (r) => (r.yaw < 18 ? 'Turn a bit more to your left' : r.yaw > 40 ? 'A little less, come back towards the camera' : calm(r)),
  },
  {
    id: 'right', title: 'Turn right', need: true, frame: 'face', arrow: 'right',
    say: 'Now turn your head to your right, about halfway.',
    why: 'The other side: faces are never quite the same on both sides.',
    pose: (r) => (r.yaw > -18 ? 'Turn a bit more to your right' : r.yaw < -40 ? 'A little less, come back towards the camera' : calm(r)),
  },
  {
    id: 'smile', title: 'Smile', need: true, frame: 'face',
    say: 'Look at the camera and smile naturally.',
    why: 'How your cheeks, eyes and lips move when you smile.',
    pose: (r) => straight(r) ?? (r.smile < 0.45 ? 'A bigger smile, please' : null),
  },
  {
    id: 'waist', title: 'Waist up', need: true, frame: 'waist',
    say: 'Step back so the camera sees you from the waist up, arms relaxed and visible.',
    why: 'Your shoulders, build and clothes for the presenter.',
    pose: (r) => straight(r),
  },
  {
    id: 'far-left', title: 'Turn further left', need: false, frame: 'face', arrow: 'left',
    say: 'Turn further to your left, almost showing your ear.',
    why: 'Your profile: forehead, nose and chin line.',
    pose: (r) => (r.yaw < 40 ? 'Keep turning to your left' : r.yaw > 70 ? 'A little less' : calm(r)),
  },
  {
    id: 'far-right', title: 'Turn further right', need: false, frame: 'face', arrow: 'right',
    say: 'Turn further to your right, almost showing your ear.',
    why: 'Your other profile.',
    pose: (r) => (r.yaw > -40 ? 'Keep turning to your right' : r.yaw < -70 ? 'A little less' : calm(r)),
  },
  {
    id: 'up', title: 'Chin up', need: false, frame: 'face', arrow: 'up',
    say: 'Look straight, then lift your chin a little.',
    why: 'Your jaw and the underside of your nose.',
    pose: (r, b) => straight(r) ?? (r.tilt > b.tilt - 0.07 ? 'Lift your chin a bit more' : calm(r)),
  },
  {
    id: 'down', title: 'Chin down', need: false, frame: 'face', arrow: 'down',
    say: 'Lower your chin a little, eyes still on the camera.',
    why: 'Your forehead, hairline and brows.',
    pose: (r, b) => straight(r) ?? (r.tilt < b.tilt + 0.07 ? 'Lower your chin a bit more' : calm(r)),
  },
  {
    id: 'open', title: 'Say "aah"', need: false, frame: 'face',
    say: 'Look at the camera and say "aah", mouth open.',
    why: 'Your teeth and lips when you talk: better lip sync.',
    pose: (r) => straight(r) ?? (r.jaw < 0.35 ? 'Open your mouth a little more' : null),
  },
  {
    id: 'brows', title: 'Raise eyebrows', need: false, frame: 'face',
    say: 'Look at the camera and raise your eyebrows, surprised.',
    why: 'How your brows and forehead move.',
    pose: (r) => straight(r) ?? (r.brows < 0.35 ? 'Raise your eyebrows higher' : null),
  },
]

export interface Check {
  ok: boolean
  label: string
  fix?: string
}

/** Every check for one frame, in the order the person should fix them. */
export function judge(shot: Shot, r: Reading | null, base: Baseline): Check[] {
  if (!r) return [{ ok: false, label: 'Face', fix: 'Look at the camera so your face is in view' }]
  const out: Check[] = []
  out.push(r.faces > 1 ? { ok: false, label: 'Only you', fix: 'Only you in the picture, please' } : { ok: true, label: 'Only you' })
  const [lo, hi] = shot.frame === 'face' ? [0.22, 0.62] : [0.07, 0.2]
  out.push(
    r.size < lo
      ? { ok: false, label: 'Distance', fix: shot.frame === 'face' ? 'Come closer: head and shoulders should fill the frame' : 'Come a little closer' }
      : r.size > hi
        ? { ok: false, label: 'Distance', fix: shot.frame === 'face' ? 'Move back a little' : 'Step back until your waist is in the picture' }
        : { ok: true, label: 'Distance' },
  )
  const off = shot.frame === 'face' ? 0.18 : 0.2
  out.push(Math.abs(r.cx - 0.5) > off || Math.abs(r.cy - (shot.frame === 'face' ? 0.45 : 0.3)) > 0.22 ? { ok: false, label: 'Centred', fix: 'Move so your face is in the middle of the frame' } : { ok: true, label: 'Centred' })
  out.push(
    r.light < 70 ? { ok: false, label: 'Light', fix: 'Too dark: face a window or a lamp' } : r.light > 215 ? { ok: false, label: 'Light', fix: 'Too bright: move out of direct sun' } : { ok: true, label: 'Light' },
  )
  out.push(r.sideLight > 0.35 ? { ok: false, label: 'Even light', fix: 'Light falls on one side of your face: turn towards the light' } : { ok: true, label: 'Even light' })
  out.push(Math.abs(r.roll) > 10 ? { ok: false, label: 'Head level', fix: 'Keep your head level, not tilted to one side' } : { ok: true, label: 'Head level' })
  out.push(shot.id !== 'smile' && r.blink > 0.5 ? { ok: false, label: 'Eyes open', fix: 'Keep your eyes open' } : { ok: true, label: 'Eyes open' })
  const pose = shot.pose(r, base)
  out.push(pose ? { ok: false, label: shot.title, fix: pose } : { ok: true, label: shot.title })
  out.push(r.motion > 0.02 || r.sharp < 60 ? { ok: false, label: 'Still and sharp', fix: 'Hold still for a moment' } : { ok: true, label: 'Still and sharp' })
  return out
}

/** How good the model can be with what has been taken: 0..100 and a word. */
export function coverage(done: Set<ShotId>, videos: number) {
  let score = 0
  for (const s of SHOTS) if (done.has(s.id)) score += s.need ? 12 : 5
  score += Math.min(1, videos) * 10
  score = Math.min(100, score)
  const need = SHOTS.filter((s) => s.need && !done.has(s.id)).length
  const word = need ? 'Not enough yet' : score >= 95 ? 'Best' : score >= 80 ? 'Great' : 'Good'
  return { score, word, need }
}

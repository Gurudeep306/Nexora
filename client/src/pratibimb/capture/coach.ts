/*
  The live photo coach (docs/pratibimb/SPEC.md, stage C1). It reads every camera frame on the device
  itself with MediaPipe's face reader (Apache-2.0, served from /mediapipe/wasm and /models; nothing is
  sent anywhere) and measures what makes a photo good for building the model: one person, face size
  and position, head angle, expression, eyes open, light (level and evenness) and sharpness.
*/
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

export interface Reading {
  faces: number
  /** face width / frame width */
  size: number
  /** face centre, 0..1 of the frame */
  cx: number
  cy: number
  /** the person's own turn: + = towards their left, in degrees (roughly) */
  yaw: number
  /** nose height between eyes and chin: smaller when the chin is up */
  tilt: number
  roll: number
  smile: number
  jaw: number
  brows: number
  blink: number
  /** 0..255 mean light on the face */
  light: number
  /** |left − right| / mean: light from one side */
  sideLight: number
  /** Laplacian variance of the face, scaled to a 256 px face */
  sharp: number
  /** face points moved since the last frame (fraction of the face width) */
  motion: number
  /** the 478 face points, 0..1 of the frame (camera's own, unmirrored), for drawing the live mesh */
  points: { x: number; y: number }[]
}

let shared: Promise<{ video: FaceLandmarker; image: FaceLandmarker }> | null = null

/** Load the face reader once (about 4 MB model + the runtime). GPU when the device has one. */
export function loadCoach() {
  shared ??= (async () => {
    const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
    const make = (mode: 'VIDEO' | 'IMAGE') =>
      FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'GPU' },
        runningMode: mode,
        numFaces: 2,
        outputFaceBlendshapes: true,
      }).catch(() =>
        FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'CPU' },
          runningMode: mode,
          numFaces: 2,
          outputFaceBlendshapes: true,
        }),
      )
    const [video, image] = await Promise.all([make('VIDEO'), make('IMAGE')])
    return { video, image }
  })().catch((e) => {
    shared = null
    throw e
  })
  return shared
}

const scratch = typeof document !== 'undefined' ? document.createElement('canvas') : null

/** Light and sharpness of the face area. */
function pixels(src: CanvasImageSource, w: number, h: number, box: { x: number; y: number; w: number; h: number }) {
  if (!scratch) return { light: 128, sideLight: 0, sharp: 100 }
  const S = 128
  scratch.width = S
  scratch.height = S
  const g = scratch.getContext('2d', { willReadFrequently: true })!
  g.drawImage(src, box.x * w, box.y * h, box.w * w, box.h * h, 0, 0, S, S)
  const d = g.getImageData(0, 0, S, S).data
  const L = new Float32Array(S * S)
  let left = 0
  let right = 0
  for (let i = 0; i < S * S; i++) {
    const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
    L[i] = v
    const x = i % S
    const y = (i / S) | 0
    if (y > S * 0.3 && y < S * 0.75) {
      if (x > S * 0.15 && x < S * 0.4) left += v
      if (x > S * 0.6 && x < S * 0.85) right += v
    }
  }
  let sum = 0
  for (const v of L) sum += v
  let lap = 0
  let lap2 = 0
  let n = 0
  for (let y = 1; y < S - 1; y++)
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x
      const v = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - S] - L[i + S]
      lap += v
      lap2 += v * v
      n++
    }
  const mean = sum / (S * S)
  return { light: mean, sideLight: Math.abs(left - right) / Math.max(1, (left + right) / 2), sharp: (lap2 / n - (lap / n) ** 2) * 2 }
}

let last: { x: number; y: number }[] | null = null

export function read(result: FaceLandmarkerResult, src: CanvasImageSource, w: number, h: number): Reading | null {
  const faces = result.faceLandmarks.length
  if (!faces) {
    last = null
    return null
  }
  // The largest face is the person.
  let k = 0
  let best = 0
  result.faceLandmarks.forEach((f, i) => {
    const xs = f.map((p) => p.x)
    const a = Math.max(...xs) - Math.min(...xs)
    if (a > best) {
      best = a
      k = i
    }
  })
  const lm = result.faceLandmarks[k]
  const xs = lm.map((p) => p.x)
  const ys = lm.map((p) => p.y)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const eyeR = lm[33]
  const eyeL = lm[263]
  const eyeD = Math.hypot((eyeL.x - eyeR.x) * w, (eyeL.y - eyeR.y) * h)
  const mid = { x: (eyeR.x + eyeL.x) / 2, y: (eyeR.y + eyeL.y) / 2 }
  const nose = lm[1]
  const chin = lm[152]
  // Turn: the nose tip moves sideways from between the eyes. In the camera's own (unmirrored) picture
  // the person's left is on the right, so a turn to their left moves the nose to the right.
  const side = ((nose.x - mid.x) * w) / Math.max(1, eyeD)
  const yaw = (Math.asin(Math.max(-1, Math.min(1, side * 1.35))) * 180) / Math.PI
  const tilt = ((nose.y - mid.y) * h) / Math.max(1, (chin.y - mid.y) * h)
  const roll = (Math.atan2((eyeL.y - eyeR.y) * h, (eyeL.x - eyeR.x) * w) * 180) / Math.PI
  const bs = Object.fromEntries((result.faceBlendshapes[k]?.categories ?? []).map((c) => [c.categoryName, c.score]))
  const px = pixels(src, w, h, { x: Math.max(0, x0), y: Math.max(0, y0), w: Math.min(1, x1) - Math.max(0, x0), h: Math.min(1, y1) - Math.max(0, y0) })
  const pts = [1, 33, 263, 61, 291, 152].map((i) => ({ x: lm[i].x, y: lm[i].y }))
  const motion = last ? pts.reduce((s, p, i) => s + Math.hypot(p.x - last![i].x, p.y - last![i].y), 0) / pts.length / Math.max(1e-6, x1 - x0) : 0
  last = pts
  return {
    faces,
    size: x1 - x0,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    yaw,
    tilt,
    roll,
    smile: ((bs.mouthSmileLeft ?? 0) + (bs.mouthSmileRight ?? 0)) / 2,
    jaw: bs.jawOpen ?? 0,
    brows: bs.browInnerUp ?? 0,
    blink: ((bs.eyeBlinkLeft ?? 0) + (bs.eyeBlinkRight ?? 0)) / 2,
    light: px.light,
    sideLight: px.sideLight,
    sharp: px.sharp * (256 / Math.max(64, (x1 - x0) * w)),
    motion,
    points: lm.map((p) => ({ x: p.x, y: p.y })),
  }
}

/** Read a still photo (uploads). */
export async function readImage(bmp: ImageBitmap): Promise<Reading | null> {
  const { image } = await loadCoach()
  last = null
  return read(image.detect(bmp), bmp, bmp.width, bmp.height)
}

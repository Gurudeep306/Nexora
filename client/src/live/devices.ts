/*
  Cameras, microphones and screens. Choices are remembered on this device.
  Errors are turned into plain sentences people can act on.
*/
export type Prefs = { mic: string; cam: string; speaker: string; noise: boolean; mirror: boolean }
const KEY = 'nexora:live:prefs'

export function loadPrefs(): Prefs {
  const base: Prefs = { mic: '', cam: '', speaker: '', noise: true, mirror: true }
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return base
  }
}
export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* private mode: choices last for this visit */
  }
}

function explain(e: unknown, what: 'camera' | 'microphone'): Error {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return new Error(`Your browser blocked the ${what}. Allow it from the icon in the address bar, then try again.`)
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new Error(`No ${what} was found on this device.`)
  if (name === 'NotReadableError' || name === 'AbortError') return new Error(`The ${what} is busy in another app. Close that app and try again.`)
  if (!navigator.mediaDevices?.getUserMedia) return new Error(`This browser cannot use the ${what} here. Open the site over https in Chrome, Edge, Safari or Firefox.`)
  return new Error(`Could not start the ${what}.`)
}

export async function micTrack(p: Prefs): Promise<MediaStreamTrack> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: p.mic ? { exact: p.mic } : undefined, echoCancellation: true, noiseSuppression: p.noise, autoGainControl: p.noise, channelCount: 1 },
    })
    return s.getAudioTracks()[0]
  } catch (e) {
    if (p.mic && (e as DOMException)?.name === 'OverconstrainedError') return micTrack({ ...p, mic: '' })
    throw explain(e, 'microphone')
  }
}

export async function cameraTrack(p: Prefs, facing?: 'user' | 'environment'): Promise<MediaStreamTrack> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: p.cam && !facing ? { exact: p.cam } : undefined,
        facingMode: facing,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
    })
    return s.getVideoTracks()[0]
  } catch (e) {
    if (p.cam && (e as DOMException)?.name === 'OverconstrainedError') return cameraTrack({ ...p, cam: '' }, facing)
    throw explain(e, 'camera')
  }
}

/** Can this browser share its screen? (iPhone and iPad browsers cannot.) */
export const canShareScreen = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices

export async function screenTrack(): Promise<{ track: MediaStreamTrack; label: string }> {
  if (!canShareScreen()) throw new Error('This browser cannot share its screen. On an iPad or phone, use the whiteboard or the camera instead.')
  let s: MediaStream
  try {
    s = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
      audio: false,
      // Chrome: offer the whole screen first, never this very tab.
      ...({ selfBrowserSurface: 'exclude', surfaceSwitching: 'include' } as object),
    } as DisplayMediaStreamOptions)
  } catch (e) {
    if ((e as DOMException)?.name === 'NotAllowedError') throw new Error('') // they pressed Cancel
    throw new Error('Could not share the screen.')
  }
  const track = s.getVideoTracks()[0]
  const surface = (track.getSettings() as { displaySurface?: string }).displaySurface
  const label = surface === 'window' ? 'Window' : surface === 'browser' ? 'Tab' : 'Screen'
  return { track, label }
}

export async function listDevices(): Promise<{ mics: MediaDeviceInfo[]; cams: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }> {
  const all = await navigator.mediaDevices?.enumerateDevices().catch(() => []) ?? []
  return {
    mics: all.filter((d) => d.kind === 'audioinput' && d.deviceId),
    cams: all.filter((d) => d.kind === 'videoinput' && d.deviceId),
    speakers: all.filter((d) => d.kind === 'audiooutput' && d.deviceId),
  }
}

/** Speaker choice works in Chrome and Edge (setSinkId). */
export const canPickSpeaker = () => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype

/*
  Turning message and call alerts on for this device (Web Push, public/sw.js;
  server src/push.js). Free: the browser's own push service.
*/
import { api } from './api'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
  const sub = await reg?.pushManager.getSubscription().catch(() => null)
  return sub ? 'on' : 'off'
}

const b64ToBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Ask the browser, subscribe, and tell the server. Must run from a tap. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  await navigator.serviceWorker.ready
  const { publicKey } = await api.get<{ publicKey: string }>('/api/push/key')
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }))
  await api.post('/api/push/subscribe', { subscription: sub.toJSON() })
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
    await sub.unsubscribe().catch(() => {})
  }
  return 'off'
}

/** Keep the server's copy fresh when alerts are already on (keys can rotate). */
export async function refreshPush() {
  if ((await pushState()) !== 'on') return
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) await api.post('/api/push/subscribe', { subscription: sub.toJSON() }).catch(() => {})
}

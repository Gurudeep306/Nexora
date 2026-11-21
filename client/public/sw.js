/*
  NexoraGuru alerts (Web Push): a message or a call reaches this device even
  when the site is closed. Tapping the alert opens the conversation or the
  call, reusing an open NexoraGuru tab when there is one.
*/
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {
    d = { title: 'NexoraGuru', body: event.data ? event.data.text() : '' }
  }
  const title = d.title || 'NexoraGuru'
  const options = {
    body: d.body || '',
    icon: d.icon || '/apple-touch-icon.png',
    badge: '/favicon.svg',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    requireInteraction: !!d.call,
    vibrate: d.call ? [300, 200, 300, 200, 300] : [120],
    data: { url: d.url || '/messages' },
    actions: d.call ? [{ action: 'open', title: 'Answer' }] : [{ action: 'open', title: 'Open' }],
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      // A visible tab shows its own alert; this one is for when none is in view.
      if (tabs.some((t) => t.visibilityState === 'visible')) return undefined
      return self.registration.showNotification(title, options)
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/messages', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((t) => t.url.startsWith(self.location.origin))
      if (tab) return tab.focus().then((t) => (t && 'navigate' in t ? t.navigate(url) : undefined))
      return self.clients.openWindow(url)
    }),
  )
})

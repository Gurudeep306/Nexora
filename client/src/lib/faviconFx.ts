/**
 * The browser tab shows exactly the NexoraGuru mark and the name "NexoraGuru":
 * no per-page titles, no unread counts, no animated icon. These functions keep
 * their old signatures so callers don't change; they only make sure the tab
 * stays that way.
 */
export const TAB_TITLE = 'NexoraGuru'

function pin() {
  if (typeof document !== 'undefined' && document.title !== TAB_TITLE) document.title = TAB_TITLE
}

export function initFaviconFx() {
  pin()
}

export function setFaviconMode(_next: 'idle' | 'busy') {
  pin()
}

export function celebrateFavicon() {
  pin()
}

export function setFaviconBadge(_count: number) {
  pin()
}

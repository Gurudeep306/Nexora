/*
  Semantic icon names. Components ask for meaning ("problems", "streak"),
  never for a library glyph; each pack maps every name to its closest glyph.
*/
export const ICON_GROUPS = {
  Navigation: ['home', 'problems', 'contests', 'workshop', 'nexus', 'analytics', 'achievements', 'learn', 'gate', 'social', 'messages', 'profile', 'settings', 'palette', 'bookmarks', 'submissions', 'system-design', 'practice', 'studio', 'builder', 'keyboard', 'logout', 'login'],
  Actions: ['search', 'add', 'edit', 'delete', 'share', 'copy', 'run', 'play', 'pause', 'submit', 'refresh', 'filter', 'sort', 'download', 'upload', 'link', 'external', 'lock', 'unlock', 'save', 'sliders', 'eye', 'eye-off', 'random'],
  Status: ['check', 'check-circle', 'x', 'x-circle', 'warning', 'info', 'error', 'help', 'clock', 'calendar', 'timer', 'flame', 'star', 'trophy', 'medal', 'award', 'crown', 'target', 'crosshair', 'bolt', 'sparkles', 'rocket', 'brain', 'lightbulb', 'code', 'terminal', 'book', 'chart', 'trending-up', 'activity', 'users', 'user', 'user-plus', 'bell', 'chat', 'mail', 'heart', 'bookmark', 'flag', 'map', 'compass', 'route', 'layers', 'grid', 'list', 'sun', 'moon', 'sunrise', 'monitor', 'type', 'image', 'card', 'globe', 'shield', 'gem', 'inbox', 'live', 'tag', 'bot', 'wand', 'puzzle', 'coins', 'gamepad', 'leaf', 'pine', 'droplet', 'building', 'wrench'],
  Concepts: ['tree', 'graph', 'git-branch', 'array', 'hash', 'database', 'server', 'cpu', 'binary', 'function', 'key', 'calculator', 'shapes'],
} as const

export type IconName = (typeof ICON_GROUPS)[keyof typeof ICON_GROUPS][number]

export const ICON_NAMES: readonly IconName[] = Object.values(ICON_GROUPS).flat()

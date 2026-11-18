/** The part of Hive a path belongs to, for the small label above a title. */
export function hiveArea(pathname: string): string {
  const m = /^\/hive\/([^/]+)/.exec(pathname)?.[1] ?? ''
  if (['copilot', 'chat', 'projects', 'p', 'pipelines'].includes(m)) return 'Work'
  if (['machines', 'drive'].includes(m)) return 'Resources'
  if (['models', 'keys', 'extensions'].includes(m)) return 'AI setup'
  if (m === 'spend') return 'Spend'
  if (m === 'settings') return 'You'
  return 'Hive'
}

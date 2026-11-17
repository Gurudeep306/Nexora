/*
  Plain words for the audit log's action codes (src/routes/admin.js audit()).
  An unknown code (a new action, or a Hive one) is turned into words from the
  code itself, so nothing ever shows as raw dots and underscores.
*/
export const AUDIT_LABELS: Record<string, string> = {
  'user.role': 'Changed a role',
  'user.permissions': 'Changed permissions',
  'user.ban': 'Banned a user',
  'user.suspend': 'Suspended a user',
  'user.unban': 'Lifted a ban',
  'user.warn': 'Warned a user',
  'user.signout': 'Signed a user out',
  'user.reset': 'Reset a profile',
  'user.delete': 'Deleted an account',
  'user.verify': 'Verified an account',
  'user.unverify': 'Removed a verified badge',
  'user.early_access.grant': 'Gave early access',
  'user.early_access.revoke': 'Took back early access',
  'staff.section': 'Changed section access',
  'staff.title': 'Changed a team title',
  'staff.manage.grant': 'Allowed to manage staff',
  'staff.manage.revoke': 'No longer manages staff',
  'site.private_mode': 'Private mode',
  'site.registrations': 'Sign-ups',
  'site.feature_flags': 'Feature switches',
  'site.maintenance': 'Maintenance banner',
  'site.default_style': 'Default theme',
  'site.allowlist.add': 'Invited to early access',
  'site.allowlist.remove': 'Removed an invite',
  'ai.provider.add': 'Added an AI provider',
  'ai.provider.update': 'Changed an AI provider',
  'ai.provider.remove': 'Removed an AI provider',
  'ai.assignments': 'Chose AI models',
  'runner.add': 'Added a code runner',
  'runner.update': 'Changed a code runner',
  'runner.remove': 'Removed a code runner',
  'compilers.sync': 'Checked for new compilers',
  'compilers.reset': 'Reset compiler choices',
  'compilers.pin': 'Pinned a compiler',
  'compilers.unpin': 'Unpinned a compiler',
  'compilers.service.on': 'Turned a runner service on',
  'compilers.service.off': 'Turned a runner service off',
  'announcement.banner': 'Posted a banner',
  'announcement.broadcast': 'Sent a broadcast',
  'announcement.update': 'Changed an announcement',
  'announcement.delete': 'Deleted an announcement',
  'report.resolve': 'Resolved a report',
  'report.dismiss': 'Dismissed a report',
  'report.remove': 'Removed reported content',
  'content.remove': 'Removed content',
  'content.restore': 'Restored content',
}

/** "ai.provider.add" → "Added an AI provider"; unknown codes → "Hive · agent added". */
export function auditLabel(action: string): string {
  if (AUDIT_LABELS[action]) return AUDIT_LABELS[action]
  const [area, ...rest] = action.split('.')
  const words = rest.join(' ').replace(/[_-]+/g, ' ').trim()
  const head = area.charAt(0).toUpperCase() + area.slice(1).replace(/[_-]+/g, ' ')
  return words ? `${head} · ${words}` : head
}

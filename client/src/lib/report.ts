/**
 * Open the report dialog from anywhere (a post's ⋯ menu, a chat message, a
 * profile). The dialog itself is mounted once, by SiteBanners.
 *
 *   openReport({ contentType: 'post', contentId: post.id, targetUser: post.author, preview: post.body })
 *
 * contentType is generic (`post`, `comment`, `message`, `profile`, …) — the
 * server stores any lowercase type, so new features plug in without changes.
 */
export interface ReportTarget {
  contentType: string
  contentId: string | number
  /** Who wrote it (shown in the dialog; the server resolves it for known types). */
  targetUser?: string
  /** A short excerpt of what's being reported. */
  preview?: string
  /** What to call it in the dialog, e.g. "message", "post". Defaults to contentType. */
  noun?: string
}

export const REPORT_EVENT = 'nexora:report'

export function openReport(target: ReportTarget) {
  window.dispatchEvent(new CustomEvent<ReportTarget>(REPORT_EVENT, { detail: target }))
}

export const REPORT_REASONS: { id: string; label: string; hint: string }[] = [
  { id: 'spam', label: 'Spam', hint: 'Ads, scams, repetitive posts' },
  { id: 'harassment', label: 'Harassment', hint: 'Bullying, threats, targeting someone' },
  { id: 'hate', label: 'Hate', hint: 'Attacks on identity or group' },
  { id: 'inappropriate', label: 'Inappropriate', hint: 'NSFW, violent or shocking content' },
  { id: 'cheating', label: 'Cheating', hint: 'Leaked solutions, plagiarism, contest abuse' },
  { id: 'other', label: 'Something else', hint: 'Tell us what happened' },
]

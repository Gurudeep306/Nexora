/*
  Shared pieces of the notes pages: the themed root (fonts, subject accent),
  progress rings, the chapter/lesson tree and breadcrumbs.
*/
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { NOTES_ROUTES, subjectStyle } from './api'
import { progressOf } from './progress'
import { loadNotesFont, type NotesFontId } from './prefs'
import type { ChapterSummary, LessonProgress, NotesColor } from './types'
import './notes.css'
import './notes-reading.css'

/** Wraps notes UI: the handwriting face (or the clean one) and the subject's accent. */
export function NotesRoot({
  color,
  font,
  className,
  style,
  children,
}: {
  color?: NotesColor
  /** Force a face (the font sample page); otherwise the reader's choice. */
  font?: NotesFontId | 'clean'
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  // Every reader gets the site's reading face (src/styles/reading.css); only the
  // staff font sample page still loads the old faces, to compare them.
  const face = font ?? 'clean'
  useEffect(() => {
    if (font) void loadNotesFont(font)
  }, [font])
  return (
    <div className={cn('notes-root', className)} data-notes-font={face} style={{ ...subjectStyle(color), ...style }}>
      {children}
    </div>
  )
}

export function ProgressRing({ done, total, size = 44, label }: { done: number; total: number; size?: number; label?: string }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <span className="notes-ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${done} of ${total} lessons done`}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="notes-ring-track" />
        {pct > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="notes-ring-fill"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </svg>
      <span className="notes-ring-text" aria-hidden="true">
        {total ? Math.round(pct * 100) : 0}
        <small>%</small>
      </span>
    </span>
  )
}

export function LessonStatus({ p }: { p: LessonProgress }) {
  if (p.completed)
    return (
      <span className="notes-status is-done" title="Completed">
        <Icon name="check" className="size-3" aria-hidden="true" />
        <span className="sr-only">Completed</span>
      </span>
    )
  if (p.scrollPct > 2)
    return (
      <span className="notes-status is-started" title={`Read ${p.scrollPct}%`}>
        <span className="sr-only">In progress, {p.scrollPct}% read</span>
      </span>
    )
  return (
    <span className="notes-status" aria-hidden="true" />
  )
}

/** The chapter → lesson tree (left column of the reader). */
export function LessonTree({
  subject,
  chapters,
  current,
  progress,
  onNavigate,
}: {
  subject: string
  chapters: ChapterSummary[]
  current?: string
  progress: Record<string, LessonProgress>
  onNavigate?: () => void
}) {
  return (
    <ol className="notes-tree-list">
      {chapters.map((ch) => {
        const done = ch.lessons.filter((l) => progressOf(progress, subject, l.id).completed).length
        return (
          <li key={ch.id}>
            <p className="notes-tree-chapter">
              <span className="notes-tree-n">{ch.n}</span>
              <span className="min-w-0 flex-1">{ch.title}</span>
              <span className="notes-tree-count">
                {done}/{ch.lessons.length}
              </span>
            </p>
            <ol>
              {ch.lessons.map((l) => {
                const on = l.id === current
                return (
                  <li key={l.id}>
                    <Link
                      to={NOTES_ROUTES.lesson(subject, l.id)}
                      aria-current={on ? 'page' : undefined}
                      onClick={onNavigate}
                      className={cn('notes-tree-link', on && 'is-current')}
                    >
                      <LessonStatus p={progressOf(progress, subject, l.id)} />
                      <span className="min-w-0 flex-1">{l.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </li>
        )
      })}
    </ol>
  )
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="notes-crumbs">
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function SubjectIcon({ icon, className }: { icon: string; className?: string }) {
  return (
    <span className={cn('notes-subject-icon', className)} aria-hidden="true">
      <Icon name={icon as IconName} className="size-5" />
    </span>
  )
}

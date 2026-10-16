/*
  GATE Notes — what the API serves (src/routes/gate-notes.js), compiled by
  scripts/build-gate-notes.js. Lesson bodies arrive as a small, render-ready
  AST: nothing is HTML except KaTeX output, which the reader renders itself.
*/
import type { VizSpec } from '@/viz/schema'

export type NotesColor =
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'syntax-keyword'
  | 'syntax-function'
  | 'syntax-type'
  | 'syntax-string'
  | 'syntax-number'

export type Depth = 'quick' | 'standard' | 'deep'
export type Difficulty = 'basic' | 'core' | 'advanced'

/* ── AST ─────────────────────────────────────────────────────────────── */

export type Inline =
  | string
  | { t: 'em' | 'strong' | 'del' | 'key'; c: Inline[] }
  | { t: 'code' | 'im'; v: string }
  | { t: 'a'; href: string; c: Inline[] }
  | { t: 'img'; src: string; alt: string }
  | { t: 'br' }

export type BlockName =
  | 'intuition'
  | 'definition'
  | 'theorem'
  | 'proof'
  | 'derivation'
  | 'example'
  | 'check'
  | 'step'
  | 'answer'
  | 'trick'
  | 'trap'
  | 'pyq'
  | 'practice'
  | 'viz'
  | 'table'
  | 'summary'
  | 'note'
  | 'aside'

export interface DirectiveNode {
  t: 'block'
  name: BlockName
  id: string
  depth: Depth
  attrs: Record<string, string>
  label?: Inline[]
  c: Node[]
  line: number
}

export type Node =
  | { t: 'h'; d: number; id: string; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul' | 'ol'; start?: number; tight: boolean; c: { t: 'li'; checked?: boolean; c: Node[] }[] }
  | { t: 'quote'; c: Node[] }
  | { t: 'hr' }
  | { t: 'pre'; lang?: string; v: string }
  | { t: 'math'; v: string }
  | { t: 'table'; align: (string | null)[]; c: { t: 'tr'; c: { t: 'td'; c: Inline[] }[] }[] }
  | DirectiveNode

/* ── API payloads ────────────────────────────────────────────────────── */

export interface NotesSubject {
  id: string
  title: string
  order: number
  icon: string
  color: NotesColor
  description: string
  exam: ('CSE' | 'DA')[]
  hidden?: boolean
  chapterCount: number
  lessonCount: number
  est_minutes: number
  /** PYQs in this subject's scope, and how many are mapped to lesson blocks. */
  coverage: { total: number; covered: number }
}

export interface LessonRef {
  subject: string
  id: string
  title: string
}

export interface LessonSummary {
  id: string
  title: string
  order: number
  est_minutes: number
  difficulty: Difficulty
  status?: 'draft' | 'review'
  prerequisites: LessonRef[]
  pyq_topics: string[]
  pyqCount: number
  practiceCount: number
}

export interface ChapterSummary {
  id: string
  n: number
  title: string
  summary?: string
  lessons: LessonSummary[]
}

export interface SubjectTree {
  subject: NotesSubject
  chapters: ChapterSummary[]
}

export interface PracticeQuestion {
  id: string
  type: 'MCQ' | 'MSQ' | 'NAT'
  marks?: 1 | 2
  text: Node[]
  options?: { l: string; c: Node[] }[]
  answer: string | string[] | number | [number, number]
  solution: Node[][]
  concept: string
  common_wrong: { answer: string | string[] | number; why: Node[] }[]
  blocks: string[]
  source: 'nexora'
}

export interface Lesson {
  id: string
  subject: string
  chapter: string
  title: string
  order: number
  est_minutes: number
  difficulty: Difficulty
  status: 'draft' | 'review' | 'published'
  needs_review?: boolean
  updated: string
  prerequisites: LessonRef[]
  pyq_topics: string[]
  outline: { id: string; text: string; level: number }[]
  blocks: { id: string; name: BlockName; depth: Depth; title?: string }[]
  /** Every PYQ this lesson teaches (embedded or mapped in pyq-map.json), newest first. */
  pyqLinks: PyqLink[]
  pyqs: string[]
  practice: string[]
  viz: string[]
  body: Node[]
}

export interface LessonPayload {
  subject: NotesSubject
  lesson: Lesson
  chapter: { id: string; n: number; title: string }
  practice: Record<string, PracticeQuestion>
  viz: Record<string, VizSpec>
  prev: { id: string; title: string; chapter: string } | null
  next: { id: string; title: string; chapter: string } | null
}

export interface PyqLink {
  id: string
  year: number
  marks: number | null
  type: string
  paper: string
  /** Shown as a card in this lesson (else it lives in the practice bank). */
  embedded: boolean
  /** Block / heading ids in this lesson that teach it. */
  tests: string[]
}

export interface SearchResult {
  subject: string
  subjectTitle: string
  lesson: string
  title: string
  chapter: string
  snippet: string
}

export interface LessonProgress {
  completed: boolean
  scrollPct: number
  bookmarked: boolean
  updatedAt: number
}

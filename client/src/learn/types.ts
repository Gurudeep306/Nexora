import type { Algorithm, Lang } from './engine/types'
import type { Question } from './questions/types'
import type { StageSpec } from '@/ai/stage/spec'

export type CalloutKind = 'note' | 'tip' | 'warn' | 'insight' | 'interview' | 'pitfall'

export type Block =
  | { t: 'md'; md: string }
  | { t: 'viz'; algo: string; initial?: Record<string, string>; caption?: string }
  | { t: 'code'; title?: string; code: Partial<Record<Lang, string>>; note?: string }
  | { t: 'callout'; kind: CalloutKind; title?: string; md: string }
  | { t: 'complexity'; title?: string; rows: { op: string; time: string; space?: string; note?: string }[] }
  | { t: 'check'; ids: string[]; title?: string }
  | { t: 'practice'; ids: string[]; title?: string }
  | { t: 'steps'; title?: string; items: { title: string; md: string }[] }
  /** A Nexora Stage scene (2D and 3D, client/src/ai/stage/spec.ts); loaded only when a page shows one. */
  | { t: 'stage'; scene: StageSpec; caption?: string }
  /** A derivation: one line per step, each with the reason it follows from the line before. */
  | { t: 'derive'; title?: string; lines: { tex: string; why: string }[]; result?: string }
  /**
   * Python the reader can run, step through line by line, and edit. Its output
   * is recorded from a real run (scripts/ai-courses/record-python.mjs).
   * `browser: false` for code the in-browser Python cannot run (PyTorch, or a
   * feature newer than the browser's Python): it shows the recorded output only.
   * `error: true` marks an example that ends in an error on purpose (the tests
   * fail if any other example errors).
   */
  | { t: 'python'; code: string; title?: string; note?: string; stdin?: string; browser?: boolean; step?: boolean; error?: boolean }
  /** Books and chapters to read alongside (ids from docs/ai-courses/sources/books.json). */
  | { t: 'readmore'; items: { book: string; where: string; why: string }[] }

export interface Page {
  id: string
  title: string
  summary: string
  minutes: number
  blocks: Block[]
}

export interface Topic {
  id: string
  title: string
  blurb: string
  pages: Page[]
  questions: Question[]
  /** Animations this topic's lessons embed (registered when the topic loads). */
  algorithms?: Algorithm[]
}

/** Per-topic status read by the syllabus without loading the topic itself. */
export interface TopicMeta {
  ready: boolean
  pages: number
}

export interface SyllabusEntry {
  id: string
  title: string
  blurb: string
  unit: string
  /** Lazy-loaded content; absent while the topic is still being written. */
  load?: () => Promise<Topic>
  /** Rough size, shown on the syllabus. */
  pages?: number
}

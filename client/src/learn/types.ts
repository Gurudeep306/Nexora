import type { Algorithm, Lang } from './engine/types'
import type { Question } from './questions/types'

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

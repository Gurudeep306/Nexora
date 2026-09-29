/**
 * The question bank. Every topic's questions are one of these kinds; all but
 * `code` are answered and graded right on the page, `code` opens the judge.
 */
export type Difficulty = 'easy' | 'medium' | 'hard'

interface Base {
  id: string
  topic: string
  /** Lesson page it belongs to (for "practice this page" links). */
  page: string
  title: string
  difficulty: Difficulty
  /** Markdown; may include `code` and $math$. */
  prompt: string
  /** Shown after answering (right or wrong). */
  explain: string
  /** A nudge shown on request, before the answer. */
  hint?: string
  tags?: string[]
}

export type Question =
  | (Base & { kind: 'mcq'; options: string[]; answer: number })
  | (Base & { kind: 'multi'; options: string[]; answers: number[] })
  | (Base & { kind: 'numeric'; answer: number; tolerance?: number; unit?: string })
  | (Base & { kind: 'text'; accept: string[]; placeholder?: string; caseSensitive?: boolean })
  | (Base & { kind: 'order'; items: string[] }) // items in the correct order
  | (Base & { kind: 'array'; answer: (number | string)[]; placeholder?: string }) // "what does the array look like after …"
  | (Base & { kind: 'code'; slug: string; stdin?: string })
  /** Code with blanks written as [[0]], [[1]]…; each blank lists accepted answers (whitespace is ignored). */
  | (Base & { kind: 'fill'; code: string; lang?: string; blanks: string[][] })
  /** Pair each left item with its right item; right[i] belongs to left[i] (shown shuffled). */
  | (Base & { kind: 'match'; left: string[]; right: string[] })

export type QuestionKind = Question['kind']

export const KIND_LABEL: Record<QuestionKind, string> = {
  mcq: 'Multiple choice',
  multi: 'Select all',
  numeric: 'Numeric',
  text: 'Short answer',
  order: 'Put in order',
  array: 'Predict the array',
  code: 'Coding',
  fill: 'Fill the code',
  match: 'Match',
}

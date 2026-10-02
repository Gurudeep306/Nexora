import type { Algorithm } from '../engine/types'
import type { Question } from '../questions/types'
import type { Page, Topic } from '../types'

const ORDER: Record<Question['difficulty'], number> = { easy: 0, medium: 1, hard: 2 }

/**
 * Puts a topic together from its parts. Lessons, quiz questions and
 * animations are written separately from the judged coding problems; this
 * joins them and gives every page a "Practice problems" list of the coding
 * problems that practise it (unless the page already lists them itself).
 */
export function assembleTopic(t: {
  id: string
  title: string
  blurb: string
  pages: Page[]
  questions: Question[]
  codeQuestions?: Question[]
  algorithms?: Algorithm[]
}): Topic {
  const code = t.codeQuestions ?? []
  const questions = [...t.questions, ...code.filter((c) => !t.questions.some((q) => q.id === c.id))]
  const pages = t.pages.map((p) => {
    const listed = new Set(p.blocks.flatMap((b) => (b.t === 'practice' ? b.ids : [])))
    const extra = code
      .filter((q) => q.page === p.id && !listed.has(q.id))
      .sort((a, b) => ORDER[a.difficulty] - ORDER[b.difficulty])
      .map((q) => q.id)
    if (!extra.length) return p
    return { ...p, blocks: [...p.blocks, { t: 'practice' as const, title: listed.size ? 'More practice' : 'Practice problems', ids: extra }] }
  })
  return { id: t.id, title: t.title, blurb: t.blurb, pages, questions, algorithms: t.algorithms }
}

/** Shorthand for a judged coding question; its id is the problem's slug. */
export function codeQ(topic: string, slug: string, page: string, title: string, difficulty: Question['difficulty'], prompt: string): Question {
  return { id: slug, topic, page, kind: 'code', difficulty, title, prompt, explain: '', slug }
}

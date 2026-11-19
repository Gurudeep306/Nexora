import { assembleTopic } from '../../../assemble.ts'
import { breaks, check, decisions, forLoops, matching, whileLoops } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-py-control',
  title: 'Decisions and loops: if, for, while and range',
  blurb: 'if, elif and else; indentation; conditional expressions; for loops and range; running totals; nested loops; while loops and how to avoid endless ones; break, continue, pass and else on loops; match.',
  pages: [decisions, forLoops, whileLoops, breaks, matching, check],
  questions,
})

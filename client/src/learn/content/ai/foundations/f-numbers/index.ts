import { assembleTopic } from '../../../assemble.ts'
import { check, intervals, kinds, sets, spaces, sqrt2, why } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-numbers',
  title: 'Numbers, sets and intervals',
  blurb: 'Natural numbers to real numbers, why √2 is not a fraction, sets and their operations, intervals, and lists of numbers as points in ℝⁿ.',
  pages: [why, kinds, sqrt2, sets, intervals, spaces, check],
  questions,
})

import { assembleTopic } from '../../../assemble.ts'
import { check, compare, types, values, variables, why } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-python',
  title: 'Your first Python: values, variables and types',
  blurb: 'Running Python in the browser; numbers and the seven arithmetic operators; floats and their rounding; variables as names pointing at values; int, float, str, bool and None; conversions; comparisons, chained comparisons and and/or/not.',
  pages: [why, values, variables, types, compare, check],
  questions,
})

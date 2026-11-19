import { assembleTopic } from '../../../assemble.ts'
import { check, graph, inverse, many, moving, rule, shapes } from './pages.ts'
import { questions } from './questions.ts'

export default assembleTopic({
  id: 'f-functions',
  title: 'Functions and their graphs',
  blurb: 'A function as a rule with one output per input; domain and range; graphs; lines, parabolas, absolute value and ReLU; moving graphs; composition and inverses; functions of two numbers as surfaces.',
  pages: [rule, graph, shapes, moving, inverse, many, check],
  questions,
})

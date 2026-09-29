import type { Topic } from '../../../types'
import { bigO, growthClasses, logarithms, loops, whyMeasure } from './pages1'
import { amortized, cases, cheatsheet, hiddenCosts, recurrences, space } from './pages2'
import { questions } from './questions'

const topic: Topic = {
  id: 'complexity',
  title: 'Complexity & Big-O',
  blurb: 'Counting steps, Big-O/Ω/Θ, loops and logarithms, growth classes and constraints, cases, space, amortized cost and recurrences.',
  pages: [whyMeasure, bigO, loops, logarithms, growthClasses, cases, space, amortized, recurrences, hiddenCosts, cheatsheet],
  questions,
}
export default topic

import { assembleTopic } from '../../assemble'
import { algorithms } from './algorithms'
import { bigO, growthClasses, logarithms, loops, whyMeasure } from './pages1'
import { amortized, cases, cheatsheet, hiddenCosts, recurrences, space } from './pages2'
import { asymptoticProofs, limitsMethod, ramModel } from './pages3'
import { codeFragments, estimatingRuntime, summations } from './pages4'
import { amortizedMethods, expectedAnalysis } from './pages5'
import { hardProblems, lowerBounds, recurrenceMethods, recursiveAlgorithms } from './pages6'
import { codeQuestions } from './problems'
import { questions } from './questions'
import { questions2 } from './questions2'
import { questions3 } from './questions3'
import { questions4 } from './questions4'
import { questions5 } from './questions5'

export default assembleTopic({
  id: 'complexity',
  title: 'Complexity & Big-O',
  blurb: 'The RAM model, Big-O/Ω/Θ with proofs, loops, sums and logarithms, growth classes and constraints, expected and amortized analysis, recurrences and the Master theorem, lower bounds, hidden costs and NP-hard problems.',
  pages: [
    whyMeasure,
    ramModel,
    bigO,
    asymptoticProofs,
    limitsMethod,
    loops,
    summations,
    logarithms,
    codeFragments,
    growthClasses,
    estimatingRuntime,
    cases,
    expectedAnalysis,
    space,
    amortized,
    amortizedMethods,
    recurrences,
    recurrenceMethods,
    recursiveAlgorithms,
    lowerBounds,
    hiddenCosts,
    hardProblems,
    cheatsheet,
  ],
  questions: [...questions, ...questions2, ...questions3, ...questions4, ...questions5],
  codeQuestions,
  algorithms,
})

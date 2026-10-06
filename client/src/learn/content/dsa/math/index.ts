import { assembleTopic } from '../../assemble'
import { algorithms1 } from './algorithms1'
import { algorithms2 } from './algorithms2'
import { algorithms3 } from './algorithms3'
import { algorithms4 } from './algorithms4'
import { divisibility, extendedEuclid, gcdLcm, primes } from './pages1'
import { divisorFunctions, fastPower, modularArithmetic, sieve } from './pages2'
import { counting, crt, modularInverse, pascalBinomial } from './pages3'
import { cheatsheet, inclusionExclusion, numberPatterns, probability } from './pages4'
import { codeQuestions1 } from './problems1'
import { codeQuestions2 } from './problems2'
import { codeQuestions3 } from './problems3'
import { codeQuestions4 } from './problems4'
import { questions1 } from './questions1'
import { questions2 } from './questions2'
import { questions3 } from './questions3'
import { questions4 } from './questions4'

export default assembleTopic({
  id: 'math',
  title: 'Math for DSA',
  blurb: 'Divisibility, GCD and LCM, extended Euclid, primes and sieves, divisor functions and Euler φ, modular arithmetic, fast and matrix power, modular inverse, CRT, combinatorics, Pascal and binomials, inclusion–exclusion, probability and expectation, and number-theory patterns.',
  pages: [
    divisibility,
    gcdLcm,
    extendedEuclid,
    primes,
    sieve,
    divisorFunctions,
    modularArithmetic,
    fastPower,
    modularInverse,
    crt,
    counting,
    pascalBinomial,
    inclusionExclusion,
    probability,
    numberPatterns,
    cheatsheet,
  ],
  questions: [...questions1, ...questions2, ...questions3, ...questions4],
  codeQuestions: [...codeQuestions1, ...codeQuestions2, ...codeQuestions3, ...codeQuestions4],
  algorithms: [...algorithms1, ...algorithms2, ...algorithms3, ...algorithms4],
})

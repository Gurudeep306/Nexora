import { assembleTopic } from '../../assemble'
import { algorithms } from './algorithms'
import { dynamicArrays, insertDelete, reverseRotate, searching, traversal, whatIsAnArray } from './pages1'
import { cheatsheet, kadane, prefixSums, slidingWindow, twoD, twoPointers } from './pages2'
import { amortized, indexAsHash, memoryCache, sortedSearch } from './pages3'
import { prefixHashing, range2d } from './pages4'
import { kSum, waterProblems, windowCounting } from './pages5'
import { kadaneVariants, majorityVote, matrixTechniques } from './pages6'
import { codeQuestions } from './problems'
import { questions as questions1 } from './questions'
import { questions2 } from './questions2'
import { questions3 } from './questions3'
import { questions4 } from './questions4'
import { questions5 } from './questions5'

export default assembleTopic({
  id: 'arrays',
  title: 'Arrays',
  blurb: 'Memory layout and caches, traversal, searching, rotation, dynamic arrays and amortized analysis, index-as-hash tricks, prefix sums, two pointers, sliding windows, Kadane and its variants, majority vote, and matrix techniques.',
  pages: [
    whatIsAnArray,
    memoryCache,
    traversal,
    insertDelete,
    searching,
    sortedSearch,
    reverseRotate,
    dynamicArrays,
    amortized,
    indexAsHash,
    prefixSums,
    prefixHashing,
    range2d,
    twoPointers,
    kSum,
    waterProblems,
    slidingWindow,
    windowCounting,
    kadane,
    kadaneVariants,
    majorityVote,
    twoD,
    matrixTechniques,
    cheatsheet,
  ],
  questions: [...questions1, ...questions2, ...questions3, ...questions4, ...questions5],
  codeQuestions,
  algorithms,
})

import type { Topic } from '../../../types'
import { dynamicArrays, insertDelete, reverseRotate, searching, traversal, whatIsAnArray } from './pages1'
import { cheatsheet, kadane, prefixSums, slidingWindow, twoD, twoPointers } from './pages2'
import { questions } from './questions'

const topic: Topic = {
  id: 'arrays',
  title: 'Arrays',
  blurb: 'Memory layout, traversal, shifting, searching, rotation, dynamic arrays, prefix sums, two pointers, sliding windows, Kadane and 2D arrays.',
  pages: [whatIsAnArray, traversal, insertDelete, searching, reverseRotate, dynamicArrays, prefixSums, twoPointers, slidingWindow, kadane, twoD, cheatsheet],
  questions,
}
export default topic

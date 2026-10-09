import { assembleTopic } from '../../assemble'
import { algorithms1 } from './algorithms1'
import { algorithms2 } from './algorithms2'
import { algorithms3 } from './algorithms3'
import { algorithms4 } from './algorithms4'
import { doublyCircular, dummyHead, singlyLinked, whyLinkedLists } from './pages1'
import { cycleDetection, fastSlow, palindromeHalves, reversal } from './pages2'
import { mergingSort, regrouping, twoLists } from './pages3'
import { cheatsheet, extraPointers } from './pages4'
import { codeQuestions1 } from './problems1'
import { codeQuestions2 } from './problems2'
import { codeQuestions3 } from './problems3'
import { codeQuestions4 } from './problems4'
import { questions1 } from './questions1'
import { questions2 } from './questions2'
import { questions3 } from './questions3'
import { questions4 } from './questions4'

export default assembleTopic({
  id: 'linked-lists',
  title: 'Linked lists',
  blurb: 'Singly, doubly and circular lists, insertion and deletion, reversal, fast/slow pointers, cycle detection, merging, and LRU-style designs.',
  pages: [
    whyLinkedLists,
    singlyLinked,
    dummyHead,
    doublyCircular,
    reversal,
    fastSlow,
    cycleDetection,
    palindromeHalves,
    mergingSort,
    twoLists,
    regrouping,
    extraPointers,
    cheatsheet,
  ],
  questions: [...questions1, ...questions2, ...questions3, ...questions4],
  codeQuestions: [...codeQuestions1, ...codeQuestions2, ...codeQuestions3, ...codeQuestions4],
  algorithms: [...algorithms1, ...algorithms2, ...algorithms3, ...algorithms4],
})

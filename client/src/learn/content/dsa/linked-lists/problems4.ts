import { codeQ } from '../../assemble'

const T = 'linked-lists'

/** Judged coding problems for the extra-pointers and cheatsheet pages (scripts/learn/problems/linked_lists_parts/p4.py). */
export const codeQuestions4 = [
  codeQ(T, 'll-c-add-numbers', 'extra-pointers', 'Add two reversed-digit numbers', 'easy', 'School arithmetic streams from the ones digit \u2014 which is the HEAD: walk both lists with a carry; never form the integer.'),
  codeQ(T, 'll-c-add-numbers-forward', 'extra-pointers', 'Add two forward-digit numbers', 'hard', 'Ones digits are at the tails now: reverse both lists and the result, or recurse and carry upward; 100 digits overflow every machine type.'),
  codeQ(T, 'll-c-flatten', 'extra-pointers', 'Flatten a multilevel list', 'medium', 'Dive into child, push next onto an explicit stack as the RETURN POINT; when a level runs out, pop and relink \u2014 recursion made explicit.'),
  codeQ(T, 'll-c-nested-flatten', 'extra-pointers', 'Flatten a nested integer structure', 'medium', 'Pop an item: integer goes out, list gets its items pushed back REVERSED so they pop left-to-right; the child-pointer problem in parser clothes.'),
  codeQ(T, 'll-c-delete-middle', 'cheatsheet', 'Delete the middle node, one pass', 'easy', 'Fast/slow plus a slowPrev one step behind (or walkers on a dummy) so the victim\u2019s predecessor is in hand when slow lands.'),
  codeQ(T, 'll-c-sort-012', 'cheatsheet', 'Sort a list of 0s, 1s and 2s by relinking', 'easy', 'Thread three dummy chains in one walk, SEAL the last tail, concatenate with two writes; stable, no counting.'),
  codeQ(T, 'll-c-split-alternate', 'cheatsheet', 'Split into alternating chains', 'medium', 'Take a node for chain A, the next for chain B, seal BOTH tails \u2014 unsealed tails keep the two lists tangled.'),
  codeQ(T, 'll-c-add-polynomials', 'cheatsheet', 'Add two polynomials', 'medium', 'Merge-walk comparing exponents; on a tie sum the coefficients and SKIP the term when they cancel to zero.'),
  codeQ(T, 'll-c-union-sorted', 'cheatsheet', 'Union of two sorted lists', 'medium', 'Stable merge-walk with dedup folded in: append only when the value differs from the result\u2019s current tail.'),
  codeQ(T, 'll-c-reverse-alternate', 'cheatsheet', 'Reverse alternate k-groups', 'hard', 'Probe-then-flip with a skip phase: after a reverse the anchor is the group\u2019s original head, after a skip its last node; phases alternate.'),
  codeQ(T, 'll-c-cyclic-intersection', 'cheatsheet', 'Intersection when cycles may exist', 'hard', 'Floyd twice, then case analysis: both acyclic \u2192 switch trick; exactly one cyclic \u2192 \u22121; both cyclic \u2192 compare entrances.'),
]

import { codeQ } from '../../assemble'

const T = 'linked-lists'

/** Judged coding problems for the merging-sort, two-lists and regrouping pages (scripts/learn/problems/linked_lists_parts/p3.py). */
export const codeQuestions3 = [
  codeQ(T, 'll-c-merge-two', 'merging-sort', 'Merge two sorted lists', 'easy', 'Compare heads, take the smaller, thread onto a dummy-headed tail; append the leftover chain whole.'),
  codeQ(T, 'll-c-merge-sort', 'merging-sort', 'Sort the list in O(n log n), O(1) space', 'medium', 'Split with fast/slow, sort both halves, merge; linked lists merge without arrays, so the extra space is only the recursion stack.'),
  codeQ(T, 'll-c-insertion-sort', 'merging-sort', 'Insertion sort on a list', 'medium', 'Detach nodes one by one and re-insert each into a sorted prefix grown behind a dummy; the list version of array insertion sort.'),
  codeQ(T, 'll-c-merge-k', 'merging-sort', 'Merge K sorted lists', 'hard', 'Divide and conquer pairwise merges for O(N log k), or a min-heap of k heads; sequential merging costs O(Nk) and times out.'),
  codeQ(T, 'll-c-intersection', 'two-lists', 'Where do two lists become one?', 'medium', 'Switch partners at the end (p = p ? p.next : otherHead): both walkers cover la+lb and meet at the Y, or both end null.'),
  codeQ(T, 'll-c-dedup-sorted', 'two-lists', 'Deduplicate a sorted list', 'easy', 'Compare each node with its successor and unlink forward when equal; one pass, no set needed because duplicates are adjacent.'),
  codeQ(T, 'll-c-dedup-unsorted', 'two-lists', 'Deduplicate, order preserved', 'medium', 'Duplicates are no longer adjacent: carry a set of seen values and unlink any node whose value was already seen.'),
  codeQ(T, 'll-c-swap-pairs', 'regrouping', 'Swap adjacent pairs', 'medium', 'Anchor before each pair (dummy makes the head ordinary), rewire prev\u2192b\u2192a\u2192rest, advance the anchor past the pair.'),
  codeQ(T, 'll-c-odd-even', 'regrouping', 'Odd positions, then even positions', 'medium', 'Thread two chains (odd/even positions) in one walk, seal the even tail, then concatenate; O(1) space, no allocations.'),
  codeQ(T, 'll-c-partition', 'regrouping', 'Partition around x, stably', 'medium', 'Two dummy chains (< x and \u2265 x) threaded in one walk, concatenated; arrival order inside each chain keeps it stable.'),
  codeQ(T, 'll-c-rotate', 'regrouping', 'Rotate right by k', 'medium', 'k mod n kills huge rotations; close the ring, walk to the new tail (n \u2212 k \u2212 1), cut there.'),
  codeQ(T, 'll-c-reorder', 'regrouping', 'L0 \u2192 Ln \u2192 L1 \u2192 Ln\u22121 \u2192 ...', 'medium', 'The composition interviewers love: find the middle, reverse the second half, then zipper the two halves together.'),
]

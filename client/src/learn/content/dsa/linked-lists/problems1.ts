import { codeQ } from '../../assemble'

const T = 'linked-lists'

/** Judged coding problems for the why-linked-lists, singly-linked, dummy-head and doubly-circular pages (scripts/learn/problems/linked_lists_parts/p1.py). */
export const codeQuestions1 = [
  codeQ(T, 'll-c-op-sim', 'why-linked-lists', 'A sequence of splices', 'easy', 'Simulate insertions and deletions at the ends of a list; the middle operations are what arrays pay O(n) for.'),
  codeQ(T, 'll-c-bin-to-int', 'singly-linked', 'Binary number in a list', 'easy', 'Fold the bits left to right with value = value·2 + bit; 60 bits need 64-bit (or BigInt) arithmetic.'),
  codeQ(T, 'll-c-delete-node', 'singly-linked', 'Delete with no way back', 'medium', 'No access to the head: copy the next node\u2019s value forward and unlink the successor instead.'),
  codeQ(T, 'll-c-design-list', 'singly-linked', 'Design a linked list', 'medium', 'A get/addAtHead/addAtTail/addAtIndex/deleteIndex API on a singly linked list with a size counter.'),
  codeQ(T, 'll-c-remove-val', 'dummy-head', 'Remove every x', 'easy', 'Walk with prev (or a dummy) and unlink every node holding x; never delete the node you are standing on.'),
  codeQ(T, 'll-c-insert-sorted', 'dummy-head', 'Insert into a sorted list', 'easy', 'A dummy head makes "insert before the head" an ordinary case: find the first node bigger than x and splice before it.'),
  codeQ(T, 'll-c-remove-dups-II', 'dummy-head', 'Delete every value that repeats', 'medium', 'Two-phase: count values, then unlink every node whose count exceeds 1; a dummy absorbs head deletions.'),
  codeQ(T, 'll-c-remove-zero-sum', 'dummy-head', 'Erase consecutive runs summing to zero', 'hard', 'Prefix sums in a map, last occurrence wins: equal prefix sums mark a zero-sum run; two passes erase them all.'),
  codeQ(T, 'll-c-josephus', 'doubly-circular', 'Josephus ring', 'medium', 'n people in a ring, every k-th eliminated; simulate on a circular list or use the O(n) recurrence J(n,k) = (J(n\u22121,k)+k) mod n.'),
  codeQ(T, 'll-c-josephus-k2', 'doubly-circular', 'Josephus with k = 2, n up to 10^18', 'medium', 'Simulation is impossible at 10^18; the k = 2 closed form 2l+1 with n = 2^m + l answers in O(log n).'),
  codeQ(T, 'll-c-insert-circular', 'doubly-circular', 'Insert into a sorted circular list', 'medium', 'One lap from the head finds a valid pair (cur \u2264 x \u2264 cur.next, or the wrap, or all equal); insert there.'),
  codeQ(T, 'll-c-browser-history', 'doubly-circular', 'Browser history', 'medium', 'A doubly linked list as back/forward stacks: visit truncates forward history, back/forward walk the pointers.'),
  codeQ(T, 'll-c-lru', 'doubly-circular', 'LRU cache', 'hard', 'A hash map plus a doubly linked list: get and put in O(1); eviction removes the tail, touches move to the head.'),
]

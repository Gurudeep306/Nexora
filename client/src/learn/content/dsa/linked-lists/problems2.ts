import { codeQ } from '../../assemble'

const T = 'linked-lists'

/** Judged coding problems for the reversal, fast-slow-pointers, cycle-detection and palindrome-halves pages (scripts/learn/problems/linked_lists_parts/p2.py). */
export const codeQuestions2 = [
  codeQ(T, 'll-c-reverse', 'reversal', 'Reverse the list', 'easy', 'The three-pointer loop: prev/cur/next, rewiring one link per step; the template every later reversal builds on.'),
  codeQ(T, 'll-c-reverse-between', 'reversal', 'Reverse positions m to n', 'medium', 'Anchor at the node BEFORE position m with a dummy, flip exactly n\u2212m+1 nodes, then reattach head and tail of the segment.'),
  codeQ(T, 'll-c-reverse-kgroup', 'reversal', 'Reverse in k-groups', 'hard', 'Probe for k nodes, flip the group, recurse or loop with an anchor; a partial final group stays untouched.'),
  codeQ(T, 'll-c-middle', 'fast-slow-pointers', 'The middle, one pass', 'easy', 'Fast moves two, slow moves one; when fast ends, slow is at the middle (second middle on even n).'),
  codeQ(T, 'll-c-nth-from-end', 'fast-slow-pointers', 'nth from the end, one pass', 'easy', 'Send fast n steps ahead, then walk both together; the fixed gap lands slow exactly at the target.'),
  codeQ(T, 'll-c-remove-nth', 'fast-slow-pointers', 'Delete nth from the end, one pass', 'medium', 'The gap trick plus a dummy so slow stops at the victim\u2019s PREDECESSOR; unlinking needs prev, not the node itself.'),
  codeQ(T, 'll-c-cycle-entrance', 'cycle-detection', 'Where does the cycle start?', 'medium', 'Floyd phase 1 detects, phase 2 (one walker back at the head, equal speeds) proves the entrance is exactly a\u00b7c steps away.'),
  codeQ(T, 'll-c-cycle-length', 'cycle-detection', 'How long is the cycle?', 'medium', 'Detect with Floyd, then walk the meeting point until it returns to itself, counting steps.'),
  codeQ(T, 'll-c-happy-number', 'cycle-detection', 'The cycle you cannot see', 'easy', 'The digit-square map either reaches 1 or loops; Floyd on the implicit sequence detects the loop in O(1) space.'),
  codeQ(T, 'll-c-palindrome', 'palindrome-halves', 'Is it a palindrome? (restore after)', 'medium', 'Find the middle, reverse the second half, compare, then reverse it BACK so the list is restored.'),
  codeQ(T, 'll-c-split-halves', 'palindrome-halves', 'Cut the list in half', 'easy', 'fast = head->next with while (fast && fast->next) so even n splits n/2 + n/2 and n = 2 splits 1 + 1.'),
]

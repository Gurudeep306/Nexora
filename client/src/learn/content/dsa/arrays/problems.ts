import { codeQ } from '../../assemble'

const T = 'arrays'

/** Judged coding problems — one per problem in scripts/learn/problems/arrays.py. */
export const codeQuestions = [
  codeQ(T, 'arr-c-sum', 'traversal', 'Sum of the array', 'easy', 'Read n numbers and print their sum. Values can be large — mind the type.'),
  codeQ(T, 'arr-c-max-min', 'traversal', 'Maximum and minimum', 'easy', 'Print the largest and the smallest value in one pass.'),
  codeQ(T, 'arr-c-second', 'traversal', 'Second largest distinct', 'medium', 'Print the second largest distinct value, or -1 if there is none.'),
  codeQ(T, 'arr-c-insert', 'insert-delete', 'Insert at a position', 'easy', 'Insert x at position p and print the new array.'),
  codeQ(T, 'arr-c-delete', 'insert-delete', 'Delete at a position', 'easy', 'Delete the element at position p and print the array.'),
  codeQ(T, 'arr-c-linear-search', 'searching', 'First occurrence', 'easy', 'Print the index of the first occurrence of x, or -1.'),
  codeQ(T, 'arr-c-count', 'searching', 'Answer occurrence queries', 'medium', 'For each query value, print how many times it occurs.'),
  codeQ(T, 'arr-c-reverse', 'reverse-rotate', 'Reverse the array', 'easy', 'Print the array in reverse, reversing it in place.'),
  codeQ(T, 'arr-c-rotate', 'reverse-rotate', 'Rotate right by k', 'medium', 'Rotate the array right by k (k can exceed n).'),
  codeQ(T, 'arr-c-range-sum', 'prefix-sums', 'Range sum queries', 'medium', 'Answer q range-sum queries fast.'),
  codeQ(T, 'arr-c-equilibrium', 'prefix-sums', 'Equilibrium index', 'medium', 'First index where the sum on the left equals the sum on the right.'),
  codeQ(T, 'arr-c-range-add', 'prefix-sums', 'Many range additions', 'medium', 'Apply m range additions, then print the array.'),
  codeQ(T, 'arr-c-pair-sum', 'two-pointers', 'Pair with sum in a sorted array', 'easy', 'Decide whether two different positions sum to T.'),
  codeQ(T, 'arr-c-dedupe', 'two-pointers', 'Remove duplicates from a sorted array', 'easy', 'Print how many unique values, then the values.'),
  codeQ(T, 'arr-c-move-zeroes', 'two-pointers', 'Move zeroes to the end', 'easy', 'Keep the order of the non-zero values.'),
  codeQ(T, 'arr-c-window-max', 'sliding-window', 'Best window of size k', 'easy', 'Maximum sum of k consecutive elements.'),
  codeQ(T, 'arr-c-min-len', 'sliding-window', 'Shortest subarray with sum ≥ S', 'medium', 'Positive values; print 0 if impossible.'),
  codeQ(T, 'arr-c-longest-ones', 'sliding-window', 'Longest run of ones with k flips', 'medium', 'Flip at most k zeroes to ones; longest block of ones.'),
  codeQ(T, 'arr-c-kadane', 'kadane', 'Maximum subarray sum', 'medium', 'The largest sum of a non-empty contiguous subarray.'),
  codeQ(T, 'arr-c-transpose', '2d-arrays', 'Transpose a matrix', 'easy', 'Print the transpose of an R × C matrix.'),
  codeQ(T, 'arr-c-spiral', '2d-arrays', 'Spiral order', 'medium', 'Print the matrix elements in clockwise spiral order.'),
  codeQ(T, 'arr-c-rotate-matrix', '2d-arrays', 'Rotate a square matrix', 'medium', 'Rotate an N × N matrix 90° clockwise in place.'),
  codeQ(T, 'arr-c-leaders', 'traversal', 'Leaders of an array', 'easy', 'Print every element greater than all elements to its right.'),
  codeQ(T, 'arr-c-majority', 'traversal', 'Majority element', 'medium', 'Print the value that appears more than n/2 times, or -1 — in O(1) extra space.'),
  codeQ(T, 'arr-c-dutch', 'two-pointers', 'Sort 0s, 1s and 2s', 'medium', 'Sort in one pass without counting.'),
  codeQ(T, 'arr-c-merge', 'two-pointers', 'Merge two sorted arrays', 'easy', 'Merge A and B into one sorted array in O(n + m).'),
]

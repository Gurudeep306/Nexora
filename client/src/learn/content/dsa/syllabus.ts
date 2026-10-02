import type { SyllabusEntry, Topic, TopicMeta } from '../../types'
import arraysMeta from './arrays/meta'
import complexityMeta from './complexity/meta'
import mathMeta from './math/meta'
import recursionMeta from './recursion/meta'
import bitsMeta from './bits/meta'
import stringsMeta from './strings/meta'
import binary_searchMeta from './binary-search/meta'
import sorting_basicMeta from './sorting-basic/meta'
import sorting_advancedMeta from './sorting-advanced/meta'
import hashingMeta from './hashing/meta'
import linked_listsMeta from './linked-lists/meta'
import stacksMeta from './stacks/meta'
import queuesMeta from './queues/meta'
import binary_treesMeta from './binary-trees/meta'
import bstMeta from './bst/meta'
import heapsMeta from './heaps/meta'
import triesMeta from './tries/meta'
import segment_treesMeta from './segment-trees/meta'
import graph_basicsMeta from './graph-basics/meta'
import shortest_pathsMeta from './shortest-paths/meta'
import mst_dsuMeta from './mst-dsu/meta'
import topoMeta from './topo/meta'
import advanced_graphsMeta from './advanced-graphs/meta'
import greedyMeta from './greedy/meta'
import backtrackingMeta from './backtracking/meta'
import dp_1Meta from './dp-1/meta'
import dp_2Meta from './dp-2/meta'
import dp_3Meta from './dp-3/meta'
import string_algorithmsMeta from './string-algorithms/meta'
import interviewMeta from './interview/meta'

/**
 * The DSA course. Each topic lives in its own folder (pages, questions,
 * animations, coding problems) and lazy-loads, so the course never loads all
 * at once. A topic's meta.ts says whether it is ready and how many pages it
 * has, so this map can show status without loading the topic.
 */
export const DSA_UNITS: { id: string; title: string; blurb: string }[] = [
  { id: 'foundations', title: 'Foundations', blurb: 'How data sits in memory, how to measure cost, the maths and the recursion everything else builds on.' },
  { id: 'searching-sorting', title: 'Searching & sorting', blurb: 'Finding things fast and putting them in order.' },
  { id: 'linear', title: 'Linear structures', blurb: 'Lists, stacks, queues and the tricks they enable.' },
  { id: 'trees', title: 'Trees & heaps', blurb: 'Hierarchies, ordered sets, priority and range queries.' },
  { id: 'graphs', title: 'Graphs', blurb: 'Networks, paths, connectivity and flow.' },
  { id: 'paradigms', title: 'Paradigms', blurb: 'Greedy, backtracking and dynamic programming.' },
  { id: 'advanced', title: 'Advanced & interviews', blurb: 'String algorithms, and putting it all together under interview conditions.' },
]

function withLoad(meta: TopicMeta, load: () => Promise<{ default: Topic }>): Pick<SyllabusEntry, 'load' | 'pages'> {
  return meta.ready ? { pages: meta.pages, load: () => load().then((m) => m.default) } : {}
}

export const DSA_TOPICS: SyllabusEntry[] = [
  { id: 'arrays', unit: 'foundations', title: 'Arrays', blurb: 'Memory, traversal, insertion and deletion, searching, rotation, dynamic arrays, prefix and difference arrays, two and three pointers, merging, sliding windows, Kadane, 2D arrays and matrices.', ...withLoad(arraysMeta, () => import('./arrays')) },
  { id: 'complexity', unit: 'foundations', title: 'Complexity & Big-O', blurb: 'Counting steps, Big-O/Ω/Θ, loops and logs, growth classes, constraints, best/worst/average cases, space, amortized cost, recurrences and the Master theorem.', ...withLoad(complexityMeta, () => import('./complexity')) },
  { id: 'math', unit: 'foundations', title: 'Math for DSA', blurb: 'Divisibility, GCD and LCM, primes and sieves, modular arithmetic, fast power, modular inverse, combinatorics, Pascal, inclusion–exclusion, probability basics and number-theory patterns.', ...withLoad(mathMeta, () => import('./math')) },
  { id: 'recursion', unit: 'foundations', title: 'Recursion', blurb: 'The call stack, base cases, recursion trees, tail calls, divide and conquer, memoisation, and turning recursion into iteration.', ...withLoad(recursionMeta, () => import('./recursion')) },
  { id: 'bits', unit: 'foundations', title: 'Bit manipulation', blurb: 'Binary and two’s complement, masks, shifts, XOR tricks, counting bits, subsets as bitmasks, and bit-level tricks interviewers love.', ...withLoad(bitsMeta, () => import('./bits')) },
  { id: 'strings', unit: 'foundations', title: 'Strings', blurb: 'Characters and encodings, immutability, palindromes, anagrams, frequency counting, two pointers on strings, parsing, and classic string interview problems.', ...withLoad(stringsMeta, () => import('./strings')) },
  { id: 'binary-search', unit: 'searching-sorting', title: 'Binary search', blurb: 'On sorted arrays, lower and upper bounds, rotated arrays, binary search on the answer, and real-valued search.', ...withLoad(binary_searchMeta, () => import('./binary-search')) },
  { id: 'sorting-basic', unit: 'searching-sorting', title: 'Elementary sorts', blurb: 'Bubble, selection, insertion — invariants, stability, adaptivity, and when an O(n²) sort is the right one.', ...withLoad(sorting_basicMeta, () => import('./sorting-basic')) },
  { id: 'sorting-advanced', unit: 'searching-sorting', title: 'Merge, quick & counting sort', blurb: 'Divide and conquer, merging, partitioning schemes, quickselect, counting and radix sort, inversions, and the Ω(n log n) lower bound.', ...withLoad(sorting_advancedMeta, () => import('./sorting-advanced')) },
  { id: 'hashing', unit: 'searching-sorting', title: 'Hashing', blurb: 'Hash functions, chaining and open addressing, load factor and rehashing, sets and maps, frequency counting, and hashing patterns.', ...withLoad(hashingMeta, () => import('./hashing')) },
  { id: 'linked-lists', unit: 'linear', title: 'Linked lists', blurb: 'Singly, doubly and circular lists, insertion and deletion, reversal, fast/slow pointers, cycle detection, merging, and LRU-style designs.', ...withLoad(linked_listsMeta, () => import('./linked-lists')) },
  { id: 'stacks', unit: 'linear', title: 'Stacks', blurb: 'LIFO, balanced brackets, expression evaluation, monotonic stacks, next greater element, histograms, and min-stacks.', ...withLoad(stacksMeta, () => import('./stacks')) },
  { id: 'queues', unit: 'linear', title: 'Queues & deques', blurb: 'FIFO, circular buffers, deques, sliding-window maximum, monotonic queues, and queue-based simulations.', ...withLoad(queuesMeta, () => import('./queues')) },
  { id: 'binary-trees', unit: 'trees', title: 'Binary trees', blurb: 'Representations, DFS and BFS traversals, height, diameter, views, paths, LCA, construction from traversals and serialisation.', ...withLoad(binary_treesMeta, () => import('./binary-trees')) },
  { id: 'bst', unit: 'trees', title: 'Binary search trees', blurb: 'Search, insert, delete, successor, validation, k-th smallest, range queries, and balancing (AVL rotations, red-black overview).', ...withLoad(bstMeta, () => import('./bst')) },
  { id: 'heaps', unit: 'trees', title: 'Heaps & priority queues', blurb: 'Array-backed heaps, sift up and down, build-heap in O(n), heapsort, top-k, k-way merge, and running medians.', ...withLoad(heapsMeta, () => import('./heaps')) },
  { id: 'tries', unit: 'trees', title: 'Tries', blurb: 'Prefix trees for words, autocomplete, word search, and binary tries for maximum XOR.', ...withLoad(triesMeta, () => import('./tries')) },
  { id: 'segment-trees', unit: 'trees', title: 'Segment trees, Fenwick & sparse tables', blurb: 'Range queries with point and range updates, lazy propagation, Fenwick trees, and sparse tables for static queries.', ...withLoad(segment_treesMeta, () => import('./segment-trees')) },
  { id: 'graph-basics', unit: 'graphs', title: 'Graphs, BFS & DFS', blurb: 'Representations, BFS and DFS, connected components, cycle detection, bipartiteness, grids as graphs, and multi-source BFS.', ...withLoad(graph_basicsMeta, () => import('./graph-basics')) },
  { id: 'shortest-paths', unit: 'graphs', title: 'Shortest paths', blurb: 'Dijkstra, Bellman-Ford, 0-1 BFS, Floyd–Warshall, shortest paths in DAGs, and negative cycles.', ...withLoad(shortest_pathsMeta, () => import('./shortest-paths')) },
  { id: 'mst-dsu', unit: 'graphs', title: 'MST & union-find', blurb: 'Disjoint set union with path compression and union by rank, Kruskal, Prim, and connectivity problems.', ...withLoad(mst_dsuMeta, () => import('./mst-dsu')) },
  { id: 'topo', unit: 'graphs', title: 'Topological sort', blurb: 'DAGs, Kahn’s algorithm, DFS ordering, cycle detection, scheduling, and longest paths in DAGs.', ...withLoad(topoMeta, () => import('./topo')) },
  { id: 'advanced-graphs', unit: 'graphs', title: 'Advanced graphs', blurb: 'Strongly connected components, bridges and articulation points, Euler paths, bipartite matching, and max flow.', ...withLoad(advanced_graphsMeta, () => import('./advanced-graphs')) },
  { id: 'greedy', unit: 'paradigms', title: 'Greedy algorithms', blurb: 'Exchange arguments, interval scheduling, activity selection, Huffman coding, and when greedy fails.', ...withLoad(greedyMeta, () => import('./greedy')) },
  { id: 'backtracking', unit: 'paradigms', title: 'Backtracking', blurb: 'Subsets, permutations, combinations, N-queens, Sudoku, word search, and pruning the search tree.', ...withLoad(backtrackingMeta, () => import('./backtracking')) },
  { id: 'dp-1', unit: 'paradigms', title: 'Dynamic programming I', blurb: 'States and transitions, memoisation vs tabulation, 1D DP, the knapsack family, LIS, and grid paths.', ...withLoad(dp_1Meta, () => import('./dp-1')) },
  { id: 'dp-2', unit: 'paradigms', title: 'Dynamic programming II', blurb: 'DP on strings (LCS, edit distance), intervals, partitions, palindromes, and game theory.', ...withLoad(dp_2Meta, () => import('./dp-2')) },
  { id: 'dp-3', unit: 'paradigms', title: 'Dynamic programming III', blurb: 'Bitmask DP, digit DP, DP on trees and DAGs, and optimisations: monotonic queue, divide and conquer, and convex hull trick.', ...withLoad(dp_3Meta, () => import('./dp-3')) },
  { id: 'string-algorithms', unit: 'advanced', title: 'String algorithms', blurb: 'KMP, the Z-function, Rabin–Karp rolling hashes, Manacher, and suffix arrays.', ...withLoad(string_algorithmsMeta, () => import('./string-algorithms')) },
  { id: 'interview', unit: 'advanced', title: 'Interview playbook', blurb: 'A problem-solving framework, pattern recognition across the whole course, company-style mixed sets, and timed mock interviews.', ...withLoad(interviewMeta, () => import('./interview')) },
]

export const findTopic = (id: string) => DSA_TOPICS.find((t) => t.id === id)

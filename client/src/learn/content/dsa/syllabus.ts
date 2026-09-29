import type { SyllabusEntry } from '../../types'

/**
 * The DSA course. Topics are written one by one; each ready topic lazy-loads
 * its pages, animations and question bank, so the course never loads all at
 * once.
 */
export const DSA_UNITS: { id: string; title: string; blurb: string }[] = [
  { id: 'foundations', title: 'Foundations', blurb: 'How data sits in memory, how to measure cost, and the patterns everything else builds on.' },
  { id: 'searching-sorting', title: 'Searching & sorting', blurb: 'Finding things fast and putting them in order.' },
  { id: 'linear', title: 'Linear structures', blurb: 'Lists, stacks, queues and the tricks they enable.' },
  { id: 'trees', title: 'Trees & heaps', blurb: 'Hierarchies, ordered sets and priority.' },
  { id: 'graphs', title: 'Graphs', blurb: 'Networks, paths and connectivity.' },
  { id: 'paradigms', title: 'Paradigms', blurb: 'Greedy, backtracking and dynamic programming.' },
]

export const DSA_TOPICS: SyllabusEntry[] = [
  { id: 'arrays', unit: 'foundations', title: 'Arrays', blurb: 'Memory, traversal, shifting, rotation, dynamic arrays, prefix sums, two pointers, sliding windows, Kadane, 2D.', pages: 12, load: () => import('./arrays').then((m) => m.default) },
  { id: 'complexity', unit: 'foundations', title: 'Complexity & Big-O', blurb: 'Counting steps, growth rates, best/worst/average and amortized cost.' },
  { id: 'strings', unit: 'foundations', title: 'Strings', blurb: 'Characters, encodings, palindromes, anagrams, pattern matching basics.' },
  { id: 'recursion', unit: 'foundations', title: 'Recursion', blurb: 'The call stack, base cases, recursion trees and memoisation.' },
  { id: 'bits', unit: 'foundations', title: 'Bit manipulation', blurb: 'Binary, masks, XOR tricks and subsets.' },
  { id: 'binary-search', unit: 'searching-sorting', title: 'Binary search', blurb: 'On arrays, on answers, lower/upper bounds.' },
  { id: 'sorting-basic', unit: 'searching-sorting', title: 'Elementary sorts', blurb: 'Bubble, selection, insertion — and what stability means.' },
  { id: 'sorting-advanced', unit: 'searching-sorting', title: 'Merge, quick & counting sort', blurb: 'Divide and conquer, partitioning, linear-time sorts.' },
  { id: 'hashing', unit: 'searching-sorting', title: 'Hashing', blurb: 'Hash tables, collisions, sets, maps and frequency counting.' },
  { id: 'linked-lists', unit: 'linear', title: 'Linked lists', blurb: 'Singly, doubly, reversal, fast/slow pointers, merging.' },
  { id: 'stacks', unit: 'linear', title: 'Stacks', blurb: 'LIFO, bracket matching, expression evaluation, monotonic stacks.' },
  { id: 'queues', unit: 'linear', title: 'Queues & deques', blurb: 'FIFO, circular buffers, sliding-window maximum.' },
  { id: 'binary-trees', unit: 'trees', title: 'Binary trees', blurb: 'Traversals, height, diameter, views and paths.' },
  { id: 'bst', unit: 'trees', title: 'Binary search trees', blurb: 'Search, insert, delete, balance and ordered queries.' },
  { id: 'heaps', unit: 'trees', title: 'Heaps & priority queues', blurb: 'Sift up/down, heapsort, top-k, merging streams.' },
  { id: 'tries', unit: 'trees', title: 'Tries', blurb: 'Prefix trees for words and bits.' },
  { id: 'segment-trees', unit: 'trees', title: 'Segment & Fenwick trees', blurb: 'Range queries with updates.' },
  { id: 'graph-basics', unit: 'graphs', title: 'Graphs, BFS & DFS', blurb: 'Representations, traversal, components, cycles, grids.' },
  { id: 'shortest-paths', unit: 'graphs', title: 'Shortest paths', blurb: 'Dijkstra, Bellman-Ford, 0-1 BFS, Floyd–Warshall.' },
  { id: 'mst-dsu', unit: 'graphs', title: 'MST & union-find', blurb: 'Kruskal, Prim, disjoint set union.' },
  { id: 'topo', unit: 'graphs', title: 'Topological sort', blurb: 'DAGs, Kahn’s algorithm, scheduling.' },
  { id: 'greedy', unit: 'paradigms', title: 'Greedy algorithms', blurb: 'Exchange arguments, intervals, scheduling.' },
  { id: 'backtracking', unit: 'paradigms', title: 'Backtracking', blurb: 'Subsets, permutations, N-queens, pruning.' },
  { id: 'dp-1', unit: 'paradigms', title: 'Dynamic programming I', blurb: '1D DP, knapsack, LIS, grid paths.' },
  { id: 'dp-2', unit: 'paradigms', title: 'Dynamic programming II', blurb: 'Strings, intervals, bitmasks, trees.' },
]

export const findTopic = (id: string) => DSA_TOPICS.find((t) => t.id === id)

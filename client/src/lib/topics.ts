/*
  Topics: which kind of problem each question is (Arrays, Graphs, DP…).
  The same fixed list as the server (src/topics.js); tests/topics.test.js
  checks the two stay equal. Each problem from /api/problems carries
  `topics`, a list of these ids.
*/

export interface Topic {
  id: string
  label: string
  group: string
}

export const TOPICS: Topic[] = [
  { id: 'arrays', label: 'Arrays', group: 'Basics' },
  { id: 'strings', label: 'Strings', group: 'Basics' },
  { id: 'implementation', label: 'Implementation', group: 'Basics' },
  { id: 'simulation', label: 'Simulation', group: 'Basics' },
  { id: 'math', label: 'Math', group: 'Math' },
  { id: 'number-theory', label: 'Number theory', group: 'Math' },
  { id: 'combinatorics', label: 'Combinatorics', group: 'Math' },
  { id: 'probability', label: 'Probability', group: 'Math' },
  { id: 'geometry', label: 'Geometry', group: 'Math' },
  { id: 'game-theory', label: 'Game theory', group: 'Math' },
  { id: 'matrices', label: 'Matrices', group: 'Math' },
  { id: 'bit-manipulation', label: 'Bit manipulation', group: 'Math' },
  { id: 'hashing', label: 'Hashing', group: 'Techniques' },
  { id: 'two-pointers', label: 'Two pointers', group: 'Techniques' },
  { id: 'sliding-window', label: 'Sliding window', group: 'Techniques' },
  { id: 'prefix-sums', label: 'Prefix sums', group: 'Techniques' },
  { id: 'sorting', label: 'Sorting', group: 'Techniques' },
  { id: 'binary-search', label: 'Binary search', group: 'Techniques' },
  { id: 'greedy', label: 'Greedy', group: 'Techniques' },
  { id: 'recursion', label: 'Recursion', group: 'Techniques' },
  { id: 'backtracking', label: 'Backtracking', group: 'Techniques' },
  { id: 'divide-and-conquer', label: 'Divide and conquer', group: 'Techniques' },
  { id: 'brute-force', label: 'Brute force', group: 'Techniques' },
  { id: 'constructive', label: 'Constructive', group: 'Techniques' },
  { id: 'interactive', label: 'Interactive', group: 'Techniques' },
  { id: 'stack', label: 'Stack', group: 'Data structures' },
  { id: 'queue', label: 'Queue / deque', group: 'Data structures' },
  { id: 'linked-list', label: 'Linked list', group: 'Data structures' },
  { id: 'heap', label: 'Heap', group: 'Data structures' },
  { id: 'trees', label: 'Trees', group: 'Data structures' },
  { id: 'bst', label: 'Binary search tree', group: 'Data structures' },
  { id: 'trie', label: 'Trie', group: 'Data structures' },
  { id: 'segment-tree', label: 'Segment tree / Fenwick', group: 'Data structures' },
  { id: 'union-find', label: 'Union-find', group: 'Data structures' },
  { id: 'data-structures', label: 'Data structures', group: 'Data structures' },
  { id: 'graphs', label: 'Graphs', group: 'Graphs' },
  { id: 'bfs-dfs', label: 'BFS / DFS', group: 'Graphs' },
  { id: 'shortest-paths', label: 'Shortest paths', group: 'Graphs' },
  { id: 'mst', label: 'Minimum spanning tree', group: 'Graphs' },
  { id: 'topological-sort', label: 'Topological sort', group: 'Graphs' },
  { id: 'flows', label: 'Flows and matching', group: 'Graphs' },
  { id: 'dp', label: 'Dynamic programming', group: 'Dynamic programming' },
  { id: 'dp-bitmask', label: 'Bitmask DP', group: 'Dynamic programming' },
  { id: 'dp-trees', label: 'DP on trees', group: 'Dynamic programming' },
  { id: 'dp-digits', label: 'Digit DP', group: 'Dynamic programming' },
  { id: 'string-algorithms', label: 'String algorithms', group: 'Advanced' },
  { id: 'fft', label: 'FFT', group: 'Advanced' },
  { id: 'database', label: 'Database (SQL)', group: 'Other' },
]

export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]))

/** The groups in list order (Basics, Math, Techniques, …). */
export const TOPIC_GROUPS = [...new Set(TOPICS.map((t) => t.group))]

export function topicLabel(id: string): string {
  return TOPIC_BY_ID.get(id)?.label ?? id.replace(/-/g, ' ')
}

/** Known topic ids from a list (or its JSON text); unknown ids are dropped. */
export function topicIds(raw: unknown): string[] {
  let list: unknown = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      return []
    }
  }
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && TOPIC_BY_ID.has(x)) : []
}

/** Topic ids from a URL value like 'dp,graphs'. */
export function parseTopicParam(v: string | null): string[] {
  return [...new Set((v ?? '').split(',').map((s) => s.trim()).filter((s) => TOPIC_BY_ID.has(s)))]
}

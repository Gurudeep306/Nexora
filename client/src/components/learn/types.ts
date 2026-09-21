/* Shared types for the Learn hub (bound to src/routes/learning.js). */

export interface Tutorial {
  id: number
  category: string
  topic: string
  title: string
  description: string
  content: string // HTML (server-seeded)
  difficulty: string
  order_index: number
  estimated_time: string
  prerequisites: string // JSON string
  code_examples: string // JSON string of related topic keywords
  completed: 0 | 1
}

export interface TutorialStats {
  total: number
  completed: number
  byCategory: { category: string; total: number; completed: number }[]
}

export interface TutorialProblem {
  id: number
  title: string
  rating: number
  platform: string
  url?: string
  solve_status?: string
}

export type ForgeTopicStatus = 'not-started' | 'in-progress' | 'completed'

export interface ForgeTopic {
  id: string
  title: string
  desc: string
  difficulty: string
  time: string
  status: ForgeTopicStatus
}

export interface ForgeMilestone {
  id?: string
  title: string
  topics: ForgeTopic[]
}

export interface ForgePath {
  id: string
  title: string
  icon: string
  color: string
  description: string
  milestones: ForgeMilestone[]
  totalTopics: number
  completedTopics: number
  inProgressTopics: number
  progress: number
}

export interface ForgeStats {
  total: number
  completed: number
  inProgress: number
}

/* Display grouping for the ~37 tutorial categories (mirrors the legacy subject catalog). */
export const CATEGORY_GROUPS: { group: string; categories: { id: string; label: string }[] }[] = [
  {
    group: 'Competitive Programming',
    categories: [
      { id: 'cp', label: 'CP Core' },
      { id: 'math', label: 'Mathematics' },
      { id: 'discrete', label: 'Discrete Math' },
      { id: 'numerical', label: 'Numerical Methods' },
    ],
  },
  {
    group: 'AI / ML',
    categories: [
      { id: 'ai', label: 'AI & ML' },
      { id: 'cv', label: 'Computer Vision' },
      { id: 'nlpcat', label: 'NLP' },
      { id: 'datascience', label: 'Data Science' },
      { id: 'bigdata', label: 'Big Data' },
    ],
  },
  {
    group: 'Languages',
    categories: [
      { id: 'python', label: 'Python' },
      { id: 'cpp', label: 'C++' },
      { id: 'clang', label: 'C' },
      { id: 'java', label: 'Java' },
      { id: 'javascript', label: 'JavaScript' },
      { id: 'typescript', label: 'TypeScript' },
      { id: 'golang', label: 'Go' },
      { id: 'rust', label: 'Rust' },
      { id: 'oop', label: 'OOP' },
    ],
  },
  {
    group: 'Systems (GATE core)',
    categories: [
      { id: 'os', label: 'Operating Systems' },
      { id: 'cn', label: 'Networks' },
      { id: 'coa', label: 'Architecture' },
      { id: 'dbms', label: 'DBMS' },
      { id: 'toc', label: 'Theory of Computation' },
      { id: 'cd', label: 'Compiler Design' },
      { id: 'digital', label: 'Digital Logic' },
      { id: 'parallel', label: 'Parallel Computing' },
      { id: 'distributed', label: 'Distributed Systems' },
    ],
  },
  {
    group: 'Design & More',
    categories: [
      { id: 'sysdesign', label: 'System Design' },
      { id: 'web', label: 'Web Dev' },
      { id: 'se', label: 'Software Engineering' },
      { id: 'cloud', label: 'Cloud' },
      { id: 'security', label: 'Security' },
      { id: 'graphics', label: 'Graphics' },
      { id: 'hci', label: 'HCI' },
      { id: 'embedded', label: 'Embedded' },
      { id: 'iot', label: 'IoT' },
      { id: 'blockchain', label: 'Blockchain' },
    ],
  },
]

const LABELS = new Map<string, string>()
for (const g of CATEGORY_GROUPS) for (const c of g.categories) LABELS.set(c.id, c.label)

export function categoryLabel(id: string): string {
  return LABELS.get(id) ?? id.toUpperCase()
}

export function parseJsonList<T>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : fallback
  } catch {
    return fallback
  }
}

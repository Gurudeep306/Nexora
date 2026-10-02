import {
  BrainCircuit,
  Binary,
  Cpu,
  Database,
  Layers,
  Terminal,
  type LucideIcon,
} from 'lucide-react'

/**
 * What Nexora teaches, grouped the way a CS degree is. Mirrors the lesson
 * categories in src/tutorial-data.js, the DSA course syllabus, the AI Lab
 * domains and the Forge career roadmaps on the server — keep in step when
 * those grow.
 */

export interface Track {
  id: string
  title: string
  blurb: string
  icon: LucideIcon
  hue: string
  subjects: string[]
}

export const TRACKS: Track[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    blurb: 'The ideas every other subject stands on.',
    icon: Binary,
    hue: 'from-primary/30 to-primary/5 text-primary-bright border-primary/30',
    subjects: ['Data Structures', 'Algorithms', 'Complexity', 'Discrete Math', 'Theory of Computation', 'Numerical Methods'],
  },
  {
    id: 'systems',
    title: 'Systems',
    blurb: 'From logic gates to the kernel.',
    icon: Cpu,
    hue: 'from-cyan/30 to-cyan/5 text-cyan border-cyan/30',
    subjects: ['Operating Systems', 'Computer Organization', 'Digital Logic', 'Compiler Design', 'Parallel Computing', 'Embedded & IoT'],
  },
  {
    id: 'data',
    title: 'Data & Networks',
    blurb: 'How data is stored, moved and shared.',
    icon: Database,
    hue: 'from-success/30 to-success/5 text-success border-success/30',
    subjects: ['DBMS', 'Computer Networks', 'Distributed Systems', 'Cloud', 'Big Data', 'Information Retrieval'],
  },
  {
    id: 'ai',
    title: 'AI & Data Science',
    blurb: 'Models you understand, not just import.',
    icon: BrainCircuit,
    hue: 'from-accent/30 to-accent/5 text-accent border-accent/30',
    subjects: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Generative AI', 'Reinforcement Learning'],
  },
  {
    id: 'software',
    title: 'Software Engineering',
    blurb: 'Building things that last.',
    icon: Layers,
    hue: 'from-warning/30 to-warning/5 text-warning border-warning/30',
    subjects: ['OOP', 'System Design', 'Software Engineering', 'Web', 'Security', 'HCI & Graphics'],
  },
  {
    id: 'languages',
    title: 'Languages',
    blurb: 'Learn one deeply, read them all.',
    icon: Terminal,
    hue: 'from-gold/30 to-gold/5 text-gold border-gold/30',
    subjects: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust'],
  },
]

/** Every subject, flattened, for tickers. */
export const ALL_SUBJECTS = TRACKS.flatMap((t) => t.subjects)

/** Forge roadmaps (src/dev-roadmap-data.js) with their stage counts. */
export const CAREER_PATHS: { title: string; stages: number }[] = [
  { title: 'Frontend', stages: 5 },
  { title: 'Backend', stages: 4 },
  { title: 'DevOps & Cloud', stages: 5 },
  { title: 'System Design', stages: 4 },
  { title: 'Mobile', stages: 3 },
  { title: 'Data Engineering', stages: 2 },
  { title: 'Cybersecurity', stages: 2 },
  { title: 'Software Engineering', stages: 3 },
]

/** Headline numbers — conservative floors of what ships today. */
export const FACTS = {
  subjects: '35+',
  lessons: '140+',
  animations: '30+',
  aiProblems: '48',
  paths: '8',
  languages: '30+',
}

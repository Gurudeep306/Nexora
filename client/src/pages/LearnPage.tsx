import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LessonFinder } from '@/components/learn/LessonFinder'
import { BackButton } from '@/components/ui/BackButton'
import { TutorialsPanel } from '@/components/learn/TutorialsPanel'
import { PathsPanel } from '@/components/learn/PathsPanel'
import { LearnHome } from '@/components/learn/LearnHome'
import '@/components/learn/learn-home.css'

const VIEWS: Record<string, { title: string; line: string }> = {
  tutorials: { title: 'Tutorials', line: 'Deep dives on single topics.' },
  paths: { title: 'Paths', line: 'Guided journeys across subjects.' },
}

/**
 * /learn — one page to start from (LearnHome). The deeper views (?tab=tutorials,
 * paths) keep their links and open with a way back.
 */
export default function LearnPage() {
  const [params] = useSearchParams()
  const tab = params.get('tab') ?? ''
  const view = VIEWS[tab]

  // The DSA course map lives on the DSA subject page now (its Lessons tab).
  if (tab === 'dsa') return <Navigate to="/learn/dsa" replace />
  if (!view || tab === 'subjects')
    return (
      <div>
        <header className="mb-12 md:mb-16">
          <p className="ed-label ed-muted m-0">The Library</p>
          <h1 className="ed-title mt-3 mb-0">Learn</h1>
          <p className="ed-lead mt-3 mb-0 max-w-[60ch]">Pick up where you left off, or open a subject: its lessons, skill tree and practice sit together.</p>
          <LessonFinder className="mt-8 max-w-2xl" />
          <p className="ed-muted mt-4 mb-0 text-[14.5px]">
            <Link to="/learn/ai-courses" className="underline underline-offset-2">AI courses</Link>: ten courses, from school maths to how big models are built.
          </p>
        </header>
        <LearnHome />
      </div>
    )

  return (
    <div>
      <header className="mb-8">
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="ed-label ed-muted m-0">The Library</p>
        <h1 className="ed-title mt-3 mb-0">{view.title}</h1>
        <p className="ed-lead mt-3 mb-0 max-w-[60ch]">{view.line}</p>
      </header>
      {tab === 'tutorials' ? <TutorialsPanel /> : <PathsPanel />}
    </div>
  )
}

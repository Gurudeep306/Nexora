import { useSearchParams } from 'react-router-dom'
import { BackButton } from '@/components/ui/BackButton'
import { CourseOverview } from '@/learn/ui/CourseOverview'
import { TutorialsPanel } from '@/components/learn/TutorialsPanel'
import { PathsPanel } from '@/components/learn/PathsPanel'
import { SystemDesignStudio } from '@/learn/system-design/components/SystemDesignStudio'
import { LearnHome } from '@/components/learn/LearnHome'
import '@/components/learn/learn-home.css'

const VIEWS: Record<string, { title: string; line: string }> = {
  dsa: { title: 'DSA course', line: 'Thirty chapters, unit by unit. Every idea animated, every problem in five languages.' },
  sysdesign: { title: 'System Design Studio', line: 'Build real architectures and watch them under load.' },
  tutorials: { title: 'Tutorials', line: 'Deep dives on single topics.' },
  paths: { title: 'Paths', line: 'Guided journeys across subjects.' },
}

/**
 * /learn — one page to start from (LearnHome). The deeper views (?tab=dsa,
 * sysdesign, tutorials, paths) keep their links and open with a way back.
 */
export default function LearnPage() {
  const [params] = useSearchParams()
  const tab = params.get('tab') ?? ''
  const view = VIEWS[tab]

  if (!view || tab === 'subjects')
    return (
      <div>
        <header className="mb-12 md:mb-16">
          <p className="ed-label ed-muted m-0">The Library</p>
          <h1 className="ed-title mt-3 mb-0">Learn</h1>
          <p className="ed-lead mt-3 mb-0 max-w-[60ch]">Pick up where you left off, or open a subject: its lessons, skill tree and practice sit together.</p>
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
      {tab === 'dsa' ? <CourseOverview /> : tab === 'sysdesign' ? <SystemDesignStudio /> : tab === 'tutorials' ? <TutorialsPanel /> : <PathsPanel />}
    </div>
  )
}

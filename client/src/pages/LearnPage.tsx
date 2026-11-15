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
        <header className="mb-10">
          <h1 className="m-0 text-[32px] leading-tight font-semibold tracking-[-0.03em] text-text-primary md:text-[40px]">Learn</h1>
          <p className="mt-2 mb-0 max-w-[60ch] text-[15px] text-text-secondary">Pick up where you left off, or start a subject: lessons, its skill tree and practice sit together.</p>
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
        <h1 className="m-0 text-[30px] leading-tight font-semibold tracking-[-0.03em] text-text-primary md:text-[36px]">{view.title}</h1>
        <p className="mt-2 mb-0 max-w-[60ch] text-[15px] text-text-secondary">{view.line}</p>
      </header>
      {tab === 'dsa' ? <CourseOverview /> : tab === 'sysdesign' ? <SystemDesignStudio /> : tab === 'tutorials' ? <TutorialsPanel /> : <PathsPanel />}
    </div>
  )
}

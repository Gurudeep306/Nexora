import { useState } from 'react'
import { PageHeader, Tabs } from '@/components/ui'
import { BookOpen, GraduationCap, Map } from 'lucide-react'
import { CourseOverview } from '@/learn/ui/CourseOverview'
import { TutorialsPanel } from '@/components/learn/TutorialsPanel'
import { PathsPanel } from '@/components/learn/PathsPanel'

const TABS = [
  { id: 'dsa', label: 'DSA Course', icon: <GraduationCap className="size-4" /> },
  { id: 'tutorials', label: 'Tutorials', icon: <BookOpen className="size-4" /> },
  { id: 'paths', label: 'Forge Paths', icon: <Map className="size-4" /> },
]

export default function LearnPage() {
  const [tab, setTab] = useState('dsa')

  return (
    <div>
      <PageHeader
        title="Learn"
        subtitle="The DSA course with animated lessons and a question bank, deep-dive tutorial chapters, and the Forge roadmap journeys."
      />
      <Tabs items={TABS} active={tab} onChange={setTab} className="mb-5" />
      {tab === 'dsa' ? <CourseOverview /> : tab === 'tutorials' ? <TutorialsPanel /> : <PathsPanel />}
    </div>
  )
}

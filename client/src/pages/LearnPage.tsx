import { useState } from 'react'
import { PageHeader, Tabs } from '@/components/ui'
import { BookOpen, Map } from 'lucide-react'
import { TutorialsPanel } from '@/components/learn/TutorialsPanel'
import { PathsPanel } from '@/components/learn/PathsPanel'

const TABS = [
  { id: 'tutorials', label: 'Tutorials', icon: <BookOpen className="size-4" /> },
  { id: 'paths', label: 'Forge Paths', icon: <Map className="size-4" /> },
]

export default function LearnPage() {
  const [tab, setTab] = useState('tutorials')

  return (
    <div>
      <PageHeader
        title="Learn"
        subtitle="Study the craft — deep-dive tutorial chapters with practice problems, plus the Forge roadmap journeys from rookie to engineer."
      />
      <Tabs items={TABS} active={tab} onChange={setTab} className="mb-5" />
      {tab === 'tutorials' ? <TutorialsPanel /> : <PathsPanel />}
    </div>
  )
}

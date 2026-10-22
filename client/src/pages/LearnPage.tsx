import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Tabs } from '@/components/ui'
import { CourseOverview } from '@/learn/ui/CourseOverview'
import { TutorialsPanel } from '@/components/learn/TutorialsPanel'
import { PathsPanel } from '@/components/learn/PathsPanel'
import { SystemDesignStudio } from '@/learn/system-design/components/SystemDesignStudio'
import { LearnSubjectsHub } from '@/components/nexus/SubjectsHub'
import { Icon } from '@/components/icon/Icon'

const TABS = [
  { id: 'subjects', label: 'All subjects', icon: <Icon name="map" className="size-4" /> },
  { id: 'dsa', label: 'DSA Course', icon: <Icon name="learn" className="size-4" /> },
  { id: 'sysdesign', label: 'System Design Studio', icon: <Icon name="system-design" className="size-4" /> },
  { id: 'tutorials', label: 'Tutorials', icon: <Icon name="book" className="size-4" /> },
  { id: 'paths', label: 'Forge Paths', icon: <Icon name="map" className="size-4" /> },
]
const DEFAULT_TAB = 'subjects'

export default function LearnPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || DEFAULT_TAB
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    const currentParam = searchParams.get('tab') || DEFAULT_TAB
    if (currentParam !== tab) {
      setTab(currentParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setSearchParams(newTab === DEFAULT_TAB ? {} : { tab: newTab })
  }

  return (
    <div>
      <PageHeader
        icon="learn"
        title="Learn"
        subtitle="Every subject as a course tree, the DSA course, interactive System Design, deep-dive tutorials and Forge journey paths."
      />
      <Tabs items={TABS} active={tab} onChange={handleTabChange} className="mb-5" />
      {tab === 'subjects' ? (
        <LearnSubjectsHub />
      ) : tab === 'dsa' ? (
        <CourseOverview />
      ) : tab === 'sysdesign' ? (
        <SystemDesignStudio />
      ) : tab === 'tutorials' ? (
        <TutorialsPanel />
      ) : (
        <PathsPanel />
      )}
    </div>
  )
}

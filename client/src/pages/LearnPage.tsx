import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Tabs } from '@/components/ui'
import { BookOpen, GraduationCap, Map, Server } from 'lucide-react'
import { CourseOverview } from '@/learn/ui/CourseOverview'
import { TutorialsPanel } from '@/components/learn/TutorialsPanel'
import { PathsPanel } from '@/components/learn/PathsPanel'
import { SystemDesignStudio } from '@/learn/system-design/components/SystemDesignStudio'

const TABS = [
  { id: 'dsa', label: 'DSA Course', icon: <GraduationCap className="size-4" /> },
  { id: 'sysdesign', label: 'System Design Studio', icon: <Server className="size-4" /> },
  { id: 'tutorials', label: 'Tutorials', icon: <BookOpen className="size-4" /> },
  { id: 'paths', label: 'Forge Paths', icon: <Map className="size-4" /> },
]

export default function LearnPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'dsa'
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    const currentParam = searchParams.get('tab')
    if (currentParam && currentParam !== tab) {
      setTab(currentParam)
    }
  }, [searchParams])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setSearchParams(newTab === 'dsa' ? {} : { tab: newTab })
  }

  return (
    <div>
      <PageHeader
        title="Learn"
        subtitle="Master Data Structures, interactive System Design visualizations, deep-dive tutorials, and Forge journey paths."
      />
      <Tabs items={TABS} active={tab} onChange={handleTabChange} className="mb-5" />
      {tab === 'dsa' ? (
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

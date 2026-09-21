import { useState } from 'react'
import { PageHeader, Tabs } from '@/components/ui'
import { Bot, BrainCircuit, MessageSquareCode, Swords } from 'lucide-react'
import { AiChatPanel } from '@/components/ailab/AiChatPanel'
import { AiProblemsPanel } from '@/components/ailab/AiProblemsPanel'
import { AiBattlePanel } from '@/components/ailab/AiBattlePanel'

const TABS = [
  { id: 'chat', label: 'AI Tutor', icon: <MessageSquareCode className="size-4" /> },
  { id: 'problems', label: 'AI Problems', icon: <BrainCircuit className="size-4" /> },
  { id: 'battle', label: 'AI Battle', icon: <Swords className="size-4" /> },
]

export default function AiLabPage() {
  const [tab, setTab] = useState('chat')

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Bot className="size-7 text-cyan" aria-hidden="true" />
            AI LAB
          </span>
        }
        subtitle="Train with the machine — conceptual tutoring, generated AI/ML practice problems, and head-to-head speed races."
      />
      <Tabs items={TABS} active={tab} onChange={setTab} className="mb-5" />
      {tab === 'chat' && <AiChatPanel />}
      {tab === 'problems' && <AiProblemsPanel />}
      {tab === 'battle' && <AiBattlePanel />}
    </div>
  )
}

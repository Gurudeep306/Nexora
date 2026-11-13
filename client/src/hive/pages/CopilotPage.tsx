/* Hive Copilot — full page. */
import { Bot } from 'lucide-react'
import { CopilotThread } from '../Copilot'

export default function CopilotPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b hive-line px-4 py-3 sm:px-6">
        <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(68%_0.17_285),oklch(70%_0.15_200))] text-white shadow">
          <Bot className="size-5" />
        </span>
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">Copilot</h1>
          <p className="text-[12px] text-text-muted">Your chief of staff — plans, delegates to the right agents, reviews and reports.</p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CopilotThread />
      </div>
    </div>
  )
}

/* Hive Copilot — full page. Two intents: "Do it" (the Copilot plans,
   delegates and reports back) and "Plan a team" (split the work, pick the
   cheapest capable model per part, review the plan, then run — formerly the
   Dispatcher, still at /hive/dispatch via redirect). */
import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CopilotThread } from '../Copilot'
import { SegmentedControl } from '../kit'

const DispatchPage = lazy(() => import('./DispatchPage'))

type Mode = 'do' | 'team'
const HELP: Record<Mode, string> = {
  do: 'Plans the work, puts the right agents on it, checks it and reports back.',
  team: 'Splits the work into parts, picks the cheapest capable model for each, and lets you review the plan before it runs.',
}

export default function CopilotPage() {
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('mode') === 'team' ? 'team' : 'do'
  const setMode = (m: Mode) =>
    setParams(
      (p) => {
        if (m === 'team') p.set('mode', 'team')
        else p.delete('mode')
        return p
      },
      { replace: true },
    )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 sm:px-6">
        <h1 className="sr-only">Copilot</h1>
        {/* Plan a team explains itself under its own title; don't say it twice. */}
        <p className="m-0 min-w-0 flex-1 truncate text-[13px] text-[var(--hv-text-2)]">{mode === 'do' ? HELP.do : ''}</p>
        <SegmentedControl
          className="ml-auto"
          size="sm"
          label="What should the Copilot do?"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'do', label: 'Do it', hint: HELP.do },
            { value: 'team', label: 'Plan a team', hint: HELP.team },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === 'team' ? (
          <Suspense fallback={<div className="hive-shimmer m-6 h-40 rounded-2xl" />}>
            <DispatchPage />
          </Suspense>
        ) : (
          <CopilotThread />
        )}
      </div>
    </div>
  )
}

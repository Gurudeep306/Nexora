import { Suspense, lazy } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useHive } from '../store'
import { Spinner, StatusPill } from '../kit'

const LiveTerminal = lazy(() => import('../LiveTerminal'))

/** A full-page live terminal on one machine (optionally in a chosen folder). */
export default function MachineTerminalPage() {
  const { machineId = '' } = useParams()
  const [q] = useSearchParams()
  const folder = q.get('folder') || ''
  const { machines } = useHive()
  const m = machines.find((x) => x.id === machineId)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--hv-border-subtle)] px-4 py-2.5 md:px-6">
        <Link to="/hive/machines" aria-label="Back to machines" className="hv-term-icon -ml-1.5">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--hv-text-1)]">{m ? `Terminal · ${m.name}` : 'Terminal'}</h1>
          <p className="hidden truncate text-[12px] text-[var(--hv-text-3)] sm:block">A real shell on the machine. Everything you type runs there, as the bridge's user.</p>
        </div>
        {m && <StatusPill className="ml-auto" status={m.online ? 'done' : 'stopped'} label={m.online ? 'Online' : 'Offline'} size="sm" />}
      </header>
      <div className="min-h-0 flex-1">
        {!machines.length ? (
          <div className="grid h-full place-items-center">
            <Spinner label="Loading machines" />
          </div>
        ) : !m ? (
          <p className="p-6 text-[13.5px] text-[var(--hv-text-2)]">That machine isn't in Hive any more.</p>
        ) : (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center">
                <Spinner label="Loading terminal" />
              </div>
            }
          >
            <LiveTerminal key={`${m.id}:${folder}`} machineId={m.id} machineName={m.name} folder={folder} online={m.online} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

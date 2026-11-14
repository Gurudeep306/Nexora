/* Dev-only gallery (/hive/dev/ui): every kit primitive in every state, in the
   current theme. Not routed in production builds. */
import { useState } from 'react'
import { FolderGit2, Inbox, MoreHorizontal, Plus, RotateCcw } from 'lucide-react'
import { Button, Kbd, Tooltip } from '@/components/ui'
import { ContextRing, CopyField, DataTable, Empty, ModelChip, PageHeader, Problem, QuotaMeter, Row, RowList, SegmentedControl, Skeleton, Spinner, StatusPill, friendlyModel, type Status } from '../kit'

const STATUSES: Status[] = ['queued', 'planning', 'running', 'needs', 'review', 'done', 'failed', 'stopped', 'limited']
const MODELS: [string, string][] = [
  ['nvidia', 'minimaxai/minimax-m3.1-flash'],
  ['groq', 'openai/gpt-oss-120b'],
  ['anthropic', 'claude-sonnet-5-5'],
  ['mistral', 'magistral-medium-latest'],
  ['openrouter', 'deepseek/deepseek-v4-flash:free'],
]
type Demo = { name: string; coding: number | null; speed: number; free: boolean }
const TABLE: Demo[] = [
  { name: 'Qwen3 Coder', coding: 82, speed: 0.9, free: true },
  { name: 'Mistral Medium 3.5', coding: 76, speed: 1.4, free: false },
  { name: 'Unrated model', coding: null, speed: 3.2, free: true },
]

export default function DevUiPage() {
  const [seg, setSeg] = useState<'fewest' | 'fastest' | 'balanced' | 'best'>('balanced')
  return (
    <div className="mx-auto max-w-[1100px] space-y-10 px-6 py-8">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Hive kit</h1>
        <p className="mt-1 text-[13px] text-[var(--hv-text-2)]">Every primitive, in every state, in the current theme. Development builds only.</p>
      </header>

      <Section title="Buttons (one primary per view)">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Plan the team</Button>
          <Button variant="secondary">Connect</Button>
          <Button variant="ghost">Cancel</Button>
          <Button loading>Planning…</Button>
          <Button disabled>Disabled</Button>
          <Tooltip label={<span className="inline-flex items-center gap-2">New task <Kbd>C</Kbd></span>}>
            <Button variant="ghost" size="icon-sm" aria-label="New task">
              <Plus />
            </Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="Status (icon + word + colour)">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusPill key={s} status={s} size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Quota meters">
        <div className="grid gap-4 sm:grid-cols-3">
          <QuotaMeter used={5} limit={33} text="5 of 33 requests today" foot="resets in 15h" />
          <QuotaMeter used={27} limit={33} foot="resets in 2h" />
          <QuotaMeter used={33} limit={33} text="Limit reached" foot="frees up in 17m" />
        </div>
      </Section>

      <Section title="Segmented control">
        <SegmentedControl
          label="Cost strategy"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'fewest', label: 'Fewest tokens' },
            { value: 'fastest', label: 'Fastest' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'best', label: 'Best quality' },
          ]}
        />
      </Section>

      <Section title="Models (friendly name, slug on hover)">
        <div className="flex flex-wrap gap-2">
          {MODELS.map(([p, m]) => (
            <ModelChip key={m} provider={p} model={m} />
          ))}
        </div>
        <ul className="mt-2 space-y-0.5 font-mono text-[12px] text-[var(--hv-text-3)]">
          {MODELS.map(([, m]) => (
            <li key={m}>
              {m} → <span className="text-[var(--hv-text-1)]">{friendlyModel(m)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Copy field">
        <div className="flex flex-wrap gap-2">
          <CopyField value="/hive/p/prj_33c4d83087c2771b/t/tsk_db5310ddb0feb435" />
          <CopyField value="ghp_••••••••••••a91F" label="Copy token" />
        </div>
      </Section>

      <Section title="Rows (J/K to move, the whole row opens)">
        <RowList label="Demo rows" className="hv-card p-1">
          {['Gurudeep306/Nexora', 'Gurudeep306/MedicalDigitalTwin', 'Gurudeep306/Janvaani'].map((n, i) => (
            <Row
              key={n}
              leading={<FolderGit2 />}
              title={n}
              meta={i === 0 ? 'TypeScript · updated 6m ago' : 'not a project yet'}
              trailing={<StatusPill status={i === 0 ? 'running' : i === 1 ? 'review' : 'queued'} size="sm" />}
              actions={
                <Button variant="ghost" size="icon-sm" aria-label={`More for ${n}`}>
                  <MoreHorizontal />
                </Button>
              }
              onOpen={() => {}}
            />
          ))}
        </RowList>
      </Section>

      <Section title="Table (sortable, numbers right-aligned, unrated last)">
        <DataTable<Demo>
          label="Demo models"
          rows={TABLE}
          rowKey={(r) => r.name}
          initialSort={{ key: 'coding', dir: 'desc' }}
          onOpen={() => {}}
          columns={[
            { key: 'name', header: 'Model', sortBy: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'coding', header: 'Coding', align: 'right', sortBy: (r) => r.coding, render: (r) => (r.coding == null ? <span className="text-[var(--hv-text-3)]">— Unrated</span> : r.coding) },
            { key: 'speed', header: 'Speed', align: 'right', sortBy: (r) => -r.speed, render: (r) => `${r.speed}s` },
            { key: 'price', header: 'Price', hideBelow: 'sm', render: (r) => (r.free ? 'Free' : 'Paid') },
          ]}
        />
      </Section>

      <Section title="Page header (title + sub + actions)">
        <PageHeader title="Models" sub="Every brain Hive can use, what each one is best at, what it costs." actions={<Button size="sm"><Plus /> Add key</Button>} />
      </Section>

      <Section title="Loaders (spinner, skeleton, context ring)">
        <div className="flex flex-wrap items-center gap-4">
          <Spinner size={14} label="Loading" />
          <Spinner size={20} label="Loading" />
          <Spinner size={28} label="Loading" />
          <ContextRing used={41000} max={128000} />
          <ContextRing used={110000} max={128000} />
          <ContextRing used={88000} />
        </div>
        <div className="mt-3 max-w-md space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </Section>

      <Section title="Empty and error states">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="hv-card">
            <Empty icon={<Inbox />} title="Nothing needs you" action={<Button size="sm">Start a task</Button>}>
              Approvals, reviews and failed runs land here.
            </Empty>
          </div>
          <div className="p-1">
            <Problem
              title="GitHub refused the connection"
              why="The token expired. Agents can't read this repository until it's replaced."
              action={
                <Button size="sm" variant="secondary">
                  <RotateCcw /> Reconnect GitHub
                </Button>
              }
            />
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--hv-text-1)]">{title}</h2>
      {children}
    </section>
  )
}

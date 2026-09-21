import { useEffect, useState } from 'react'
import { Copy, Swords, Target, BrainCircuit } from 'lucide-react'
import { Button, Field, Input, Modal, Textarea, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CustomProblem } from './types'
import { difficultyLabel, parseJson } from './types'

interface Props {
  open: boolean
  me: string
  problems: CustomProblem[]
  onClose: () => void
  onCreated: () => void
}

const TYPES = [
  { id: 'speed', label: 'Speed', icon: <Swords className="size-3.5" /> },
  { id: 'accuracy', label: 'Accuracy', icon: <Target className="size-3.5" /> },
  { id: 'quiz', label: 'Quiz', icon: <BrainCircuit className="size-3.5" /> },
]

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ContestFormModal({ open, me, problems, onClose, onCreated }: Props) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('speed')
  const [password, setPassword] = useState('')
  const [orgTag, setOrgTag] = useState('')
  const [startTime, setStartTime] = useState(() => toLocalInputValue(new Date(Date.now() + 30 * 60_000)))
  const [durationMins, setDurationMins] = useState('60')
  const [maxParticipants, setMaxParticipants] = useState('50')
  const [selected, setSelected] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setType('speed')
    setPassword('')
    setOrgTag('')
    setStartTime(toLocalInputValue(new Date(Date.now() + 30 * 60_000)))
    setDurationMins('60')
    setMaxParticipants('50')
    setSelected([])
    setErrors({})
    setCreatedCode(null)
  }, [open])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    if (password.length < 4) e.password = 'Password must be at least 4 characters'
    const start = new Date(startTime)
    if (!startTime || Number.isNaN(start.getTime())) e.startTime = 'Pick a valid start time'
    const dur = Number(durationMins)
    if (!Number.isFinite(dur) || dur < 1 || dur > 1440) e.durationMins = 'Duration must be 1–1440 minutes'
    if (selected.length === 0) e.problems = 'Select at least one custom problem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function create() {
    if (!validate()) return
    setSaving(true)
    try {
      const d = await api.post<{ contest_id: number; contest_code: string }>('/api/contests/create', {
        creator: me,
        title: title.trim(),
        description: description.trim(),
        type,
        password,
        org_tag: orgTag.trim(),
        start_time: new Date(startTime).toISOString(),
        duration_mins: Number(durationMins),
        problems: selected,
        max_participants: Number(maxParticipants) || 50,
      })
      setCreatedCode(d.contest_code)
      toast.success('Contest created', `Share code ${d.contest_code} + the password with players.`)
      onCreated()
    } catch (err) {
      toast.error('Create failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function copyCode() {
    if (!createdCode) return
    try {
      await navigator.clipboard.writeText(createdCode)
      toast.info('Copied', createdCode)
    } catch {
      toast.warning('Copy failed', createdCode)
    }
  }

  // Success screen with the generated code
  if (createdCode) {
    return (
      <Modal open={open} onClose={onClose} title="Contest Live-Code" size="sm">
        <div className="space-y-4 text-center">
          <p className="text-sm text-foreground-dim">
            Players join with this code and the password you set:
          </p>
          <p className="font-display text-2xl tracking-widest text-primary-bright glow-text">{createdCode}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyCode()}>
              <Copy /> Copy code
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Custom Contest" size="lg">
      <div className="space-y-4">
        <Field label="Title" error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday Night Rift Cup" maxLength={80} />
        </Field>

        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Rules, prize, bragging rights…" />
        </Field>

        <Field label="Type">
          <div className="flex gap-2" role="radiogroup" aria-label="Contest type">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={type === t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200',
                  type === t.id
                    ? 'border-primary bg-primary/15 text-primary-bright glow-box'
                    : 'border-border bg-surface-2 text-foreground-dim hover:border-primary/50 hover:text-foreground',
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password} hint="Min 4 characters — required to join">
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="rift2026" />
          </Field>
          <Field label="Org tag" hint="Optional">
            <Input value={orgTag} onChange={(e) => setOrgTag(e.target.value)} placeholder="NEXORA" maxLength={20} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Start time" error={errors.startTime}>
            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono text-xs tabular-nums" />
          </Field>
          <Field label="Duration (min)" error={errors.durationMins}>
            <Input type="number" min={1} max={1440} value={durationMins} onChange={(e) => setDurationMins(e.target.value)} className="font-mono tabular-nums" />
          </Field>
          <Field label="Max players">
            <Input type="number" min={2} max={500} value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} className="font-mono tabular-nums" />
          </Field>
        </div>

        <Field label={`Problems (${selected.length} selected)`} error={errors.problems}>
          {problems.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface-2/50 px-3 py-3 text-xs text-foreground-faint">
              No custom problems yet — create one in the Problems tab first.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {problems.map((p) => {
                const checked = selected.includes(p.id)
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150',
                        checked ? 'bg-primary/15 text-foreground' : 'text-foreground-dim hover:bg-surface-2',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected((s) => (checked ? s.filter((id) => id !== p.id) : [...s, p.id]))
                        }
                        className="size-4 accent-[var(--color-primary)]"
                      />
                      <span className="min-w-0 flex-1 truncate">{p.title}</span>
                      <span className="font-mono text-xs text-primary-bright tabular-nums">
                        {p.difficulty ?? 1000}
                      </span>
                      <span className="hidden text-[10px] tracking-wider text-foreground-faint uppercase sm:inline">
                        {difficultyLabel(p.difficulty ?? 1000)}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </Field>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={() => void create()} loading={saving}>
            Create contest
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Small helper shared with the contests list — parses the `problems` JSON string. */
export function contestProblemIds(row: { problems?: string }): number[] {
  return parseJson<number[]>(row.problems, [])
}

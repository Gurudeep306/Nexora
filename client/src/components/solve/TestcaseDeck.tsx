import { useRef, useState } from 'react'
import { ClipboardPaste, FileUp, Plus, Trash2, X } from 'lucide-react'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Testcase } from './types'

type NewCase = { label: string; input: string; expected_output: string }

interface Props {
  testcases: Testcase[]
  selectedIndex: number // -1 = custom input mode
  onSelect: (index: number) => void
  customInput: string
  onCustomInput: (v: string) => void
  onAdd: (tc: NewCase) => Promise<boolean>
  onDelete: (id: number) => Promise<void>
  /** Add many at once (file / paste import); resolves to how many were new. */
  onAddMany?: (tcs: NewCase[]) => Promise<number>
}

const IN_EXT = /\.(in|inp|input|txt)$/i
const OUT_EXT = /\.(out|ans|a|ok|output|expected|sol)$/i

/**
 * Pair test files the way judges and Polygon export them: 1.in + 1.out,
 * 01 + 01.a, input1.txt + output1.txt, sample-2.in + sample-2.ans …
 */
export function pairTestFiles(files: { name: string; text: string }[]): NewCase[] {
  const key = (name: string) =>
    name
      .replace(/\.[^.]+$/, '')
      .replace(/^(input|in|output|out|answer|ans|expected)[-_ ]?/i, '')
      .replace(/[-_ ]?(input|in|output|out|answer|ans|expected)$/i, '')
      .toLowerCase()
  const isOut = (name: string) => OUT_EXT.test(name) || /^(output|out|answer|ans|expected)/i.test(name) || /\.a$/i.test(name)
  const ins = new Map<string, string>()
  const outs = new Map<string, string>()
  for (const f of files) {
    if (isOut(f.name)) outs.set(key(f.name), f.text)
    else if (IN_EXT.test(f.name) || !/\./.test(f.name)) ins.set(key(f.name), f.text)
  }
  const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })
  return [...ins.keys()].sort(natural).map((k) => ({ label: `File ${k}`.slice(0, 60), input: ins.get(k) ?? '', expected_output: outs.get(k) ?? '' }))
}

/**
 * Pasted tests: cases separated by a line of "===", input and expected
 * output separated by a line of "---". A case without "---" is input only.
 */
export function parsePastedTests(text: string): NewCase[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/^\s*={3,}\s*$/m)
    .map((block) => block.replace(/^\n+|\n+$/g, ''))
    .filter((block) => block.trim())
    .map((block, i) => {
      const [input, ...rest] = block.split(/^\s*-{3,}\s*$/m)
      return { label: `Pasted ${i + 1}`, input: `${input.replace(/^\n+|\n+$/g, '')}\n`, expected_output: rest.length ? `${rest.join('\n').replace(/^\n+|\n+$/g, '')}\n` : '' }
    })
}

export function TestcaseDeck({ testcases, selectedIndex, onSelect, customInput, onCustomInput, onAdd, onDelete, onAddMany }: Props) {
  const toast = useToast()
  const [mode, setMode] = useState<null | 'add' | 'paste'>(null)
  const [label, setLabel] = useState('')
  const [input, setInput] = useState('')
  const [expected, setExpected] = useState('')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const submitAdd = async () => {
    if (!input.trim()) return
    setBusy(true)
    const ok = await onAdd({ label: label.trim() || `Custom ${testcases.length + 1}`, input, expected_output: expected })
    setBusy(false)
    if (ok) {
      setMode(null)
      setLabel('')
      setInput('')
      setExpected('')
    }
  }

  const addMany = async (cases: NewCase[], what: string) => {
    if (!cases.length) {
      toast.warning(`No tests found in ${what}`)
      return
    }
    setBusy(true)
    try {
      const added = onAddMany ? await onAddMany(cases) : (await Promise.all(cases.map((c) => onAdd(c)))).filter(Boolean).length
      toast.success(`Added ${added} test${added === 1 ? '' : 's'}`, added < cases.length ? `${cases.length - added} were already in your tests.` : undefined)
      setMode(null)
      setPasted('')
    } finally {
      setBusy(false)
    }
  }

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const files = await Promise.all([...list].filter((f) => f.size <= 2 * 1024 * 1024).map(async (f) => ({ name: f.name, text: await f.text() })))
    await addMany(pairTestFiles(files), 'those files')
    if (fileRef.current) fileRef.current.value = ''
  }

  const current = selectedIndex >= 0 ? testcases[selectedIndex] : undefined
  const nameOf = (tc: Testcase, i: number) => (/^(sample|test|case)$/i.test((tc.label || '').trim()) ? `${tc.label.trim()} ${i + 1}` : tc.label || `Test ${i + 1}`)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border/70 px-2.5 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {testcases.map((tc, i) => (
            <span key={tc.id ?? i} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={selectedIndex === i}
                className={cn(
                  'h-7 cursor-pointer rounded-md px-2.5 text-[12px] whitespace-nowrap transition-colors',
                  selectedIndex === i ? 'bg-surface-2 font-medium text-foreground shadow-[inset_0_0_0_1px_var(--color-border)]' : 'text-foreground-dim hover:bg-surface-2/60 hover:text-foreground',
                )}
              >
                {nameOf(tc, i)}
              </button>
              {tc.id != null && (
                <button
                  type="button"
                  onClick={() => void onDelete(tc.id as number)}
                  aria-label={`Delete ${nameOf(tc, i)}`}
                  className="absolute -top-1 -right-1 hidden size-4 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-foreground-faint shadow-[inset_0_0_0_1px_var(--color-border)] group-hover:flex hover:text-state-error"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onSelect(-1)}
            aria-pressed={selectedIndex === -1}
            className={cn('h-7 shrink-0 cursor-pointer rounded-md px-2.5 text-[12px] transition-colors', selectedIndex === -1 ? 'bg-surface-2 font-medium text-foreground shadow-[inset_0_0_0_1px_var(--color-border)]' : 'text-foreground-dim hover:bg-surface-2/60 hover:text-foreground')}
          >
            Custom input
          </button>
        </div>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon-sm" onClick={() => setMode(mode === 'add' ? null : 'add')} aria-label="Add a test" title="Add a test" aria-pressed={mode === 'add'}>
            <Plus aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setMode(mode === 'paste' ? null : 'paste')} aria-label="Paste many tests" title="Paste many tests" aria-pressed={mode === 'paste'}>
            <ClipboardPaste aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => fileRef.current?.click()} aria-label="Import test files" title="Import test files (.in / .out pairs)" loading={busy && mode === null}>
            <FileUp aria-hidden="true" />
          </Button>
          <input ref={fileRef} type="file" multiple className="hidden" accept=".in,.out,.ans,.a,.txt,.inp,.ok,.input,.output,.expected,text/plain" onChange={(e) => void onFiles(e.target.files)} />
        </div>
      </div>

      {mode === 'add' && (
        <div className="grid gap-2 border-b border-border/70 px-3 py-3 md:grid-cols-[150px_1fr_1fr_auto]">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name (optional)" aria-label="Test name" className="h-8 text-[12.5px]" />
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Input" aria-label="Test input" className="min-h-20 font-mono text-[12.5px]" />
          <Textarea value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Expected output (optional)" aria-label="Expected output" className="min-h-20 font-mono text-[12.5px]" />
          <div className="flex items-start gap-2 md:flex-col">
            <Button size="sm" variant="primary" loading={busy} onClick={() => void submitAdd()} disabled={!input.trim()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === 'paste' && (
        <div className="space-y-2 border-b border-border/70 px-3 py-3">
          <p className="text-[12px] text-foreground-dim">
            Separate tests with a line of <code className="rounded bg-surface-2 px-1 font-mono">===</code>, and each input from its expected output with a line of <code className="rounded bg-surface-2 px-1 font-mono">---</code>.
          </p>
          <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={'3\n1 2 3\n---\n6\n===\n1\n5\n---\n5'} aria-label="Pasted tests" className="min-h-28 font-mono text-[12.5px]" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" loading={busy} disabled={!pasted.trim()} onClick={() => void addMany(parsePastedTests(pasted), 'the pasted text')}>
              Add {parsePastedTests(pasted).length || ''} tests
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {selectedIndex === -1 ? (
          <Textarea value={customInput} onChange={(e) => onCustomInput(e.target.value)} placeholder="Type any input, then Run" aria-label="Custom run input" className="h-full min-h-24 resize-none font-mono text-[12.5px]" />
        ) : current ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ['Input', current.input],
                ['Expected output', current.expected_output],
              ] as const
            ).map(([title, body]) => (
              <div key={title} className="min-w-0">
                <p className="mb-1 text-[12px] text-foreground-faint">{title}</p>
                <pre className="max-h-56 overflow-auto rounded-lg bg-[color-mix(in_oklab,var(--color-foreground)_4.5%,transparent)] px-3 py-2 font-mono text-[12.5px] leading-[1.55] text-foreground">{body || (title === 'Expected output' ? '— not set: Run shows the output only' : ' ')}</pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-6 text-center text-[13px] text-foreground-faint">
            <p>No tests yet.</p>
            <p>Add the examples from the statement, write your own, import files, or generate them with AI.</p>
          </div>
        )}
        {current && current.id != null && (
          <button type="button" onClick={() => void onDelete(current.id as number)} className="mt-3 inline-flex cursor-pointer items-center gap-1 text-[12px] text-foreground-faint hover:text-state-error">
            <Trash2 className="size-3.5" /> Delete this test
          </button>
        )}
      </div>
    </div>
  )
}

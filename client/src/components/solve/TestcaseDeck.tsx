import { useState } from 'react'
import { FlaskConical, Keyboard, Plus, Trash2 } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Testcase } from './types'

interface Props {
  testcases: Testcase[]
  selectedIndex: number // -1 = custom input mode
  onSelect: (index: number) => void
  customInput: string
  onCustomInput: (v: string) => void
  onAdd: (tc: { label: string; input: string; expected_output: string }) => Promise<boolean>
  onDelete: (id: number) => Promise<void>
}

export function TestcaseDeck({
  testcases,
  selectedIndex,
  onSelect,
  customInput,
  onCustomInput,
  onAdd,
  onDelete,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [input, setInput] = useState('')
  const [expected, setExpected] = useState('')
  const [busy, setBusy] = useState(false)

  const submitAdd = async () => {
    if (!input.trim()) return
    setBusy(true)
    const ok = await onAdd({
      label: label.trim() || `Custom ${testcases.length + 1}`,
      input,
      expected_output: expected,
    })
    setBusy(false)
    if (ok) {
      setAdding(false)
      setLabel('')
      setInput('')
      setExpected('')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
        <FlaskConical className="mr-1 size-3.5 text-cyan" aria-hidden="true" />
        {testcases.map((tc, i) => {
          // Imported samples often all share one label ("Sample 1"); number them.
          const shown = /^sample\s*\d*$/i.test(tc.label.trim()) ? `Sample ${i + 1}` : tc.label
          return (
          <span key={tc.id ?? i} className="group relative">
            <button
              onClick={() => onSelect(i)}
              aria-pressed={selectedIndex === i}
              aria-label={`Run against ${shown}`}
              className={cn(
                'cursor-pointer rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all duration-150',
                selectedIndex === i
                  ? 'border-primary bg-primary/20 text-primary-bright glow-box'
                  : 'border-border bg-surface text-foreground-dim hover:border-border-glow hover:text-foreground',
              )}
            >
              {shown}
            </button>
            {tc.id != null && (
              <button
                onClick={() => void onDelete(tc.id as number)}
                aria-label={`Delete ${tc.label}`}
                className="absolute -top-1.5 -right-1.5 hidden cursor-pointer rounded-full border border-border bg-surface-2 p-0.5 text-foreground-faint hover:text-destructive group-hover:block"
              >
                <Trash2 className="size-2.5" />
              </button>
            )}
          </span>
          )
        })}
        <button
          onClick={() => onSelect(-1)}
          aria-pressed={selectedIndex === -1}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] transition-all duration-150',
            selectedIndex === -1
              ? 'border-cyan bg-cyan/15 text-cyan glow-box'
              : 'border-border bg-surface text-foreground-dim hover:border-border-glow hover:text-foreground',
          )}
        >
          <Keyboard className="size-3" aria-hidden="true" /> stdin
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding((a) => !a)}
          aria-expanded={adding}
          className="ml-auto"
        >
          <Plus aria-hidden="true" /> Add test
        </Button>
      </div>

      {adding && (
        <div className="grid gap-2 border-b border-border bg-surface px-3 py-3 md:grid-cols-[140px_1fr_1fr_auto]">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            aria-label="Testcase label"
            className="h-8 text-xs"
          />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Input (stdin)"
            aria-label="Testcase input"
            className="min-h-16 font-mono text-xs"
          />
          <Textarea
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="Expected output"
            aria-label="Expected output"
            className="min-h-16 font-mono text-xs"
          />
          <div className="flex items-start gap-2 md:flex-col">
            <Button size="sm" variant="primary" loading={busy} onClick={() => void submitAdd()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {selectedIndex === -1 ? (
          <Textarea
            value={customInput}
            onChange={(e) => onCustomInput(e.target.value)}
            placeholder="Type custom stdin for RUN…"
            aria-label="Custom run input"
            className="h-full min-h-24 resize-none font-mono text-xs"
          />
        ) : testcases[selectedIndex] ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
                Input · {/^sample\s*\d*$/i.test(testcases[selectedIndex].label.trim()) ? `Sample ${selectedIndex + 1}` : testcases[selectedIndex].label}
              </p>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-background p-2 font-mono text-xs whitespace-pre-wrap text-foreground">
                {testcases[selectedIndex].input}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
                Expected output
              </p>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-background p-2 font-mono text-xs whitespace-pre-wrap text-foreground">
                {testcases[selectedIndex].expected_output}
              </pre>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-foreground-faint">
            No testcases yet — import examples from the statement or add your own.
          </p>
        )}
      </div>
    </div>
  )
}

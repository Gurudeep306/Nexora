import { useEffect, useState } from 'react'
import { Plus, Trash2, FlaskConical, FileText } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import type { CustomProblem, CustomProblemForm, Sample, Testcase } from './types'
import { emptyProblemForm, problemToForm } from './types'

interface Props {
  open: boolean
  me: string
  /** null = create mode */
  editing: CustomProblem | null
  onClose: () => void
  onSaved: () => void
}

export function ProblemFormModal({ open, me, editing, onClose, onSaved }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<CustomProblemForm>(emptyProblemForm)
  const [tagsText, setTagsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const f = editing ? problemToForm(editing) : emptyProblemForm()
    setForm(f)
    setTagsText(f.tags.join(', '))
    setErrors({})
  }, [open, editing])

  function patch(p: Partial<CustomProblemForm>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function patchSample(i: number, p: Partial<Sample>) {
    setForm((f) => ({
      ...f,
      samples: f.samples.map((s, j) => (j === i ? { ...s, ...p } : s)),
    }))
  }

  function patchTestcase(i: number, p: Partial<Testcase>) {
    setForm((f) => ({
      ...f,
      testcases: f.testcases.map((t, j) => (j === i ? { ...t, ...p } : t)),
    }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!Number.isFinite(form.difficulty) || form.difficulty < 0 || form.difficulty > 4000)
      e.difficulty = 'Difficulty must be a rating between 0 and 4000'
    if (!form.statement.trim()) e.statement = 'Statement is required'
    const filled = form.testcases.filter((t) => t.input.trim() || t.expected_output.trim())
    if (filled.length === 0) e.testcases = 'Add at least one testcase'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save() {
    if (!validate()) return
    setSaving(true)
    const payload = {
      creator: me,
      title: form.title.trim(),
      statement: form.statement,
      input_spec: form.input_spec,
      output_spec: form.output_spec,
      difficulty: form.difficulty,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      samples: form.samples.filter((s) => s.input.trim() || s.output.trim()),
      testcases: form.testcases.filter((t) => t.input.trim() || t.expected_output.trim()),
      time_limit: form.time_limit,
      memory_limit: form.memory_limit,
    }
    try {
      if (editing) {
        await api.put(`/api/custom-problems/${editing.id}`, payload)
        toast.success('Problem updated', `“${payload.title}” saved.`)
      } else {
        await api.post('/api/custom-problems', payload)
        toast.success('Problem forged', `“${payload.title}” added to the workshop.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Save failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit Problem #${editing.id}` : 'Forge Custom Problem'}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Title" error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Rift Summation"
              maxLength={120}
            />
          </Field>
          <Field label="Difficulty" error={errors.difficulty} hint="CF-style rating">
            <Input
              type="number"
              min={0}
              max={4000}
              step={50}
              value={form.difficulty}
              onChange={(e) => patch({ difficulty: Number(e.target.value) })}
              className="font-mono tabular-nums"
            />
          </Field>
        </div>

        <Field label="Statement" error={errors.statement} hint="Plain text or HTML">
          <Textarea
            value={form.statement}
            onChange={(e) => patch({ statement: e.target.value })}
            rows={5}
            placeholder="Describe the problem…"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Input spec">
            <Textarea
              value={form.input_spec}
              onChange={(e) => patch({ input_spec: e.target.value })}
              rows={3}
              placeholder="Input format…"
            />
          </Field>
          <Field label="Output spec">
            <Textarea
              value={form.output_spec}
              onChange={(e) => patch({ output_spec: e.target.value })}
              rows={3}
              placeholder="Output format…"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Tags" hint="Comma separated">
            <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="arrays, math" />
          </Field>
          <Field label="Time limit">
            <Select value={form.time_limit} onChange={(e) => patch({ time_limit: e.target.value })}>
              {['1 second', '2 seconds', '3 seconds', '5 seconds'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Memory limit">
            <Select value={form.memory_limit} onChange={(e) => patch({ memory_limit: e.target.value })}>
              {['128 MB', '256 MB', '512 MB'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* ── Samples ── */}
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            <FileText className="size-3.5" /> Sample cases
          </legend>
          <div className="space-y-3">
            {form.samples.map((s, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Textarea
                  rows={2}
                  value={s.input}
                  onChange={(e) => patchSample(i, { input: e.target.value })}
                  placeholder={`Sample ${i + 1} input`}
                  aria-label={`Sample ${i + 1} input`}
                  className="font-mono text-xs"
                />
                <Textarea
                  rows={2}
                  value={s.output}
                  onChange={(e) => patchSample(i, { output: e.target.value })}
                  placeholder={`Sample ${i + 1} output`}
                  aria-label={`Sample ${i + 1} output`}
                  className="font-mono text-xs"
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove sample ${i + 1}`}
                  onClick={() => patch({ samples: form.samples.filter((_, j) => j !== i) })}
                  className="self-center"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="subtle"
              onClick={() => patch({ samples: [...form.samples, { input: '', output: '' }] })}
            >
              <Plus /> Add sample
            </Button>
          </div>
        </fieldset>

        {/* ── Hidden testcases ── */}
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            <FlaskConical className="size-3.5" /> Judge testcases
          </legend>
          {errors.testcases && (
            <p role="alert" className="mb-2 text-xs text-destructive">
              {errors.testcases}
            </p>
          )}
          <div className="space-y-3">
            {form.testcases.map((t, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Textarea
                  rows={2}
                  value={t.input}
                  onChange={(e) => patchTestcase(i, { input: e.target.value })}
                  placeholder={`Testcase ${i + 1} input`}
                  aria-label={`Testcase ${i + 1} input`}
                  className="font-mono text-xs"
                />
                <Textarea
                  rows={2}
                  value={t.expected_output}
                  onChange={(e) => patchTestcase(i, { expected_output: e.target.value })}
                  placeholder={`Testcase ${i + 1} expected output`}
                  aria-label={`Testcase ${i + 1} expected output`}
                  className="font-mono text-xs"
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove testcase ${i + 1}`}
                  onClick={() => patch({ testcases: form.testcases.filter((_, j) => j !== i) })}
                  className="self-center"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="subtle"
              onClick={() => patch({ testcases: [...form.testcases, { input: '', expected_output: '' }] })}
            >
              <Plus /> Add testcase
            </Button>
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} loading={saving}>
            {editing ? 'Save changes' : 'Create problem'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

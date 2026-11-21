/*
  Build mode's review sheet (docs/voice/BLUEPRINT.md §4.3 step 5): the AI's
  code is never put into the editor unseen. It is run on the examples first
  (a translation must print exactly what the original prints; a change must
  pass the examples), retried with the failing case up to 3 times, and then
  shown beside the student's code. Only "Use this code" replaces it.

  Checks use the judge with the examples only and no problem id, so nothing
  is recorded as a submission.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { DiffEditor, Editor } from '@monaco-editor/react'
import type { editor as MonacoNs } from 'monaco-editor'
import '@/lib/monaco'
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { MONACO_LANG } from '@/lib/monacoLang'
import { useMonacoAppTheme } from '@/theme/useMonacoAppTheme'
import type { JudgeResponse } from '@/components/solve/types'
import type { BuildCommand } from './build'

export interface BuildRequest {
  cmd: BuildCommand
  /** Changes each time, so the same sentence twice starts again. */
  key: number
}

interface Sample {
  input: string
  output: string
}

type Check = { kind: 'none' } | { kind: 'pass'; n: number } | { kind: 'fail'; index: number; n: number; tries: number }
type Stage =
  | { kind: 'idle' }
  | { kind: 'working'; msg: string }
  | { kind: 'ready'; code: string; target: string; say: string; check: Check }
  | { kind: 'error'; say: string; locked?: boolean }

const MAX_TRIES = 3

interface BuildReply {
  ok: boolean
  code?: string
  say: string
  locked?: boolean
}

const judgeOn = (code: string, language: string, cases: { input: string; expected_output: string }[]) =>
  api.post<JudgeResponse>('/api/judge', { code, language, testcases: cases }, { timeoutMs: 120000 })

export function BuildSheet({
  request,
  code,
  language,
  labelOf,
  problem,
  samples,
  onClose,
  onUse,
}: {
  request: BuildRequest | null
  code: string
  language: string
  labelOf: (id: string) => string
  problem: { kind: 'platform' | 'learn' | 'custom'; id: string } | null
  samples: Sample[]
  onClose: () => void
  onUse: (code: string, language: string) => void
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const theme = useMonacoAppTheme()
  // The code and language as they were when the request came in.
  const [base, setBase] = useState({ code, language })

  useEffect(() => {
    if (!request) return
    let cancelled = false
    const { cmd } = request
    const from = { code, language }
    setBase(from)
    const target = cmd.verb === 'translate' ? cmd.to : language
    const run = async () => {
      const examples = samples.filter((s) => s.input.trim() || s.output.trim()).slice(0, 6)
      let cases = examples.map((s) => ({ input: s.input, expected_output: s.output }))
      if (cmd.verb === 'translate' && cases.length) {
        // A translation is right when it prints what the original prints.
        setStage({ kind: 'working', msg: `Running your ${labelOf(language)} code on the examples…` })
        const orig = await judgeOn(from.code, from.language, cases).catch(() => null)
        if (cancelled) return
        if (!orig || orig.compileError) cases = []
        else cases = cases.map((c, i) => ({ input: c.input, expected_output: orig.results[i]?.actual ?? '' }))
      }
      let previous: string | null = null
      let failing: { input: string; expected: string; actual: string; error?: string } | null = null
      let last: { code: string; say: string; check: Check } | null = null
      for (let t = 1; t <= MAX_TRIES; t++) {
        setStage({ kind: 'working', msg: t === 1 ? (cmd.verb === 'translate' ? `Writing it in ${labelOf(target)}…` : 'Making the change…') : `Fixing a difference on an example (try ${t} of ${MAX_TRIES})…` })
        const r: BuildReply = await api
          .post<BuildReply>('/api/voice/build', {
            mode: cmd.verb === 'translate' ? 'translate' : 'change',
            problem,
            code: from.code,
            language: from.language,
            target,
            instruction: cmd.verb === 'change' ? cmd.instruction : '',
            previous,
            failing,
          }, { timeoutMs: 90000 })
          .catch((e: unknown) => ({ ok: false, say: e instanceof Error && e.message ? e.message : 'Build mode couldn’t answer just now.' }) as BuildReply)
        if (cancelled) return
        if (!r.ok || !r.code) {
          if (last) break
          setStage({ kind: 'error', say: r.say, locked: r.locked })
          return
        }
        if (!cases.length) {
          setStage({ kind: 'ready', code: r.code, target, say: r.say, check: { kind: 'none' } })
          return
        }
        setStage({ kind: 'working', msg: 'Checking it on the examples…' })
        const j = await judgeOn(r.code, target, cases).catch(() => null)
        if (cancelled) return
        const bad = j ? j.results.findIndex((x) => !x.passed) : 0
        if (j && !j.compileError && bad < 0 && j.results.length === cases.length) {
          setStage({ kind: 'ready', code: r.code, target, say: r.say, check: { kind: 'pass', n: cases.length } })
          return
        }
        const i = Math.max(0, bad)
        last = { code: r.code, say: r.say, check: { kind: 'fail', index: i, n: cases.length, tries: t } }
        previous = r.code
        const res = j?.results[i]
        failing = { input: cases[i].input, expected: cases[i].expected_output, actual: res?.actual ?? '', error: j?.compileError || res?.stderr || undefined }
      }
      if (last) setStage({ kind: 'ready', code: last.code, target, say: last.say, check: last.check })
    }
    void run()
    return () => {
      cancelled = true
    }
    // Only a new request starts a build; the code typed meanwhile doesn't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  const open = !!request && stage.kind !== 'idle'
  const close = () => {
    setStage({ kind: 'idle' })
    onClose()
  }
  const translate = request?.cmd.verb === 'translate'
  const title = translate ? `Build mode · ${labelOf(request?.cmd.verb === 'translate' ? request.cmd.to : language)}` : 'Build mode'
  const description = request?.cmd.verb === 'change' ? `“${request.cmd.instruction}”` : 'Your code, line for line, in another language. Your bugs stay too.'

  const options = useMemo(() => ({ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, renderSideBySide: true, automaticLayout: true, lineNumbersMinChars: 3 }), [])

  return (
    <Modal open={open} onClose={close} title={title} description={description} size="xl">
      <div className="vb-sheet" aria-live="polite">
        {stage.kind === 'working' && (
          <div className="vb-working">
            <span className="vb-spin" aria-hidden="true" />
            <p>{stage.msg}</p>
          </div>
        )}

        {stage.kind === 'error' && (
          <div className="vb-msg">
            {stage.locked ? <Lock className="vb-icon" aria-hidden="true" /> : <AlertTriangle className="vb-icon is-warn" aria-hidden="true" />}
            <p>{stage.say}</p>
          </div>
        )}

        {stage.kind === 'ready' && (
          <>
            <CheckLine check={stage.check} translate={translate} from={labelOf(base.language)} />
            {stage.say && !translate && <p className="vb-said">{stage.say}</p>}
            <div className="vb-code">
              {translate ? (
                <div className="vb-pair">
                  <figure>
                    <figcaption>Yours · {labelOf(base.language)}</figcaption>
                    <Editor value={base.code} language={MONACO_LANG[base.language] ?? base.language} theme={theme.theme} beforeMount={theme.beforeMount} options={{ ...options, ariaLabel: 'Your code' }} />
                  </figure>
                  <figure>
                    <figcaption>{labelOf(stage.target)}</figcaption>
                    <Editor value={stage.code} language={MONACO_LANG[stage.target] ?? stage.target} theme={theme.theme} beforeMount={theme.beforeMount} options={{ ...options, ariaLabel: `The code in ${labelOf(stage.target)}` }} />
                  </figure>
                </div>
              ) : (
                <DiffView original={base.code} modified={stage.code} language={MONACO_LANG[base.language] ?? base.language} theme={theme} options={options} />
              )}
            </div>
          </>
        )}

        <div className="vb-foot">
          <Button variant="ghost" onClick={close}>
            {stage.kind === 'ready' ? 'Keep mine' : 'Close'}
          </Button>
          {stage.kind === 'ready' && (
            <Button
              onClick={() => {
                onUse(stage.code, stage.target)
                close()
              }}
            >
              {translate ? `Use the ${labelOf(stage.target)} code` : 'Use this code'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

/**
 * The before/after view. Its models outlive the widget (Monaco throws if they
 * are disposed first, and the sheet's exit animation keeps it on screen a
 * moment longer), so they are freed only when this view is really gone.
 */
function DiffView({ original, modified, language, theme, options }: { original: string; modified: string; language: string; theme: ReturnType<typeof useMonacoAppTheme>; options: MonacoNs.IDiffEditorConstructionOptions }) {
  const ref = useRef<MonacoNs.IStandaloneDiffEditor | null>(null)
  useEffect(
    () => () => {
      const m = ref.current?.getModel()
      window.setTimeout(() => {
        m?.original.dispose()
        m?.modified.dispose()
      }, 0)
    },
    [],
  )
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      theme={theme.theme}
      beforeMount={theme.beforeMount}
      options={options}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      onMount={(ed) => {
        ref.current = ed
        ed.getOriginalEditor().updateOptions({ ariaLabel: 'Your code' })
        ed.getModifiedEditor().updateOptions({ ariaLabel: 'The changed code' })
      }}
    />
  )
}

function CheckLine({ check, translate, from }: { check: Check; translate: boolean; from: string }) {
  if (check.kind === 'none') return <p className="vb-check">No examples to check it on — run it yourself before you submit.</p>
  if (check.kind === 'pass')
    return (
      <p className="vb-check is-good">
        <CheckCircle2 aria-hidden="true" />
        {translate ? `Prints exactly what your ${from} code prints on all ${check.n} example${check.n === 1 ? '' : 's'}.` : `Passes all ${check.n} example${check.n === 1 ? '' : 's'}.`}
      </p>
    )
  return (
    <p className="vb-check is-warn">
      <AlertTriangle aria-hidden="true" />
      {translate ? `Still prints something different from your ${from} code on example ${check.index + 1}` : `Still fails example ${check.index + 1}`} after {check.tries} {check.tries === 1 ? 'try' : 'tries'}. Read it before you use it.
    </p>
  )
}

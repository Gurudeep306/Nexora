/*
  The AI tests request (POST /api/ai/testgen), shared by the "Generate with
  AI" panel and the automatic tests on the Solve page. The reply streams
  progress lines (NDJSON) and ends with the set.
*/
import { apiUrl } from '@/lib/api'

export type AiTest = {
  label: string
  size: 'sample' | 'edge' | 'tiny' | 'small' | 'medium' | 'large'
  input: string
  expected: string
  /** official: the problem's own example; verified: two solutions agree; reference: one solution that passed every example. */
  confidence: 'official' | 'verified' | 'reference'
}
export type RefCheck = { ok: boolean; passed: number; total: number; reason?: string | null }
export type AiTestsResult = {
  tests: AiTest[]
  format?: string
  notes?: string
  multipleAnswers?: boolean
  // A set made earlier for this problem (shared, ready at once) carries only kept / verified.
  stats: { generated?: number; rejectedByValidator?: number; validated?: boolean; kept: number; verified: number; examples?: number; disagreements?: number; unresolved?: number; references?: { brute: RefCheck; solution: RefCheck }; cached?: boolean; cachedAt?: number }
}

export interface AiTestsRequest {
  problem_id?: number
  custom_problem_id?: number
  title: string
  statement: string
  samples: { input: string; output: string }[]
  count: number
  fresh?: boolean
}

export async function streamAiTests(body: AiTestsRequest, { signal, onStep }: { signal?: AbortSignal; onStep?: (step: string) => void } = {}): Promise<AiTestsResult> {
  const res = await fetch(apiUrl('/api/ai/testgen'), {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, statement: body.statement.slice(0, 12000), samples: body.samples.slice(0, 10), fresh: body.fresh || undefined }),
  })
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(j?.error || `Request failed (${res.status})`)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let out: AiTestsResult | null = null
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line) continue
      const ev = JSON.parse(line) as { type: string; step?: string; error?: string } & Partial<AiTestsResult>
      if (ev.type === 'progress' && ev.step) onStep?.(ev.step)
      if (ev.type === 'error') throw new Error(ev.error || 'Test generation failed')
      if (ev.type === 'done') out = ev as unknown as AiTestsResult
    }
  }
  if (!out) throw new Error('Test generation stopped before it finished — try again')
  return out
}

/** A problem's tests are topped up to at least this many (the server's MIN_TOTAL). */
export const MIN_TESTS = 10

/** The label a test is added to the problem's list under. */
export const testLabel = (t: AiTest) => (t.confidence === 'official' ? t.label : t.label.startsWith('AI') ? t.label : `AI · ${t.label}`)

/** Make tests by themselves when a problem has fewer than 10 (on by default; the panel can turn it off). */
const AUTO_KEY = 'nexora:ai-tests:auto'
export function autoTestsOn(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== 'off'
  } catch {
    return true
  }
}
export function setAutoTests(on: boolean) {
  try {
    localStorage.setItem(AUTO_KEY, on ? 'on' : 'off')
  } catch {
    /* private mode: stays on for this visit */
  }
}

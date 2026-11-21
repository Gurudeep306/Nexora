/*
  Automatic AI tests: when a problem opens with fewer than 10 tests, a set is
  made (or taken from the one already made for this problem, which is
  instant) and added to the student's tests. Once per problem; the AI tests
  panel can turn it off.
*/
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MIN_TESTS, autoTestsOn, streamAiTests, testLabel, type AiTestsRequest } from './aiTests'

export type AutoTestsState = { kind: 'idle' } | { kind: 'working'; step: string } | { kind: 'done'; added: number } | { kind: 'error'; message: string }

const doneKey = (key: string) => `nexora:ai-tests:done:${key}`

export function useAutoTests({
  key,
  ready,
  have,
  request,
  add,
}: {
  /** One per problem (the Solve page's storage id). */
  key: string
  /** The problem, its statement and the student's tests have loaded. */
  ready: boolean
  /** How many tests the student has now. */
  have: number
  request: AiTestsRequest | null
  add: (tests: { label: string; input: string; expected_output: string }[]) => Promise<number>
}): AutoTestsState {
  const [state, setState] = useState<AutoTestsState>({ kind: 'idle' })
  const latest = useRef({ have, request, add })
  useLayoutEffect(() => {
    latest.current = { have, request, add }
  })

  useEffect(() => {
    if (!ready || !key) return
    const { have: n, request: req } = latest.current
    if (!req || n >= MIN_TESTS || !autoTestsOn()) return
    try {
      if (localStorage.getItem(doneKey(key))) return
    } catch {
      /* no storage: try anyway */
    }
    const ctrl = new AbortController()
    // The first progress line arrives at once (or the saved set itself).
    streamAiTests({ ...req, count: 24 }, { signal: ctrl.signal, onStep: (step) => setState({ kind: 'working', step }) })
      .then(async (r) => {
        const added = await latest.current.add(r.tests.map((t) => ({ label: testLabel(t), input: t.input, expected_output: t.expected })))
        try {
          localStorage.setItem(doneKey(key), '1')
        } catch {
          /* fine */
        }
        setState({ kind: 'done', added })
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setState({ kind: 'error', message: e instanceof Error && e.message ? e.message : 'The AI could not make tests just now.' })
      })
    return () => ctrl.abort()
  }, [ready, key])

  return state
}

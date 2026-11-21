import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { actionsSnapshot, registerAction, subscribeActions } from './registry'
import type { VoiceAction } from './types'

/** Everything about an action except its functions: re-register when it changes. */
function signature(a: VoiceAction): string {
  return JSON.stringify([a.id, a.title, a.hint, a.group, a.icon, a.say, a.args ?? null, a.risk, a.keys ?? null, a.palette ?? true])
}

/**
 * Offer an action while the calling component is mounted. `run` and `when`
 * always use the latest render's closures, so callers needn't memoise them.
 *
 *   useVoiceAction({ id: 'viz.pause', title: 'Pause animation',
 *     say: { en: ['pause', 'ruko'] }, risk: 'safe', run: () => player.pause() })
 */
export function useVoiceAction(action: VoiceAction | null): void {
  const latest = useRef(action)
  useLayoutEffect(() => {
    latest.current = action
  })
  const key = action ? signature(action) : ''
  useEffect(() => {
    const a = latest.current
    if (!a) return
    return registerAction({
      ...a,
      when: () => !latest.current?.when || latest.current.when(),
      run: (args) => latest.current?.run(args),
    })
  }, [key])
}

/** Several actions at once (e.g. one per page in the site map). */
export function useVoiceActions(actions: VoiceAction[]): void {
  const latest = useRef(actions)
  useLayoutEffect(() => {
    latest.current = actions
  })
  const key = useMemo(() => actions.map(signature).join('\n'), [actions])
  useEffect(() => {
    const offs = latest.current.map((a) =>
      registerAction({
        ...a,
        when: () => {
          const cur = latest.current.find((x) => x.id === a.id)
          return !cur?.when || cur.when()
        },
        run: (args) => latest.current.find((x) => x.id === a.id)?.run(args),
      }),
    )
    return () => offs.forEach((off) => off())
  }, [key])
}

/** All actions currently on offer, re-rendering when the list changes. */
export function useActionList(): VoiceAction[] {
  const all = useSyncExternalStore(subscribeActions, actionsSnapshot, actionsSnapshot)
  return all.filter((a) => !a.when || a.when())
}

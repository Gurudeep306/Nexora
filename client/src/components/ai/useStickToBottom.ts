import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const THRESHOLD = 48

/**
 * Keeps a scroll container pinned to the bottom while content grows (a reply
 * streaming in), but lets go as soon as the reader scrolls up — `atBottom`
 * false is the cue to offer "Jump to latest".
 */
export function useStickToBottom(ref: RefObject<HTMLElement | null>, trigger: unknown) {
  const pinned = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < THRESHOLD
      pinned.current = near
      setAtBottom(near)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [ref])

  useLayoutEffect(() => {
    const el = ref.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [ref, trigger])

  const scrollToBottom = useCallback(() => {
    const el = ref.current
    if (!el) return
    pinned.current = true
    setAtBottom(true)
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [ref])

  return { atBottom, scrollToBottom, pin: () => (pinned.current = true) }
}

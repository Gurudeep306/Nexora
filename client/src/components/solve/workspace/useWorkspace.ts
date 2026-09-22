import { useCallback, useEffect, useState } from 'react'
import { loadWorkspace, PRESETS, saveWorkspace, type Dock, type PaneId, type Rect, type WorkspaceState } from './state'

export function useWorkspace() {
  const [ws, setWs] = useState<WorkspaceState>(loadWorkspace)
  useEffect(() => saveWorkspace(ws), [ws])

  const dock = useCallback((pane: PaneId, d: Dock, float?: Partial<Rect>) => {
    setWs((s) => ({
      ...s,
      maximized: s.maximized === pane ? null : s.maximized,
      [pane]: { ...s[pane], dock: d, minimized: false, float: { ...s[pane].float, ...float } },
    }))
  }, [])
  const setFloat = useCallback((pane: PaneId, r: Partial<Rect>) => {
    setWs((s) => ({ ...s, [pane]: { ...s[pane], float: { ...s[pane].float, ...r } } }))
  }, [])
  const minimize = useCallback((pane: PaneId, v?: boolean) => {
    setWs((s) => ({
      ...s,
      maximized: s.maximized === pane ? null : s.maximized,
      [pane]: { ...s[pane], minimized: v ?? !s[pane].minimized },
    }))
  }, [])
  const toggleMax = useCallback((id: PaneId | 'editor') => {
    setWs((s) => ({
      ...s,
      maximized: s.maximized === id ? null : id,
      ...(id !== 'editor' ? { [id]: { ...s[id], minimized: false } } : {}),
    }))
  }, [])
  const applyPreset = useCallback((key: string) => {
    const p = PRESETS[key]
    if (p) setWs({ ...structuredClone(p.state), maximized: null })
  }, [])

  // Alt+1 problem · Alt+2 tests · Alt+3 zoom editor · Esc restores a maximized pane
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ws.maximized && !document.querySelector('[role="dialog"]')) {
        setWs((s) => ({ ...s, maximized: null }))
        return
      }
      if (!e.altKey || e.metaKey || e.ctrlKey) return
      if (e.code === 'Digit1') {
        e.preventDefault()
        minimize('problem')
      } else if (e.code === 'Digit2') {
        e.preventDefault()
        minimize('tests')
      } else if (e.code === 'Digit3') {
        e.preventDefault()
        toggleMax('editor')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ws.maximized, minimize, toggleMax])

  return { ws, dock, setFloat, minimize, toggleMax, applyPreset }
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>

import { useCallback, useEffect, useState } from 'react'
import { IMMERSIVE_DEFAULT, loadWorkspace, PRESETS, saveWorkspace, type Dock, type FloatState, type PaneId, type Rect, type WorkspaceState } from './state'

export function useWorkspace() {
  const [ws, setWs] = useState<WorkspaceState>(loadWorkspace)
  const [arena, setArena] = useState(false)
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
    // In the arena a preset also switches the arena to the docked layout.
    if (p) setWs((s) => ({ ...structuredClone(p.state), maximized: null, immersive: s.immersive, arenaMode: s.arenaMode }))
  }, [])
  const setArenaMode = useCallback((m: 'floating' | 'docked') => setWs((s) => ({ ...s, arenaMode: m, maximized: null })), [])
  /** Window state inside the full-screen arena. */
  const setImmersive = useCallback((pane: PaneId, patch: Partial<FloatState> & { float?: Partial<Rect> }) => {
    setWs((s) => ({
      ...s,
      immersive: {
        ...s.immersive,
        [pane]: { ...s.immersive[pane], ...patch, float: { ...s.immersive[pane].float, ...patch.float } },
      },
    }))
  }, [])
  const resetImmersive = useCallback(() => setWs((s) => ({ ...s, immersive: structuredClone(IMMERSIVE_DEFAULT) })), [])

  // Alt+1 problem · Alt+2 tests · Alt+3 zoom editor · Esc restores a maximized pane
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ws.maximized && !arena && !document.querySelector('[role="dialog"]')) {
        setWs((s) => ({ ...s, maximized: null }))
        return
      }
      if (!e.altKey || e.metaKey || e.ctrlKey) return
      if ((e.code === 'Digit1' || e.code === 'Digit2') && arena && ws.arenaMode === 'floating') {
        e.preventDefault()
        const p = e.code === 'Digit1' ? 'problem' : 'tests'
        setWs((s) => ({ ...s, immersive: { ...s.immersive, [p]: { ...s.immersive[p], minimized: !s.immersive[p].minimized } } }))
      } else if (e.code === 'Digit1') {
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
  }, [ws.maximized, ws.arenaMode, minimize, toggleMax, arena])

  return { ws, dock, setFloat, minimize, toggleMax, applyPreset, setImmersive, resetImmersive, arena, setArena, setArenaMode }
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>

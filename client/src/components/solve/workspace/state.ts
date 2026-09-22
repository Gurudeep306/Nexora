/* Solve-page workspace layout: where each pane is docked, minimized, floating
   or maximized. Persisted per browser so your arrangement sticks. */

export type PaneId = 'problem' | 'tests'
export type Dock = 'left' | 'right' | 'bottom' | 'float'
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface PaneState {
  dock: Dock
  minimized: boolean
  float: Rect
}
export interface WorkspaceState {
  problem: PaneState
  tests: PaneState
  maximized: PaneId | 'editor' | null
}

export const ALLOWED_DOCKS: Record<PaneId, Dock[]> = {
  problem: ['left', 'right', 'float'],
  tests: ['bottom', 'right', 'left', 'float'],
}

const KEY = 'nexora:workspace:v2'

export const PRESETS: Record<string, { label: string; hint: string; state: Omit<WorkspaceState, 'maximized'> }> = {
  classic: {
    label: 'Classic',
    hint: 'Problem left · tests under the editor',
    state: {
      problem: { dock: 'left', minimized: false, float: { x: 40, y: 40, w: 520, h: 560 } },
      tests: { dock: 'bottom', minimized: false, float: { x: 120, y: 120, w: 560, h: 340 } },
    },
  },
  mirror: {
    label: 'Mirrored',
    hint: 'Editor left · problem on the right',
    state: {
      problem: { dock: 'right', minimized: false, float: { x: 40, y: 40, w: 520, h: 560 } },
      tests: { dock: 'bottom', minimized: false, float: { x: 120, y: 120, w: 560, h: 340 } },
    },
  },
  columns: {
    label: 'Three columns',
    hint: 'Problem · editor · tests side by side',
    state: {
      problem: { dock: 'left', minimized: false, float: { x: 40, y: 40, w: 520, h: 560 } },
      tests: { dock: 'right', minimized: false, float: { x: 120, y: 120, w: 560, h: 340 } },
    },
  },
  floating: {
    label: 'Floating tests',
    hint: 'Tests in a movable window over the editor',
    state: {
      problem: { dock: 'left', minimized: false, float: { x: 40, y: 40, w: 520, h: 560 } },
      tests: { dock: 'float', minimized: false, float: { x: -1, y: -1, w: 520, h: 320 } },
    },
  },
  focus: {
    label: 'Focus',
    hint: 'Just the editor — panes tucked away',
    state: {
      problem: { dock: 'left', minimized: true, float: { x: 40, y: 40, w: 520, h: 560 } },
      tests: { dock: 'bottom', minimized: true, float: { x: 120, y: 120, w: 560, h: 340 } },
    },
  },
}

export function loadWorkspace(): WorkspaceState {
  const base: WorkspaceState = { ...structuredClone(PRESETS.classic.state), maximized: null }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<WorkspaceState>
      for (const id of ['problem', 'tests'] as PaneId[]) {
        const p = v[id]
        if (p && ALLOWED_DOCKS[id].includes(p.dock)) base[id] = { ...base[id], ...p, float: { ...base[id].float, ...p.float } }
      }
      return base
    }
    // Carry over the older single-flag preferences.
    if (localStorage.getItem('nexora:panel:problem') === 'collapsed') base.problem.minimized = true
  } catch {
    /* storage unavailable */
  }
  return base
}

export function saveWorkspace(ws: WorkspaceState) {
  try {
    const { maximized: _m, ...rest } = ws
    void _m
    localStorage.setItem(KEY, JSON.stringify(rest))
  } catch {
    /* ignore */
  }
}

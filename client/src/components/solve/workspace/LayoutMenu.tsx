import { AppWindow, Check, Columns3, LayoutPanelLeft, LayoutTemplate, PanelRight, PictureInPicture2, Maximize, RotateCcw } from 'lucide-react'
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Tooltip } from '@/components/ui'
import { PRESETS } from './state'
import type { WorkspaceApi } from './useWorkspace'

const ICONS: Record<string, React.ReactNode> = {
  classic: <LayoutPanelLeft />,
  mirror: <PanelRight />,
  columns: <Columns3 />,
  floating: <PictureInPicture2 />,
  focus: <Maximize />,
}

/** Which preset matches the current dock layout (for the ✓ mark). */
function currentPreset(api: WorkspaceApi) {
  const { problem, tests } = api.ws
  return Object.entries(PRESETS).find(
    ([, p]) =>
      p.state.problem.dock === problem.dock &&
      p.state.tests.dock === tests.dock &&
      p.state.problem.minimized === problem.minimized &&
      p.state.tests.minimized === tests.minimized,
  )?.[0]
}

export function LayoutMenu({ api, arena = false }: { api: WorkspaceApi; arena?: boolean }) {
  const floatingArena = arena && api.ws.arenaMode === 'floating'
  const active = floatingArena ? null : currentPreset(api)
  return (
    <Menu>
      <Tooltip label="Workspace layout">
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Workspace layout">
            <LayoutTemplate aria-hidden="true" />
          </Button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent className="w-72">
        {arena && (
          <>
            <MenuLabel>Full-screen style</MenuLabel>
            <MenuItem icon={<AppWindow />} shortcut={floatingArena ? <Check className="size-3.5" /> : undefined} onSelect={() => api.setArenaMode('floating')}>
              <span className="block text-foreground">Floating windows</span>
              <span className="block text-[11px] text-foreground-faint">Editor fills the screen · panes float above</span>
            </MenuItem>
            {floatingArena && (
              <MenuItem icon={<RotateCcw />} onSelect={api.resetImmersive}>
                Reset window positions
              </MenuItem>
            )}
            <MenuSeparator />
          </>
        )}
        <MenuLabel>{arena ? 'Docked layouts' : 'Layout presets'}</MenuLabel>
        {Object.entries(PRESETS).map(([k, p]) => (
          <MenuItem
            key={k}
            icon={ICONS[k]}
            shortcut={active === k ? <Check className="size-3.5" /> : undefined}
            onSelect={() => {
              api.applyPreset(k)
              if (arena) api.setArenaMode('docked')
            }}
          >
            <span className="block text-foreground">{p.label}</span>
            <span className="block text-[11px] text-foreground-faint">{p.hint}</span>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuLabel>Panels</MenuLabel>
        {(['problem', 'tests'] as const).map((p, i) => {
          const hidden = floatingArena ? api.ws.immersive[p].minimized : api.ws[p].minimized
          return (
            <MenuItem
              key={p}
              shortcut={`Alt ${i + 1}`}
              onSelect={() => (floatingArena ? api.setImmersive(p, { minimized: !hidden }) : api.minimize(p))}
            >
              {hidden ? `Show ${p}` : `Minimize ${p}`}
            </MenuItem>
          )
        })}
        <MenuItem onSelect={() => api.toggleMax('editor')} shortcut="Alt 3">
          {api.ws.maximized === 'editor' ? 'Restore editor' : 'Zen mode (editor only)'}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

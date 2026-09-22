import { Columns3, LayoutPanelLeft, LayoutTemplate, PanelRight, PictureInPicture2, Maximize } from 'lucide-react'
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

export function LayoutMenu({ api }: { api: WorkspaceApi }) {
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
        <MenuLabel>Layout presets</MenuLabel>
        {Object.entries(PRESETS).map(([k, p]) => (
          <MenuItem key={k} icon={ICONS[k]} onSelect={() => api.applyPreset(k)}>
            <span className="block text-foreground">{p.label}</span>
            <span className="block text-[11px] text-foreground-faint">{p.hint}</span>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuLabel>Panels</MenuLabel>
        <MenuItem onSelect={() => api.minimize('problem')} shortcut="Alt 1">
          {api.ws.problem.minimized ? 'Show problem' : 'Minimize problem'}
        </MenuItem>
        <MenuItem onSelect={() => api.minimize('tests')} shortcut="Alt 2">
          {api.ws.tests.minimized ? 'Show tests' : 'Minimize tests'}
        </MenuItem>
        <MenuItem onSelect={() => api.toggleMax('editor')} shortcut="Alt 3">
          {api.ws.maximized === 'editor' ? 'Restore editor' : 'Zen mode (editor only)'}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

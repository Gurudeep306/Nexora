import { createLucideIcon } from 'lucide-react'

/**
 * The Copilot's mark: a core with one satellite on an open orbit — the lead
 * that keeps the other agents moving. Drawn on lucide's 24px grid with the
 * same stroke, so it sits beside any other icon (and takes size/colour the
 * same way). Replaces the robot glyph, which read as a toy.
 */
export const CopilotMark = createLucideIcon('copilot-mark', [
  ['path', { d: 'M16.5 4.21A9 9 0 1 0 19.79 7.5', key: 'orbit' }],
  ['circle', { cx: '18.36', cy: '5.64', r: '1.6', key: 'satellite' }],
  ['circle', { cx: '12', cy: '12', r: '2.6', key: 'core' }],
])

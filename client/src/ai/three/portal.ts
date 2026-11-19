/*
  Where page labels inside a 3D scene attach: the scene's own frame, which
  stays on the page while its 3D view comes and goes (so labels are never
  removed from a node that is already gone).
*/
import { createContext, useContext, type RefObject } from 'react'

export const LabelHost = createContext<RefObject<HTMLElement | null> | null>(null)
export const useLabelHost = () => (useContext(LabelHost) ?? undefined) as RefObject<HTMLElement> | undefined

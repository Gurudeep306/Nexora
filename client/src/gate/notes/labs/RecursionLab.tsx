/*
  Recursion Tracer (Programming & Data Structures, Chapter 3 Live Lab): the shared C lab
  (./CLab.tsx, engine ./cLogic.ts) with the Chapter 3 presets and tabs ['calls', 'trace'].
*/
import { CLab, type CLabTab } from './CLab'

const TABS: CLabTab[] = ['calls', 'trace']

export default function RecursionLab({ tab, title }: { tab?: string; title?: string }) {
  return <CLab chapter={3} tabs={TABS} initial={tab} title={title} name="Recursion Tracer" />
}

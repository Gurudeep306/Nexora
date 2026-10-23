/*
  C Tracer (Programming & Data Structures, Chapter 1 Live Lab): the shared C lab
  (./CLab.tsx, engine ./cLogic.ts) with the Chapter 1 presets and tabs ['trace', 'expr'].
*/
import { CLab, type CLabTab } from './CLab'

const TABS: CLabTab[] = ['trace', 'expr']

export default function CTracer({ tab, title }: { tab?: string; title?: string }) {
  return <CLab chapter={1} tabs={TABS} initial={tab} title={title} name="C Tracer" />
}

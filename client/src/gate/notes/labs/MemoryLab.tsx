/*
  Memory Inspector (Programming & Data Structures, Chapter 2 Live Lab): the shared C lab
  (./CLab.tsx, engine ./cLogic.ts) with the Chapter 2 presets and tabs ['memory', 'trace'].
*/
import { CLab, type CLabTab } from './CLab'

const TABS: CLabTab[] = ['memory', 'trace']

export default function MemoryLab({ tab, title }: { tab?: string; title?: string }) {
  return <CLab chapter={2} tabs={TABS} initial={tab} title={title} name="Memory Inspector" />
}

/*
  Live Labs the reader can embed with :::lab{lab="…"}. Each is lazily
  loaded, so a lesson pays for a lab only when it shows one. Keep the names
  in step with LABS in scripts/build-gate-notes.js.
*/
import { lazy } from 'react'

export const LABS = {
  'gate-bench': lazy(() => import('./GateBench')),
  'kmap-solver': lazy(() => import('./KmapSolver')),
  'comb-workbench': lazy(() => import('./CombWorkbench')),
  'adder-race': lazy(() => import('./AdderRace')),
  'flipflop-scope': lazy(() => import('./FlipflopScope')),
  'counter-fsm': lazy(() => import('./CounterFsm')),
} as const

export type LabName = keyof typeof LABS

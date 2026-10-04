import type { Algorithm } from '../../../engine/types'
import { algorithms1 } from './algorithms1'
import { algorithms2 } from './algorithms2'
import { algorithms3 } from './algorithms3'
import { algorithms4 } from './algorithms4'

/** The Arrays topic's own animations (the original ones live in src/learn/algorithms and register globally). */
export const algorithms: Algorithm[] = [...algorithms1, ...algorithms2, ...algorithms3, ...algorithms4]

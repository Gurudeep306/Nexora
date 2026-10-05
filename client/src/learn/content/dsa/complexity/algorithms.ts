import type { Algorithm } from '../../../engine/types'
import { algorithms1 } from './algorithms1'
import { algorithms2 } from './algorithms2'
import { algorithms3 } from './algorithms3'
import { algorithms4 } from './algorithms4'
import { algorithms5 } from './algorithms5'

/** This topic's own animations (the original cx-* ones are registered globally in src/learn/algorithms). */
export const algorithms: Algorithm[] = [...algorithms1, ...algorithms2, ...algorithms3, ...algorithms4, ...algorithms5]

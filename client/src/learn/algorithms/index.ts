import type { Algorithm } from '../engine/types'
import { arrAccess, arrDelete, arrDynamic, arrInsert, arrLinear, arrReverse, arrRotate, arrTraverse } from './arrays1'
import { arrDedupe, arrKadane, arrMoveZeroes, arrPrefix, arrRowMajor, arrTwoSum, arrWindowFixed, arrWindowVar } from './arrays2'

/** Every animation the lessons can embed, by id. */
export const ALGORITHMS: Record<string, Algorithm> = Object.fromEntries(
  [
    arrAccess,
    arrTraverse,
    arrInsert,
    arrDelete,
    arrLinear,
    arrReverse,
    arrRotate,
    arrDynamic,
    arrPrefix,
    arrTwoSum,
    arrDedupe,
    arrMoveZeroes,
    arrWindowFixed,
    arrWindowVar,
    arrKadane,
    arrRowMajor,
  ].map((a) => [a.id, a]),
)

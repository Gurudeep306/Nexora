import type { Algorithm } from '../engine/types'
import { registerAlgorithms } from '../engine/registry'
import { arrAccess, arrDelete, arrDynamic, arrInsert, arrLinear, arrReverse, arrRotate, arrTraverse } from './arrays1'
import { arrDiff, arrDutch, arrLeaders, arrMajority, arrMerge, arrSpiral } from './arrays3'
import { cxAmortized, cxCases, cxCountOps, cxGrowth, cxHalving, cxHarmonic, cxMergeLevels, cxNLogN, cxNested, cxRecSpace, cxSqrt, cxTriangle } from './complexity'
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
    arrDiff,
    arrDutch,
    arrMerge,
    arrLeaders,
    arrMajority,
    arrSpiral,
    cxCountOps,
    cxNested,
    cxTriangle,
    cxHalving,
    cxNLogN,
    cxHarmonic,
    cxGrowth,
    cxCases,
    cxRecSpace,
    cxAmortized,
    cxMergeLevels,
    cxSqrt,
  ].map((a) => [a.id, a]),
)

registerAlgorithms(Object.values(ALGORITHMS))

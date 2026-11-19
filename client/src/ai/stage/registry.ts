/*
  The Stage registry: which kit draws which element type. A new kit (vision,
  language, RL, GPUs …) adds its element types to spec.ts and its drawers
  here; nothing else in the engine changes.
*/
import type { ComponentType } from 'react'
import type { StageElement, StageElementType } from './spec'
import type { ElCtx } from './kits/shared'
import { ArrowEl, AxesEl, ContoursEl, EllipsoidEl, FieldEl, LabelEl, LatticeEl, LineEl, PathEl, PointsEl, SurfaceEl } from './kits/math'
import { GridEl, TensorEl } from './kits/data'
import { BeadsEl } from './kits/flow'
import { NetworkEl } from './kits/nn'

const mathKit = {
  surface: SurfaceEl,
  contours: ContoursEl,
  field: FieldEl,
  points: PointsEl,
  path: PathEl,
  line: LineEl,
  arrow: ArrowEl,
  label: LabelEl,
  axes: AxesEl,
  lattice: LatticeEl,
  ellipsoid: EllipsoidEl,
}
const dataKit = { tiles: GridEl, bars: GridEl, tensor: TensorEl }
const flowKit = { beads: BeadsEl }
const nnKit = { network: NetworkEl }

type Drawer<T extends StageElementType> = ComponentType<{ el: Extract<StageElement, { type: T }>; c: ElCtx }>

/** Every element type has exactly one drawer (TypeScript checks that none is missing). */
export const REGISTRY: { [T in StageElementType]: Drawer<T> } = { ...mathKit, ...dataKit, ...flowKit, ...nnKit }

/** The kits, for the catalogue: which types each one provides. */
export const KITS: { name: string; blurb: string; types: StageElementType[] }[] = [
  { name: 'Maths', blurb: 'Surfaces, contours, vector fields, points, paths, arrows, labels, axes, lattices and ellipsoids.', types: Object.keys(mathKit) as StageElementType[] },
  { name: 'Data', blurb: 'Matrices and images as tiles, 3D bars, and tensors as blocks of cells.', types: Object.keys(dataKit) as StageElementType[] },
  { name: 'Flow', blurb: 'Beads travelling between places: signals, products into sums, samples.', types: Object.keys(flowKit) as StageElementType[] },
  { name: 'Neural networks', blurb: 'Networks that compute: filling neurons, weight ribbons, contribution beads, activation curves, weight matrices, the backward pass.', types: Object.keys(nnKit) as StageElementType[] },
]

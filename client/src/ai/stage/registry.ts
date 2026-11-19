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
import { ChartEl, CurveEl } from './kits/plot'
import { PlaneEl, RegionEl, ShapeEl } from './kits/shapes'
import { GraphEl } from './kits/graph'
import { BoxesEl, ImageEl } from './kits/vision'
import { TokensEl } from './kits/language'
import { GridworldEl } from './kits/rl'
import { MembarEl, TimelineEl } from './kits/systems'
import { CodeEl, TableEl } from './kits/text'

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
const plotKit = { curve: CurveEl, chart: ChartEl }
const shapeKit = { shape: ShapeEl, plane: PlaneEl, region: RegionEl }
const graphKit = { graph: GraphEl }
const visionKit = { image: ImageEl, boxes: BoxesEl }
const languageKit = { tokens: TokensEl }
const rlKit = { gridworld: GridworldEl }
const systemsKit = { membar: MembarEl, timeline: TimelineEl }
const textKit = { code: CodeEl, table: TableEl }

type Drawer<T extends StageElementType> = ComponentType<{ el: Extract<StageElement, { type: T }>; c: ElCtx }>

/** Every element type has exactly one drawer (TypeScript checks that none is missing). */
export const REGISTRY: { [T in StageElementType]: Drawer<T> } = { ...mathKit, ...dataKit, ...flowKit, ...nnKit, ...plotKit, ...shapeKit, ...graphKit, ...visionKit, ...languageKit, ...rlKit, ...systemsKit, ...textKit }

/** The kits, for the catalogue: which types each one provides. */
export const KITS: { name: string; blurb: string; types: StageElementType[] }[] = [
  { name: 'Maths', blurb: 'Surfaces, contours, vector fields, points, paths, arrows, labels, axes, lattices and ellipsoids.', types: Object.keys(mathKit) as StageElementType[] },
  { name: 'Data', blurb: 'Matrices and images as tiles, 3D bars, and tensors as blocks of cells.', types: Object.keys(dataKit) as StageElementType[] },
  { name: 'Flow', blurb: 'Beads travelling between places: signals, products into sums, samples.', types: Object.keys(flowKit) as StageElementType[] },
  { name: 'Plots', blurb: 'Curves drawn as they go, areas, Riemann rectangles, tangents and secants; line charts (log axes too), bar charts and histograms from real samples. They stand up in 3D.', types: Object.keys(plotKit) as StageElementType[] },
  { name: 'Shapes', blurb: 'Circles, ellipses, polygons, boxes and spheres; planes in 3D; a classifier’s decision regions with their boundary.', types: Object.keys(shapeKit) as StageElementType[] },
  { name: 'Graphs', blurb: 'Computation graphs, trees, MDPs, trellises and rings, laid out for you; weighted, directed edges with beads flowing forward or back.', types: Object.keys(graphKit) as StageElementType[] },
  { name: 'Vision', blurb: 'Images as real pixels: channels pulled apart, brightness as relief, patch grids, sliding windows; labelled boxes.', types: Object.keys(visionKit) as StageElementType[] },
  { name: 'Language', blurb: 'Tokens as chips: generated one by one, masked, highlighted, each with its probability bar; bits too.', types: Object.keys(languageKit) as StageElementType[] },
  { name: 'Reinforcement learning', blurb: 'Grid worlds: walls, rewards, values as heat and height, the policy as arrows, the agent and its path.', types: Object.keys(rlKit) as StageElementType[] },
  { name: 'Systems', blurb: 'Memory bars against a GPU’s capacity, split across devices; timelines of lanes and blocks (pipelines, streams).', types: Object.keys(systemsKit) as StageElementType[] },
  { name: 'Code and tables', blurb: 'A code panel with the running line and its variables; small tables with marked cells.', types: Object.keys(textKit) as StageElementType[] },
  { name: 'Neural networks', blurb: 'Networks that compute: filling neurons, weight ribbons, contribution beads, activation curves, weight matrices, the backward pass.', types: Object.keys(nnKit) as StageElementType[] },
]

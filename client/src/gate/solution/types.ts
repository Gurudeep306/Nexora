/*
  GATE solution format v2 — the contract between the per-paper solution files
  (src/gate/solutions/<paperId>.json), the validator
  (scripts/gate/validate-solutions.mjs + src/gate/solution.schema.json) and
  the solution page (GateSolution.tsx).

  Authoring guide: docs/gate/SOLUTION_AUTHORING.md. Keep the three in sync:
  a field added here must be added to the JSON Schema and the guide.
*/

/* ── File ────────────────────────────────────────────────────────────────── */

export interface SolutionFile {
  paper: string
  version: 2
  solutions: Record<string, Solution>
}

/* ── Solution ────────────────────────────────────────────────────────────── */

export type OptionLetter = 'A' | 'B' | 'C' | 'D' | 'E'

export interface Solution {
  /** 1–3 sentences: the best method and why it is the best. Markdown. */
  approach: string
  /** 1–6 short concept names ("SRTF scheduling", "Bayes' theorem"). */
  concepts: string[]
  /** What the question gives, restated compactly. Markdown. */
  given?: string
  /** 2–12 steps; every arithmetic step shown. */
  steps: Step[]
  answer: SolutionAnswer
  /** Required for MCQ / MSQ: one entry per option, in order. */
  optionAnalysis?: OptionVerdict[]
  /** A faster exam-hall route to the same answer. Markdown. */
  shortcut?: string
  /** Common traps. Each a short markdown sentence. */
  pitfalls?: string[]
  /** How the answer was double-checked (independent method, substitution…). */
  verification?: string
  /** The base frame of the animation. Steps patch it (see Step.scene). */
  animation?: Frame
}

export interface Step {
  /** Short imperative title ("Run SRTF until P3 arrives"). Plain text + $math$. */
  title: string
  /** Markdown + KaTeX. May contain small tables, lists, code fences. */
  body: string
  /**
   * The animation state at this step, as a SHALLOW PATCH applied on top of the
   * previous step's frame (keys you omit keep their previous value; arrays are
   * replaced, never merged). A patch that has `kind` starts a fresh frame.
   * Omit to keep showing the previous frame.
   */
  scene?: FramePatch
}

export interface SolutionAnswer {
  /** The final answer as displayed. Markdown ("**19 ms** (option D)"). */
  value: string
  /** MCQ / MSQ / TF / MATCH: the option letter(s) this solution proves. */
  choice?: OptionLetter[]
  /** NAT: the numeric value this solution computes. */
  number?: number
  /** Does `choice` / `number` agree with the stored key (questions.json)? */
  matchesKey: boolean
  /** Required when matchesKey is false: why the stored key is wrong / missing. */
  keyNote?: string
}

export interface OptionVerdict {
  option: OptionLetter
  correct: boolean
  /** Why this option is right or wrong. Markdown, one or two sentences. */
  reason: string
}

/* ── Scene frames ────────────────────────────────────────────────────────── */

/**
 * Semantic colours (never raw colours — every theme maps them):
 * accent = the thing in focus now · success = done / hit / accepted / answer
 * error = fault / miss / rejected / conflict · warning = candidate / compared /
 * changed · info = visited / secondary · muted = discarded / inactive ·
 * cat1–cat3 = extra categorical colours for groups.
 */
export type Tone = 'default' | 'accent' | 'success' | 'error' | 'warning' | 'info' | 'muted' | 'cat1' | 'cat2' | 'cat3'

export const TONES: readonly Tone[] = ['default', 'accent', 'success', 'error', 'warning', 'info', 'muted', 'cat1', 'cat2', 'cat3']

/** A value cell: a bare value, or an object with identity / colour / subscript. */
export type Cell = string | number | null | CellObj
export interface CellObj {
  v: string | number | null
  /** Stable identity so the cell glides when it moves (swaps, shifts). */
  id?: string
  tone?: Tone
  /** Small text under the value (index, count, timestamp…). */
  sub?: string
}

/** Highlight a cell, a whole row (omit c) or a whole column (omit r). 0-based. */
export interface GridMark {
  r?: number
  c?: number
  tone?: Tone
}

/** Fields every frame may carry. */
export interface FrameCommon {
  /** Heading shown above the canvas. Plain text. */
  title?: string
  /** One short markdown line shown under the canvas. */
  caption?: string
  /** Named values shown as chips (changed values pulse). */
  vars?: Record<string, string | number>
}

export interface ArrayFrame extends FrameCommon {
  kind: 'array'
  cells: Cell[]
  /** Name shown left of the array ("A"). */
  label?: string
  /** Index shown under cell 0 (default 0). */
  indexBase?: number
  showIndex?: boolean
  /** 'linked' draws arrows between cells (linked list). */
  variant?: 'cells' | 'linked'
  pointers?: { name: string; at: number; tone?: Tone }[]
  /** Highlight a cell or an inclusive [from, to] range of cells (0-based positions). */
  hl?: { at: number | [number, number]; tone?: Tone }[]
  /** Brackets under a range of cells (window, partition, subarray). */
  ranges?: { from: number; to: number; label?: string; tone?: Tone }[]
}

export interface StackFrame extends FrameCommon {
  kind: 'stack'
  /** Bottom → top. */
  items: Cell[]
  label?: string
  /** Item just popped, drawn fading above the stack. */
  popped?: string | number
  hl?: { at: number; tone?: Tone }[]
}

export interface QueueFrame extends FrameCommon {
  kind: 'queue'
  /** Front → rear. */
  items: Cell[]
  label?: string
  dequeued?: string | number
  hl?: { at: number; tone?: Tone }[]
}

export interface TableFrame extends FrameCommon {
  kind: 'table'
  /** Column headers. */
  cols?: string[]
  /** Row headers (one per row). */
  rowLabels?: string[]
  /** Text in the top-left corner when both headers exist. */
  corner?: string
  rows: Cell[][]
  hl?: GridMark[]
  /** Arrows between body cells, e.g. DP back-pointers. [row, col], 0-based. */
  arrows?: { from: [number, number]; to: [number, number]; tone?: Tone }[]
  /** Show only the first N body cells in row-major order (fill animation). */
  reveal?: number
  /** Monospace cells (bit patterns, code). */
  mono?: boolean
}

export interface MatrixTerm {
  name?: string
  rows: (string | number)[][]
  hl?: GridMark[]
}
export interface MatrixFrame extends FrameCommon {
  kind: 'matrix'
  /** Matrices and operator strings in reading order: [M1, "×", M2, "=", M3]. */
  terms: (MatrixTerm | string)[]
}

export interface GraphNode {
  id: string
  label?: string
  x?: number
  y?: number
  tone?: Tone
  /** Badge under the node (distance, colour, discovery time…). */
  sub?: string
}
export interface GraphEdge {
  from: string
  to: string
  w?: string | number
  tone?: Tone
  dashed?: boolean
}
export interface GraphFrame extends FrameCommon {
  kind: 'graph'
  directed?: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Default: 'manual' when every node has x and y, else 'circle'. */
  layout?: 'manual' | 'circle' | 'layered'
  /** Node id → tone. Overrides node.tone — patch this instead of re-sending nodes. */
  tones?: Record<string, Tone>
  /** Node id → badge text. Overrides node.sub (distances, colours, times…). */
  subs?: Record<string, string>
  /** "from>to" → tone. Overrides edge.tone. Undirected edges match either order. */
  edgeTones?: Record<string, Tone>
}

export interface TreeNode {
  /** Stable identity (defaults to the label). Required when labels repeat. */
  id?: string
  /** A value, or an array of keys for a multi-key (B-tree) node. */
  label: string | number | (string | number)[]
  /** Children left → right. `null` reserves an empty slot (BST left/right). */
  children?: (TreeNode | null)[]
  tone?: Tone
  sub?: string
  /** Label on the edge from the parent (probability, branch condition). */
  edge?: string
}
export interface TreeFrame extends FrameCommon {
  kind: 'tree'
  root: TreeNode | null
}

export interface AutomatonState {
  id: string
  label?: string
  x?: number
  y?: number
  start?: boolean
  accept?: boolean
  tone?: Tone
}
export interface AutomatonFrame extends FrameCommon {
  kind: 'automaton'
  states: AutomatonState[]
  /** One edge per (from, to) pair; put several symbols in one label: "0,1". */
  edges: { from: string; to: string; label: string; tone?: Tone }[]
  /** Active state(s) — a set for NFAs. */
  current?: string[]
  /** Input tape; head = index of the next symbol (cells.length = consumed all). */
  tape?: { cells: string[]; head?: number }
  /** PDA stack, bottom → top. */
  stack?: string[]
  layout?: 'manual' | 'row' | 'circle'
  /** "from>to" → tone, e.g. the transitions just taken. Overrides edge.tone. */
  edgeTones?: Record<string, Tone>
}

export interface GanttFrame extends FrameCommon {
  kind: 'gantt'
  lanes: { label?: string; bars: { start: number; end: number; label: string; tone?: Tone }[] }[]
  /** Vertical time marker. */
  cursor?: number
  /** Labelled instants (arrivals, deadlines) on the time axis. */
  marks?: { t: number; label: string; tone?: Tone }[]
  /** Draw only up to this time (bars clipped) — grow the chart step by step. */
  upto?: number
  unit?: string
}

export interface PipelineFrame extends FrameCommon {
  kind: 'pipeline'
  /** One row per instruction; cells[k] is the stage in cycle start + k. "-" = stall. */
  rows: { label: string; start: number; cells: string[] }[]
  /** Show only cycles ≤ upto. */
  upto?: number
  /** Highlight: r = row (0-based), c = cycle number (1-based, as drawn). */
  hl?: GridMark[]
  /** Operand-forwarding arrows: [row, cycle] → [row, cycle]. */
  forwards?: { from: [number, number]; to: [number, number] }[]
}

export interface PagingFrame extends FrameCommon {
  kind: 'paging'
  policy: 'FIFO' | 'LRU' | 'OPT'
  frames: number
  refs: (string | number)[]
  /** Simulate only the first N references. */
  upto?: number
  /** Checked by the validator against its own simulation. */
  expectFaults?: number
}

export interface CacheFrame extends FrameCommon {
  kind: 'cache'
  /** One entry per set; lines = ways (null = invalid line). */
  sets: { label?: string; lines: ({ tag: string; tone?: Tone; note?: string } | null)[] }[]
  /** The access being made now. */
  access?: { set: number; way?: number; result: 'hit' | 'miss' }
}

export interface BitsFrame extends FrameCommon {
  kind: 'bits'
  rows: {
    label?: string
    /** Fields left → right; bits is a string of 0/1/x. */
    fields: { bits: string; label?: string; tone?: Tone }[]
    /** Shown at the right end ("10.12.2.0"). */
    value?: string
  }[]
  /** Visual gap every N bits (8 for IPv4). */
  group?: number
}

export interface NumberLineFrame extends FrameCommon {
  kind: 'numberline'
  min: number
  max: number
  step?: number
  points?: { x: number; label?: string; tone?: Tone }[]
  intervals?: { from: number; to: number; label?: string; tone?: Tone; open?: [boolean, boolean] }[]
}

export interface VennFrame extends FrameCommon {
  kind: 'venn'
  /** 2 or 3 sets; ids are single capital letters in drawing order. */
  sets: { id: string; label: string }[]
  /** Region → count/label. Keys: "A" (only A), "AB" (A∩B only), "ABC", "-" (outside all). */
  regions?: Record<string, string | number>
  hl?: { region: string; tone?: Tone }[]
}

export interface BarsFrame extends FrameCommon {
  kind: 'bars'
  bars: { label: string; value: number; display?: string; tone?: Tone }[]
  max?: number
  unit?: string
}

export interface EquationFrame extends FrameCommon {
  kind: 'equation'
  /** KaTeX lines WITHOUT $ delimiters, one per derivation line. */
  lines: { tex: string; note?: string; tone?: Tone }[]
  /** Show only the first N lines. */
  reveal?: number
}

export interface CodeFrame extends FrameCommon {
  kind: 'code'
  lang?: 'c' | 'cpp' | 'java' | 'python' | 'js' | 'pseudo'
  code: string
  /** Current line, 1-based. */
  line?: number
  /** Other highlighted lines, 1-based. */
  hl?: number[]
  /** Call stack, outermost first. */
  callStack?: { name: string; vars?: Record<string, string | number> }[]
  /** Program output so far. */
  output?: string
}

export interface SequenceFrame extends FrameCommon {
  kind: 'sequence'
  actors: string[]
  /** Messages between actors; t0 = send time, t1 = receive time (default t0 + 1). */
  messages: { from: string; to: string; t0: number; t1?: number; label?: string; tone?: Tone; lost?: boolean }[]
  /** Show only messages sent at or before this time. */
  upto?: number
  unit?: string
}

export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'BUF'
export interface CircuitFrame extends FrameCommon {
  kind: 'circuit'
  inputs: { id: string; label?: string; value?: 0 | 1 }[]
  gates: { id: string; type: GateType; in: string[]; label?: string; tone?: Tone }[]
  outputs: { id: string; from: string; label?: string }[]
  /** Show computed 0/1 values on wires (needs every input value). Default true. */
  showValues?: boolean
}

export interface KmapFrame extends FrameCommon {
  kind: 'kmap'
  /** 2–4 variable names, most significant first: ["P","Q","R","S"]. Rows = first half. */
  variables: string[]
  /** Minterms that are 1. */
  ones: number[]
  /** Don't-care minterms. */
  dcs?: number[]
  /** Groups (implicants) as minterm lists; each must be a valid rectangle. */
  groups?: { cells: number[]; label?: string; tone?: Tone }[]
  /** Minterms to ring (e.g. the one that makes an implicant essential). */
  hl?: { cell: number; tone?: Tone }[]
}

export interface PanelsFrame extends FrameCommon {
  kind: 'panels'
  dir?: 'row' | 'col'
  panels: Frame[]
}

export type Frame =
  | ArrayFrame
  | StackFrame
  | QueueFrame
  | TableFrame
  | MatrixFrame
  | GraphFrame
  | TreeFrame
  | AutomatonFrame
  | GanttFrame
  | PipelineFrame
  | PagingFrame
  | CacheFrame
  | BitsFrame
  | NumberLineFrame
  | VennFrame
  | BarsFrame
  | EquationFrame
  | CodeFrame
  | SequenceFrame
  | CircuitFrame
  | KmapFrame
  | PanelsFrame

export type FrameKind = Frame['kind']

/** A step's scene: a shallow patch (no kind) or a fresh frame (with kind). */
export type FramePatch = Partial<Omit<Frame, 'kind'>> & { kind?: FrameKind; [key: string]: unknown }

/* ── API ─────────────────────────────────────────────────────────────────── */

export type SolutionResponse =
  | { ok: true; id: string; format: 'v2'; solution: Solution }
  | { ok: true; id: string; format: 'legacy'; legacy: string }
  | { ok: true; id: string; format: 'none' }

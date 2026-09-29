/**
 * The animation pipeline's data model.
 *
 * An algorithm runs once, for real, on the learner's input. As it runs it
 * records *frames*: a snapshot of every data structure it touches plus the
 * step it is on. The player then replays those frames — forwards, backwards,
 * at any speed — and each frame's `step` lights up the matching line in the
 * pseudocode and in every language's code. One trace, every language.
 */

/** What a cell / item is doing in this frame; each maps to one colour. */
export type Role =
  | 'active' // the element being looked at right now
  | 'compare' // being compared
  | 'swap' // being moved / swapped
  | 'write' // just written
  | 'found' // a match / answer
  | 'done' // finished, final position
  | 'window' // inside the current window / range
  | 'pivot'
  | 'best' // best-so-far
  | 'removed'
  | 'new' // just inserted
  | 'dim' // out of play

export type Scalar = number | string | boolean | null

export interface Cell {
  /** Stable identity: a value keeps its id when it moves, so a swap animates as motion. */
  id: string
  v: Scalar
}

/** A curved arrow between two cells: "this value goes there", "these two are added". */
export interface Arrow {
  from: number
  to: number
  label?: string
  role?: Role
}

export interface Range {
  from: number
  to: number // inclusive
  role: Role
  label?: string
}

export interface ArrayState {
  kind: 'array'
  id: string
  label?: string
  cells: Cell[]
  /** Draw this many slots; slots past cells.length render as empty (capacity). */
  capacity?: number
  roles?: Record<number, Role>
  pointers?: Record<string, number>
  ranges?: Range[]
  /** Render values as bars (heights) under the boxes — handy for sorting. */
  bars?: boolean
  /** Show memory addresses above the cells: base + i * size. */
  address?: { base: number; size: number }
  arrows?: Arrow[]
}

export interface VarsState {
  kind: 'vars'
  id: string
  label?: string
  vars: Record<string, Scalar>
  /** Names whose value changed in this frame (flash). */
  changed?: string[]
  /** The value each changed name had before this frame. */
  prev?: Record<string, Scalar>
}

export interface StackState {
  kind: 'stack'
  id: string
  label?: string
  items: Cell[]
  roles?: Record<number, Role>
}

export interface QueueState {
  kind: 'queue'
  id: string
  label?: string
  items: Cell[]
  roles?: Record<number, Role>
}

export interface GridState {
  kind: 'grid'
  id: string
  label?: string
  rows: Scalar[][]
  roles?: Record<string, Role> // "r,c"
  rowLabels?: string[]
  colLabels?: string[]
}

/**
 * A cost meter: a running count (operations, copies, memory cells) drawn as a
 * bar against reference marks such as n, n log n and n², so growth is seen,
 * not just computed.
 */
export interface MeterState {
  kind: 'meter'
  id: string
  label?: string
  value: number
  marks?: { label: string; value: number }[]
  role?: Role
}

export interface OutputState {
  kind: 'output'
  id: string
  label?: string
  lines: string[]
}

export type Structure = ArrayState | VarsState | StackState | QueueState | GridState | OutputState | MeterState

export interface Frame {
  /** Step id; code lines tagged `@step` light up. */
  step: string
  /** One sentence, plain language: what is happening and why. */
  note: string
  structures: Structure[]
}

export type Lang = 'pseudo' | 'cpp' | 'java' | 'python' | 'js' | 'c'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'pseudo', label: 'Pseudocode' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'js', label: 'JavaScript' },
  { id: 'c', label: 'C' },
]

/** An input field the learner can edit before running the animation. */
export interface InputField {
  name: string
  label: string
  type: 'array' | 'number' | 'string'
  default: string
  hint?: string
  /** Validation / limits for arrays */
  maxLen?: number
  min?: number
  max?: number
}

export type Inputs = Record<string, number[] | number | string>

export interface Algorithm {
  id: string
  title: string
  /** One-line summary shown above the player. */
  blurb?: string
  inputs: InputField[]
  /** Code per language, lines tagged with `@step` markers in a trailing comment. */
  code: Partial<Record<Lang, string>>
  /** Runs the algorithm on the inputs and records the frames. */
  run: (inp: Inputs) => Frame[]
  /** What each colour means in this animation, where the generic word would mislead. */
  legend?: Partial<Record<Role, string>>
  /** Random input generator (for the shuffle button). */
  random?: () => Record<string, string>
}

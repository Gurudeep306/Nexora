/*
  The sketched look: rough.js (MIT) turns boxes, circles, arrows and lines
  into slightly wobbly pen strokes. It is fetched on first use only; until
  it arrives (and with "Clean lines" on) the renderer draws crisp SVG.
  Every shape is seeded from its element id so a scene doesn't jitter from
  frame to frame.
*/
import { useEffect, useState } from 'react'
import type { RoughGenerator } from 'roughjs/bin/generator'

export type Sketcher = RoughGenerator

let gen: RoughGenerator | null = null
let pending: Promise<RoughGenerator> | null = null

export function loadSketcher(): Promise<RoughGenerator> {
  if (gen) return Promise.resolve(gen)
  pending ??= import('roughjs').then((m) => (gen = m.default.generator()))
  return pending
}

/** The rough.js generator once loaded (null while loading or when `on` is false). */
export function useSketcher(on: boolean): RoughGenerator | null {
  const [g, setG] = useState<RoughGenerator | null>(gen)
  useEffect(() => {
    if (!on || g) return
    let alive = true
    loadSketcher()
      .then((x) => alive && setG(x))
      .catch(() => {
        /* offline: stay with clean lines */
      })
    return () => {
      alive = false
    }
  }, [on, g])
  return on ? g : null
}

export function seedOf(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return (h >>> 0) % 2147483646 + 1
}

const OPTS = { roughness: 0.9, bowing: 0.8, strokeWidth: 1.6, disableMultiStroke: false, preserveVertices: true }

/** SVG path data for the stroke of a drawable (fills are drawn separately, crisp). */
const cache = new Map<string, string[]>()

export function strokePaths(g: RoughGenerator, kind: 'rect' | 'circle' | 'line' | 'path' | 'poly', args: number[] | string | [number, number][], id: string): string[] {
  const key = `${kind}|${id}|${typeof args === 'string' ? args : args.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  const out = draw(g, kind, args, id)
  if (cache.size > 4000) cache.clear()
  cache.set(key, out)
  return out
}

function draw(g: RoughGenerator, kind: 'rect' | 'circle' | 'line' | 'path' | 'poly', args: number[] | string | [number, number][], id: string): string[] {
  const o = { ...OPTS, seed: seedOf(id) }
  let d
  if (kind === 'rect') {
    const [x, y, w, h] = args as number[]
    d = g.rectangle(x!, y!, w!, h!, o)
  } else if (kind === 'circle') {
    const [cx, cy, r] = args as number[]
    d = g.circle(cx!, cy!, r! * 2, o)
  } else if (kind === 'line') {
    const [x1, y1, x2, y2] = args as number[]
    d = g.line(x1!, y1!, x2!, y2!, o)
  } else if (kind === 'poly') {
    d = g.linearPath(args as [number, number][], o)
  } else {
    d = g.path(args as string, o)
  }
  return g.toPaths(d).map((p) => p.d)
}

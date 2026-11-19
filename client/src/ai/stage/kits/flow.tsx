/*
  Stage kit: flow. Beads that travel from one place to another along an arc
  (a signal, a product flying into its sum, a sample moving). Matte, solid.
*/
import type { V3 } from '../../three/coords'
import { Mat } from '../../three/studio'
import type { StageElement } from '../spec'
import { at3, toneColor, type ElCtx } from './shared'

export function BeadsEl({ el, c }: { el: Extract<StageElement, { type: 'beads' }>; c: ElCtx }) {
  const u = Math.max(0, Math.min(1, el.progress))
  if (u <= 0 || u >= 1) return null
  const col = toneColor(c.p, el.tone, 'accent')
  return (
    <group>
      {el.from.map((a, i) => {
        const b = el.to[i]
        const q: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + (el.arc ?? 0) * Math.sin(Math.PI * u)]
        return (
          <mesh key={i} position={at3(q, c.lift)}>
            <sphereGeometry args={[el.r ?? 0.08, 16, 16]} />
            <Mat color={col} roughness={0.35} transparent opacity={(el.opacity ?? 1) * c.dim(el.id)} />
          </mesh>
        )
      })}
    </group>
  )
}

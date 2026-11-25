/*
  How the teacher is drawn: tuned by comparing renders side by side, in light
  and dark, on a woman and a man teacher (docs/voice/VIRTUAL_TEACHER.md §3.2.5).

  - Neutral tone mapping instead of the library's ACES: ACES washed the skin
    out and turned it orange; Neutral keeps real skin colour and depth.
  - Matte skin and clothes: the models' skin was as shiny as plastic.
  - Hair edges cut cleanly (alpha test) instead of blended, so curls are
    sharp and there is no dark halo where the hair overlaps itself.
  - Sharper textures at an angle (anisotropic filtering).
*/
import { NeutralToneMapping, type Material, type Object3D, type Texture } from 'three'

export const LOOK = { exposure: 1.12, environment: 0.55, skinRoughness: 0.68, clothRoughness: 0.8, hairCut: 0.45 }

interface Drawable {
  renderer: { toneMapping: number; toneMappingExposure: number; capabilities?: { getMaxAnisotropy(): number } }
  scene: { environmentIntensity: number }
  armature: Object3D | null
}

type Tuned = Material & { name: string; roughness?: number; alphaTest: number; depthWrite: boolean; map?: Texture | null; normalMap?: Texture | null }

/** The pixel ratio passed to TalkingHead, which multiplies it by the screen's: at most 2 on screen, never more. */
export function pixelRatio(dpr: number): number {
  const d = dpr > 0 ? dpr : 1
  return Math.min(d, 2) / d
}

export function polish(head: Drawable) {
  head.renderer.toneMapping = NeutralToneMapping
  head.renderer.toneMappingExposure = LOOK.exposure
  head.scene.environmentIntensity = LOOK.environment
  const aniso = Math.min(8, head.renderer.capabilities?.getMaxAnisotropy() ?? 1)
  head.armature?.traverse((o) => {
    const mesh = o as Object3D & { isMesh?: boolean; material?: Material | Material[] }
    if (!mesh.isMesh || !mesh.material) return
    for (const m of ([] as Material[]).concat(mesh.material) as Tuned[]) {
      if (/opacity|hair|lash/i.test(m.name)) {
        m.alphaTest = LOOK.hairCut
        m.depthWrite = true
      } else if (/head|face|skin/i.test(m.name)) m.roughness = LOOK.skinRoughness
      else if (typeof m.roughness === 'number') m.roughness = Math.max(m.roughness, LOOK.clothRoughness)
      for (const t of [m.map, m.normalMap]) {
        if (t) {
          t.anisotropy = aniso
          t.needsUpdate = true
        }
      }
      m.needsUpdate = true
    }
  })
}

/*
  Pratibimb looks: how a model's materials are shaded in the browser.

  "painted" (default): close to real, with a painted finish. Soft light-to-shadow ramp (MToon with a
  low toony factor), a warm shift in skin shadows, a soft rim, a glossy band on hair, glossy eyes, and no
  ink outline on the face (lines on a talking face read as cartoon and flicker on the lips; see the
  Pratibimb design report). Most of the "paint" is already in the textures (scripts/teacher/maker).
  "anime": stepped shading and a thin outline. "real": plain physically based shading.

  Uses three.js and three-vrm's MToonMaterial (both MIT).
*/
import * as THREE from 'three'
import { MToonMaterial } from '@pixiv/three-vrm'

export type Look = 'painted' | 'anime' | 'real'

/** A small picture of how a shiny sphere looks; MToon adds it on top for highlights. */
function matcap(kind: 'hair' | 'skin' | 'cloth' | 'eye'): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, 256, 256)
  if (kind === 'hair') {
    // The glossy band across the upper part of the hair.
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(255,236,220,${(0.016 * (40 - i)) / 40})`
      g.lineWidth = 8 + i * 1.2
      g.beginPath()
      g.ellipse(128, 150, 104, 62, 0, Math.PI * 1.08, Math.PI * 1.92)
      g.stroke()
    }
  } else {
    const r = kind === 'eye' ? g.createRadialGradient(90, 80, 2, 90, 80, 40) : g.createRadialGradient(96, 84, 4, 128, 128, 128)
    const top = kind === 'eye' ? 'rgba(255,255,255,0.9)' : kind === 'skin' ? 'rgba(255,230,215,0.18)' : 'rgba(255,255,255,0.1)'
    r.addColorStop(0, top)
    r.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 256, 256)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let caps: Record<string, THREE.Texture> | null = null

/** Re-dress every mesh of a loaded VRM in the chosen look. Returns the meshes that carry face shapes. */
export function applyLook(root: THREE.Object3D, look: Look): THREE.Mesh[] {
  caps ??= { hair: matcap('hair'), skin: matcap('skin'), cloth: matcap('cloth'), eye: matcap('eye') }
  const faceMeshes: THREE.Mesh[] = []
  const toony = look === 'anime' ? 0.75 : 0.3
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.frustumCulled = false
    const old = mesh.material as THREE.MeshStandardMaterial
    const name = (old.name || '').toLowerCase()
    if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).some((k) => k.startsWith('mouth') || k.startsWith('viseme'))) faceMeshes.push(mesh)
    if (look === 'real') return
    const hair = /long|hair|braid|bob|pony|short|afro/.test(name)
    const cut = old.alphaTest > 0 || /eyebrow|eyelash/.test(name)
    const skin = /body/.test(name)
    const eye = /low-poly|eye(?!brow|lash)/.test(name)
    const teeth = /teeth|tongue/.test(name)
    const m = new MToonMaterial({
      map: old.map ?? undefined,
      transparent: false,
      shadeColorFactor: skin ? new THREE.Color(0.8, 0.55, 0.5) : hair ? new THREE.Color(0.55, 0.5, 0.5) : new THREE.Color(0.66, 0.62, 0.66),
      shadeMultiplyTexture: old.map ?? undefined,
      shadingShiftFactor: skin ? -0.05 : -0.1,
      shadingToonyFactor: toony,
      giEqualizationFactor: 0.6,
      parametricRimColorFactor: hair ? new THREE.Color(0.06, 0.04, 0.03) : new THREE.Color(skin ? 0.3 : 0.2, skin ? 0.2 : 0.18, skin ? 0.18 : 0.2),
      parametricRimFresnelPowerFactor: 4,
      parametricRimLiftFactor: 0.05,
      matcapTexture: teeth ? undefined : hair ? caps!.hair : skin ? caps!.skin : eye ? caps!.eye : caps!.cloth,
      side: cut ? THREE.DoubleSide : THREE.FrontSide,
    })
    m.name = old.name
    if (cut) {
      m.alphaTest = 0.5
      ;(m.uniforms as unknown as { alphaTest: { value: number } }).alphaTest.value = 0.5
    }
    if (teeth) {
      m.color = new THREE.Color(1.22, 1.2, 1.16)
      m.shadeColorFactor = new THREE.Color(0.92, 0.88, 0.86)
    }
    mesh.material = m
    // Anime only: a thin outline (the same skinned surface pushed out, back faces only). Never on the painted face.
    if (look === 'anime' && !cut && !eye && !teeth) {
      const om = new THREE.MeshBasicMaterial({ color: skin ? 0x6b3a2c : 0x2a2024, side: THREE.BackSide })
      om.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(objectNormal) * 0.0016;')
      }
      const sk = mesh as THREE.SkinnedMesh
      let ol: THREE.Mesh
      if (sk.isSkinnedMesh) {
        const skinned = new THREE.SkinnedMesh(mesh.geometry, om)
        skinned.bind(sk.skeleton, sk.bindMatrix)
        ol = skinned
      } else ol = new THREE.Mesh(mesh.geometry, om)
      ol.morphTargetInfluences = mesh.morphTargetInfluences
      ol.morphTargetDictionary = mesh.morphTargetDictionary
      ol.frustumCulled = false
      mesh.parent?.add(ol)
      ol.position.copy(mesh.position)
      ol.quaternion.copy(mesh.quaternion)
      ol.scale.copy(mesh.scale)
    }
  })
  return faceMeshes
}

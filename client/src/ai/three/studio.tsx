/*
  The studio look for every 3D scene: real-object depth, no glow.

    - Mat: one physical material for everything (matte porcelain: soft
      roughness and a thin clearcoat), so the whole library changes together.
    - Studio: soft light panels around the scene (drei Lightformers: built
      in code, nothing downloaded), ambient occlusion in creases where things
      meet (N8AO), a soft shadow on the ground (ContactShadows), smooth edges
      (SMAA). Shadows and occlusion fade out in the flat 2D view, where a
      diagram should read as paper.

  Libraries: three.js, @react-three/drei, @react-three/postprocessing (n8ao):
  all MIT.
*/
import type { ComponentProps } from 'react'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing'
import type { Palette3D } from './theme3d'

/** The one material of the library: matte porcelain. Accepts the usual material props. */
export function Mat({ roughness = 0.5, ...rest }: ComponentProps<'meshPhysicalMaterial'>) {
  return <meshPhysicalMaterial roughness={roughness} metalness={0} clearcoat={0.28} clearcoatRoughness={0.5} {...rest} />
}

export function Studio({ p, lift, ground = -0.02, size = 16, quality = 'high' }: { p: Palette3D; lift: number; ground?: number; size?: number; quality?: 'high' | 'low' }) {
  const depth = Math.max(0, Math.min(1, lift))
  return (
    <>
      <color attach="background" args={[p.surface]} />
      {/* Studio light: one big soft box above, two long strips at the sides, a low fill. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={p.dark ? 1.6 : 2.4} position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={p.dark ? 0.9 : 1.3} position={[-8, 3, 2]} rotation={[0, Math.PI / 2, 0]} scale={[10, 2.5, 1]} />
        <Lightformer form="rect" intensity={p.dark ? 0.7 : 1.0} position={[8, 2, -3]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 2, 1]} />
        <Lightformer form="ring" intensity={0.5} position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={6} />
      </Environment>
      {depth > 0.02 && <ContactShadows position={[0, ground, 0]} scale={size} far={6} blur={2.6} resolution={512} opacity={(p.dark ? 0.55 : 0.32) * depth} color={p.dark ? '#000000' : '#3a342b'} />}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={0.55} distanceFalloff={0.6} intensity={1.6 * depth + 0.2} quality={quality === 'low' ? 'performance' : 'medium'} halfRes={quality === 'low'} color={p.dark ? 'black' : '#2b2620'} />
        <SMAA />
      </EffectComposer>
    </>
  )
}

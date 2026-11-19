/** Math coordinates (x, y, z) → three.js scene: x → right, y → depth, z → up (three.js has y up). */
export type V3 = [number, number, number]
export const toScene = (x: number, y: number, z: number): V3 => [x, z, -y]

/** The Hive mark's geometry (see ./hiveMark.tsx). */
export const HIVE_STROKES = ['M6.4 6.9V25.4', 'M16.8 6.9V25.4', 'M6.4 16.15H21.6'] as const
export const HIVE_STOP = [25.6, 16.15] as const
export const hiveWeight = (px: number) => (px <= 20 ? 3.8 : px <= 24 ? 3.5 : 3.2)

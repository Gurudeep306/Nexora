import { useEffect, useState } from 'react'

/** Row density for every list in Hive, remembered per browser. */
export type Density = 'comfortable' | 'compact'
const DENSITY = 'hive:density'
export function readDensity(): Density {
  try {
    return localStorage.getItem(DENSITY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}
export function writeDensity(d: Density) {
  try {
    localStorage.setItem(DENSITY, d)
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent('hive:density', { detail: d }))
}
/** The density in effect, kept in sync with Settings. */
export function useDensity(): Density {
  const [d, setD] = useState(readDensity)
  useEffect(() => {
    const on = (e: Event) => setD((e as CustomEvent<Density>).detail)
    window.addEventListener('hive:density', on)
    return () => window.removeEventListener('hive:density', on)
  }, [])
  return d
}

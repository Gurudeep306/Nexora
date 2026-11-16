import { useEffect } from 'react'
import { useSite } from '@/context/SiteContext'
import { useTheme, LOOK_KEY } from '@/context/ThemeContext'
import { sanitizeLook } from '@/theme/look'

/**
 * The site's default theme (Admin → Site), for people who have never
 * chosen a look of their own on this device. A signed-in account's saved
 * look still wins (LookSync applies it after). Renders nothing.
 */
export function DefaultStyleSync() {
  const { status } = useSite()
  const { look, setLook } = useTheme()
  const want = status?.defaultStyle ?? null
  useEffect(() => {
    if (!want) return
    // An older default (one of the retired styles) maps to its nearest theme.
    const target = sanitizeLook({ ...look, v: 5, style: want }).style
    let chosen = false
    try {
      chosen = !!localStorage.getItem(LOOK_KEY)
    } catch {
      chosen = true // storage blocked: don't keep overriding
    }
    if (!chosen && look.style !== target) setLook({ style: target })
    // Only when the site default arrives or changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want])
  return null
}

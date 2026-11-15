import { useEffect } from 'react'
import { useSite } from '@/context/SiteContext'
import { useTheme, LOOK_KEY } from '@/context/ThemeContext'
import { STYLE_BY_ID } from '@/theme/styles'
import { styleLook } from './StylesSection'

/**
 * The site's default design style (Admin → Site), for people who have never
 * chosen a look of their own on this device. A signed-in account's saved
 * look still wins (LookSync applies it after). Renders nothing.
 */
export function DefaultStyleSync() {
  const { status } = useSite()
  const { look, setLook } = useTheme()
  const want = status?.defaultStyle ?? null
  useEffect(() => {
    if (!want) return
    const s = STYLE_BY_ID.get(want)
    if (!s) return
    let chosen = false
    try {
      chosen = !!localStorage.getItem(LOOK_KEY)
    } catch {
      chosen = true // storage blocked: don't keep overriding
    }
    if (!chosen && look.style !== s.id) setLook(styleLook(look, s))
    // Only when the site default arrives or changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want])
  return null
}

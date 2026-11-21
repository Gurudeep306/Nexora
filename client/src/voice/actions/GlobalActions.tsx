/*
  The site-wide actions of the Action Graph, with what each one does. Mounted
  once in the app shell. The phrases live in globalSpecs.ts (tested); the ⌘K
  palette and the shortcut sheet read their entries from the same registry.
*/
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { openAssistantEvent } from '@/context/AgentContext'
import { usePageEntries } from '@/components/layout/searchSources'
import { openCommandPalette } from '@/components/layout/CommandPalette'
import { openShortcuts } from '@/components/layout/ShortcutsDialog'
import { goToRandomProblem } from '@/lib/randomProblem'
import { EXTRA_PLACES, GLOBAL_SPECS, placeSpec } from './globalSpecs'
import { useVoiceActions } from './useVoiceAction'
import type { ActionSpec, VoiceAction } from './types'

function scrollPage(to: 'down' | 'up' | 'top' | 'bottom') {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto'
  if (to === 'top') window.scrollTo({ top: 0, behavior })
  else if (to === 'bottom') window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
  else window.scrollBy({ top: (to === 'down' ? 1 : -1) * Math.round(window.innerHeight * 0.75), behavior })
}

export function GlobalActions() {
  const navigate = useNavigate()
  const { mode, setAppearance } = useTheme()
  const { logout } = useAuth()
  const pages = usePageEntries()

  const actions = useMemo<VoiceAction[]>(() => {
    const spec = (id: string): ActionSpec => GLOBAL_SPECS.find((s) => s.id === id)!
    const places = [...pages.filter((p) => !p.external).map((p) => ({ to: p.to, label: p.label })), ...EXTRA_PLACES.filter((e) => !pages.some((p) => p.to === e.to))]
    return [
      { ...placeSpec(places), title: 'Open a page', palette: false, run: ({ page }) => { if (page) navigate(page) } },
      { ...spec('nav.back'), title: 'Go back', palette: false, run: () => navigate(-1) },
      { ...spec('page.scroll.down'), title: 'Scroll down', palette: false, run: () => scrollPage('down') },
      { ...spec('page.scroll.up'), title: 'Scroll up', palette: false, run: () => scrollPage('up') },
      { ...spec('page.scroll.top'), title: 'Go to the top', palette: false, run: () => scrollPage('top') },
      { ...spec('page.scroll.bottom'), title: 'Go to the bottom', palette: false, run: () => scrollPage('bottom') },
      { ...spec('problem.random'), title: 'Surprise me — random problem', icon: 'random', run: () => goToRandomProblem(navigate) },
      { ...spec('look.mode.dark'), title: 'Switch to dark mode', hint: 'Appearance', icon: 'moon', palette: mode !== 'dark', run: () => setAppearance('dark') },
      { ...spec('look.mode.light'), title: 'Switch to light mode', hint: 'Appearance', icon: 'sun', palette: mode === 'dark', run: () => setAppearance('light') },
      {
        id: 'look.theme.open',
        risk: 'safe',
        say: { en: ['change theme', 'change style', 'change the look'], hi: ['theme badlo', 'theme change'] },
        title: 'Change style or theme…',
        hint: 'Appearance',
        icon: 'palette',
        run: () => navigate('/theme'),
      },
      { ...spec('profile.open'), title: 'View my profile', icon: 'profile', run: () => navigate('/profile') },
      {
        id: 'settings.avatar',
        risk: 'safe',
        say: { en: ['change my avatar', 'change avatar', 'change my photo'], hi: ['avatar badlo', 'photo badlo'] },
        title: 'Change my avatar',
        icon: 'settings',
        run: () => navigate('/settings'),
      },
      { ...spec('palette.open'), title: 'Search / command palette', keys: ['⌘', 'K'], palette: false, run: () => openCommandPalette() },
      { ...spec('shortcuts.open'), title: 'Keyboard shortcuts', hint: '?', icon: 'keyboard', keys: ['?'], run: () => openShortcuts() },
      { ...spec('assistant.open'), title: 'AI assistant', keys: ['⌘', 'J'], palette: false, run: () => openAssistantEvent() },
      {
        ...spec('auth.logout'),
        title: 'Log out',
        icon: 'logout',
        run: async () => {
          await logout()
          navigate('/auth')
        },
      },
    ]
  }, [pages, navigate, mode, setAppearance, logout])

  useVoiceActions(actions)
  return null
}

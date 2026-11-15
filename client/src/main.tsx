import { StrictMode } from 'react'
import { MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
// Self-hosted default typefaces (no third-party font requests). Any other
// font the user picks is loaded on demand — see theme/fontLoaders.ts.
import '@fontsource-variable/geist'
import '@fontsource-variable/jetbrains-mono'
// Newsreader: the Field Journal serif (the house style), loaded up front so
// titles never swap faces after the first paint.
import '@fontsource-variable/newsreader/opsz.css'
import './index.css'
import './styles/reading.css'
import './styles/reader.css'
import './styles/search.css'
import './styles/journal.css'
import 'virtual:nexora-theme.css'
import './theme/styles.css'
import { loadCodeFont, loadUiFont } from './theme/fontLoaders'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'
import { SocketProvider } from './lib/socket'
import { SiteProvider } from './context/SiteContext'
import { ThemeProvider } from './context/ThemeContext'
import { DefaultStyleSync } from './components/look/DefaultStyleSync'
import { initFaviconFx } from './lib/faviconFx'
import { initSentry } from './lib/sentry'

initSentry()
// The first-paint script has already put the chosen fonts on <html>; start
// fetching them now, before React renders, so the swap is as early as it can be.
void loadUiFont(document.documentElement.dataset.font ?? '')
void loadCodeFont(document.documentElement.dataset.codeFont ?? '')

initFaviconFx()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Every motion animation honours the reduced-motion setting. */}
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <SiteProvider>
              <DefaultStyleSync />
              <App />
            </SiteProvider>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
)

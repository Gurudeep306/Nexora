import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted default typefaces (no third-party font requests). Any other
// font the user picks is loaded on demand — see theme/fontLoaders.ts.
import '@fontsource-variable/geist'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import 'virtual:nexora-theme.css'
import { loadCodeFont, loadUiFont } from './theme/fontLoaders'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'
import { SocketProvider } from './lib/socket'
import { SiteProvider } from './context/SiteContext'
import { ThemeProvider } from './context/ThemeContext'
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
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <SiteProvider>
              <App />
            </SiteProvider>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

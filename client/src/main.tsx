import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (no Google Fonts request; works offline and under strict CSP)
import '@fontsource/chakra-petch/300.css'
import '@fontsource/chakra-petch/400.css'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/russo-one/400.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'
import { SocketProvider } from './lib/socket'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initTheme } from '@/shared/ui/theme'
import '@/app/styles/global.css'
import '@/shared/ui/ui.css'

initTheme()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

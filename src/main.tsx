import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PillRoot } from './PillRoot.tsx'
import './index.css'
import { installConsoleBuffer } from './services/consoleBuffer'
import { analytics } from './services/analytics'

// Capture recent console errors early so the alpha feedback widget can attach
// them. Harmless no-op for non-testers.
installConsoleBuffer()

// The dedicated focus-pill overlay window is loaded with `?pill=1` and renders
// only the pill (not the full app) so it can travel across Spaces on its own.
const isPillWindow = new URLSearchParams(window.location.search).has('pill')

// Analytics runs only in the main window. The pill is a second BrowserWindow in
// the same app run, so initialising it here too would double-count every launch
// (and emit two heartbeat streams for one session).
if (!isPillWindow) analytics.init()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {isPillWindow ? <PillRoot /> : <App />}
    </React.StrictMode>,
)

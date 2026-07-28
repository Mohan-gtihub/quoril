import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PillRoot } from './PillRoot.tsx'
import './index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { installConsoleBuffer } from './services/consoleBuffer'
import { analytics } from './services/analytics'

// Capture recent console errors early so the alpha feedback widget can attach
// them. Harmless no-op for non-testers. Guarded because a throw here runs
// before React mounts and would leave the user staring at a black screen.
try {
    installConsoleBuffer()
} catch (e) {
    console.error('[bootstrap] installConsoleBuffer failed', e)
}

// The dedicated focus-pill overlay window is loaded with `?pill=1` and renders
// only the pill (not the full app) so it can travel across Spaces on its own.
const isPillWindow = new URLSearchParams(window.location.search).has('pill')

// Analytics runs only in the main window. The pill is a second BrowserWindow in
// the same app run, so initialising it here too would double-count every launch
// (and emit two heartbeat streams for one session). Guarded for the same
// reason as above: a synchronous failure must not block the first paint.
if (!isPillWindow) {
    try {
        analytics.init()
    } catch (e) {
        console.error('[bootstrap] analytics.init failed', e)
    }
}

// A top-level ErrorBoundary here catches render errors thrown by App/PillRoot
// themselves (their own boundaries only wrap their children, so a throw in the
// root component's body would otherwise black-screen the window).
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            {isPillWindow ? <PillRoot /> : <App />}
        </ErrorBoundary>
    </React.StrictMode>,
)

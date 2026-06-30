import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PillRoot } from './PillRoot.tsx'
import './index.css'

// The dedicated focus-pill overlay window is loaded with `?pill=1` and renders
// only the pill (not the full app) so it can travel across Spaces on its own.
const isPillWindow = new URLSearchParams(window.location.search).has('pill')

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {isPillWindow ? <PillRoot /> : <App />}
    </React.StrictMode>,
)

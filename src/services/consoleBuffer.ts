// A tiny rolling ring of recent console errors/warnings + unhandled rejections,
// captured so the alpha feedback widget can attach "what blew up right before
// the tester hit report" without any external logging service.
//
// install() is called once from main.tsx. It patches console.error/warn and
// listens for global errors. Kept intentionally small and dependency-free.

export interface LogEntry {
    level: 'error' | 'warn'
    message: string
    at: string // ISO timestamp
}

const MAX = 25
const ring: LogEntry[] = []
let installed = false

function push(level: LogEntry['level'], args: unknown[]) {
    let message: string
    try {
        message = args
            .map((a) => {
                if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ''}`
                if (typeof a === 'string') return a
                try { return JSON.stringify(a) } catch { return String(a) }
            })
            .join(' ')
            .slice(0, 2000)
    } catch {
        message = '[unserializable log]'
    }
    ring.push({ level, message, at: new Date().toISOString() })
    if (ring.length > MAX) ring.shift()
}

/** Snapshot the current buffer (most recent last). */
export function getConsoleBuffer(): LogEntry[] {
    return ring.slice()
}

export function installConsoleBuffer() {
    if (installed || typeof window === 'undefined') return
    installed = true

    const origError = console.error.bind(console)
    const origWarn = console.warn.bind(console)

    console.error = (...args: unknown[]) => { push('error', args); origError(...args) }
    console.warn = (...args: unknown[]) => { push('warn', args); origWarn(...args) }

    window.addEventListener('error', (e) => {
        push('error', [e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : ''])
    })
    window.addEventListener('unhandledrejection', (e) => {
        push('error', ['Unhandled rejection:', (e as PromiseRejectionEvent).reason])
    })
}

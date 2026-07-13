// A tiny rolling ring of recent console errors/warnings + unhandled rejections,
// captured so the alpha feedback widget can attach "what blew up right before
// the tester hit report" without any external logging service.
//
// install() is called once from main.tsx. It patches console.error/warn and
// listens for global errors. Kept intentionally small and dependency-free.

export interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    at: string // ISO timestamp
}

const MAX = 25
const ring: LogEntry[] = []
let installed = false

// Logs are included in an optional feedback report, so diagnostics must never
// turn into a second store for credentials or private task content.
const SENSITIVE_KEY = /(?:access|refresh)[_-]?token|authorization|password|secret|api[_-]?key|cookie|email|user[_-]?id|description|content|title|params|payload/i
const TOKEN_VALUE = /(?:bearer\s+|(?:access|refresh)[_-]?token[=:]|(?:sb|eyJ)[\w.-]{12,})/gi

function sanitize(value: unknown, key = '', depth = 0): string {
    if (SENSITIVE_KEY.test(key)) return '[redacted]'
    if (value instanceof Error) return `${value.name}: ${sanitize(value.message, 'error_message', depth + 1)}`
    if (typeof value === 'string') {
        return value
            .replace(TOKEN_VALUE, '[redacted]')
            .replace(/([?&](?:code|token|state|email)=[^&#\s]+)/gi, '[redacted]')
            .slice(0, 500)
    }
    if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (depth >= 3) return '[truncated]'
    if (Array.isArray(value)) return `[${value.slice(0, 10).map(item => sanitize(item, '', depth + 1)).join(', ')}${value.length > 10 ? ', …' : ''}]`
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .slice(0, 20)
            .map(([entryKey, entryValue]) => `${entryKey}=${sanitize(entryValue, entryKey, depth + 1)}`)
        return `{${entries.join(', ')}${Object.keys(value as object).length > 20 ? ', …' : ''}}`
    }
    return String(value).slice(0, 500)
}

function push(level: LogEntry['level'], args: unknown[]) {
    let message: string
    try {
        message = args.map(a => sanitize(a)).join(' ')
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

/** Adds an explicitly structured lifecycle event to the local feedback buffer. */
export function recordDiagnosticEvent(level: LogEntry['level'], event: string, details?: Record<string, unknown>) {
    push(level, [event, details ?? {}])
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

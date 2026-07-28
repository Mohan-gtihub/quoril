import { recordDiagnosticEvent } from './consoleBuffer'

type LogDetails = Record<string, unknown>

function write(level: 'debug' | 'info' | 'warn' | 'error', event: string, details?: LogDetails) {
    // Debug logs are deliberately development-only. Production logging is
    // limited to lifecycle events and failures, and is never sent anywhere
    // unless a signed-in user explicitly submits feedback.
    if (level === 'debug' && import.meta.env.PROD) return

    const entry = details && Object.keys(details).length > 0
        ? { event, ...details }
        : { event }

    // warn/error calls are captured by installConsoleBuffer's console wrappers.
    // Recording them here too would duplicate every failure in feedback reports.
    if (level === 'debug' || level === 'info') recordDiagnosticEvent(level, event, details)
    console[level]('[Quoril]', entry)
}

export const logger = {
    debug: (event: string, details?: LogDetails) => write('debug', event, details),
    info: (event: string, details?: LogDetails) => write('info', event, details),
    warn: (event: string, details?: LogDetails) => write('warn', event, details),
    error: (event: string, details?: LogDetails) => write('error', event, details),
}

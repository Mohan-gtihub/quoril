/**
 * Custom hook to access Electron API safely
 * Returns undefined if not running in Electron environment
 */
export function useElectron() {
    if (typeof window !== 'undefined' && window.electronAPI) {
        return window.electronAPI
    }
    return undefined
}

/**
 * Check if app is running in Electron
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
}

/**
 * Get app version
 */
export async function getAppVersion(): Promise<string> {
    const electron = useElectron()
    if (electron) {
        return await electron.app.getVersion()
    }
    return '1.0.0'
}

/**
 * Get platform
 */
export async function getPlatform(): Promise<string> {
    const electron = useElectron()
    if (electron) {
        return await electron.app.getPlatform()
    }
    return 'web'
}

/**
 * Show native notification
 */
export async function showNotification(title: string, body: string): Promise<void> {
    const electron = useElectron()
    if (electron) {
        await electron.notification.show(title, body)
    } else {
        // Fallback to web notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body })
        }
    }
}

/**
 * Open URL in external browser
 */
export async function openExternal(url: string): Promise<void> {
    const electron = useElectron()
    if (electron) {
        await electron.file.openExternal(url)
    } else {
        window.open(url, '_blank')
    }
}

/**
 * Minimize window
 */
export async function minimizeWindow(): Promise<void> {
    const electron = useElectron()
    if (electron) {
        await electron.window.minimize()
    }
}

/**
 * Maximize/restore window
 */
export async function toggleMaximizeWindow(): Promise<void> {
    const electron = useElectron()
    if (electron) {
        await electron.window.maximize()
    }
}

/**
 * Close window
 */
export async function closeWindow(): Promise<void> {
    const electron = useElectron()
    if (electron) {
        await electron.window.close()
    }
}

/**
 * Notify Electron about focus session start
 */
export function notifyFocusStarted(duration: number, taskId: string): void {
    const electron = useElectron()
    if (electron) {
        electron.focus.started({ duration, taskId })
    }
}

/**
 * Notify Electron about focus session end
 */
export function notifyFocusEnded(): void {
    const electron = useElectron()
    if (electron) {
        electron.focus.ended()
    }
}

/**
 * Listen for focus session start requests from tray
 */
export function onFocusStartRequest(callback: () => void): (() => void) | undefined {
    const electron = useElectron()
    if (electron) {
        return electron.focus.onStartRequest(callback)
    }
    return undefined
}

/* ---------------- AUTO UPDATE ----------------
 * Silent background updates via electron-updater + GitHub Releases.
 *
 * Flow (see the product spec):
 *   1. On launch (and on an interval) we silently check for updates. If none,
 *      the user sees nothing.
 *   2. If an update is available it downloads in the BACKGROUND automatically
 *      while the app stays usable. Progress is streamed to the renderer so it
 *      can show a thin bar / "Downloading update… 42%".
 *   3. When the download hits 100% we notify: "ready to install — restart now
 *      or later?". Restart-now quits and installs; Later installs on next quit.
 *
 * The renderer talks to this via the `updates` IPC surface (see preload).
 */

import { app, ipcMain, BrowserWindow } from 'electron'
import pkg from 'electron-updater'

// electron-updater ships as CommonJS; the default export holds autoUpdater.
const { autoUpdater } = pkg

// How often to re-check while the app is running (6h). The first check fires
// shortly after launch.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const INITIAL_CHECK_DELAY_MS = 8 * 1000

export type UpdateStatus =
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'not-available' }
    | { state: 'available'; version: string }
    | { state: 'downloading'; version: string; percent: number; bytesPerSecond: number; transferred: number; total: number }
    | { state: 'downloaded'; version: string }
    | { state: 'error'; message: string }

let lastStatus: UpdateStatus = { state: 'idle' }
let checkTimer: ReturnType<typeof setInterval> | null = null
let quittingToInstall = false

function broadcast(status: UpdateStatus) {
    lastStatus = status
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
            win.webContents.send('update:status', status)
        }
    }
}

/**
 * Wire up electron-updater. Call once after the app is ready and the first
 * window exists. Safe to call in dev — it just no-ops the network checks.
 */
export function initAutoUpdate() {
    // In dev there is no packaged app / update feed; don't attempt network calls.
    if (!app.isPackaged) {
        lastStatus = { state: 'idle' }
        registerIpc()
        return
    }

    // We drive downloading and installing manually so we can show progress and
    // ask the user before restarting.
    autoUpdater.autoDownload = true            // start the download as soon as an update is found
    autoUpdater.autoInstallOnAppQuit = true    // "Later" → install on next quit
    autoUpdater.allowDowngrade = false

    autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }))

    autoUpdater.on('update-not-available', () => broadcast({ state: 'not-available' }))

    autoUpdater.on('update-available', (info) => {
        broadcast({ state: 'available', version: info.version })
    })

    autoUpdater.on('download-progress', (p) => {
        broadcast({
            state: 'downloading',
            version: lastStatus.state === 'available' || lastStatus.state === 'downloading'
                ? (lastStatus as any).version
                : '',
            percent: Math.round(p.percent),
            bytesPerSecond: Math.round(p.bytesPerSecond),
            transferred: p.transferred,
            total: p.total,
        })
    })

    autoUpdater.on('update-downloaded', (info) => {
        broadcast({ state: 'downloaded', version: info.version })
    })

    autoUpdater.on('error', (err) => {
        // Update failures must never crash or block the app — surface quietly.
        broadcast({ state: 'error', message: err?.message ?? String(err) })
    })

    registerIpc()

    // Kick off the first silent check a few seconds after launch so it doesn't
    // compete with startup work, then poll on an interval.
    setTimeout(() => { void checkSilently() }, INITIAL_CHECK_DELAY_MS)
    checkTimer = setInterval(() => { void checkSilently() }, CHECK_INTERVAL_MS)

    app.on('before-quit', () => {
        if (checkTimer) clearInterval(checkTimer)
    })
}

async function checkSilently() {
    try {
        await autoUpdater.checkForUpdates()
    } catch (err: any) {
        // Offline / feed unreachable is expected and harmless — stay silent.
        broadcast({ state: 'error', message: err?.message ?? String(err) })
    }
}

function registerIpc() {
    // Renderer pulls the current status on mount so it can render the right UI
    // even if it missed the initial broadcast.
    ipcMain.handle('update:getStatus', () => lastStatus)

    // Manual "check now" (e.g. a button in settings). No-op in dev.
    ipcMain.handle('update:check', async () => {
        if (!app.isPackaged) return { state: 'not-available' } as UpdateStatus
        await checkSilently()
        return lastStatus
    })

    // User clicked "Restart Now" — quit and install immediately.
    ipcMain.handle('update:restartAndInstall', () => {
        if (lastStatus.state !== 'downloaded') return false
        quittingToInstall = true
        // isSilent=false shows the installer UI briefly; isForceRunAfter=true
        // relaunches the app after installing.
        setImmediate(() => autoUpdater.quitAndInstall(false, true))
        return true
    })
}

export function isQuittingToInstall() {
    return quittingToInstall
}

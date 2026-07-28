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

import fs from 'node:fs'
import path from 'node:path'
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
    | { state: 'available'; version: string; notes: string | null; releaseDate: string | null }
    | { state: 'downloading'; version: string; percent: number; bytesPerSecond: number; transferred: number; total: number }
    | { state: 'downloaded'; version: string; notes: string | null; releaseDate: string | null }
    | { state: 'error'; message: string }

let lastStatus: UpdateStatus = { state: 'idle' }
let checkTimer: ReturnType<typeof setInterval> | null = null
let quittingToInstall = false
// True only while a user-initiated check is running. Lets the 'error' handler
// tell "the user asked and is waiting" from "a background poll hit no network".
let manualCheckInFlight = false

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

    // A packaged app has no visible console, so update failures were previously
    // invisible — including installs that silently never applied. Log to
    // ~/Library/Logs/Quoril/updater.log (and the OS equivalent elsewhere).
    autoUpdater.logger = createUpdateLogger()

    // We drive downloading and installing manually so the user consents before
    // we spend their bandwidth, and before we restart their app.
    autoUpdater.autoDownload = false           // wait for an explicit "Download"
    autoUpdater.autoInstallOnAppQuit = true    // "Later" → install on next quit
    autoUpdater.allowDowngrade = false

    autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }))

    autoUpdater.on('update-not-available', () => broadcast({ state: 'not-available' }))

    autoUpdater.on('update-available', (info) => {
        broadcast({
            state: 'available',
            version: info.version,
            notes: normalizeNotes(info.releaseNotes),
            releaseDate: info.releaseDate ?? null,
        })
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
        broadcast({
            state: 'downloaded',
            version: info.version,
            notes: normalizeNotes(info.releaseNotes),
            releaseDate: info.releaseDate ?? null,
        })
    })

    autoUpdater.on('error', (err) => {
        // Update failures must never crash or block the app — surface quietly.
        // This fires independently of checkSilently's try/catch (electron-updater
        // emits here for async download failures too), so the same
        // offline-noise filter has to apply. manualCheckInFlight lets a
        // user-initiated check still see the error it caused.
        if (!manualCheckInFlight && isNetworkError(err)) return
        if (isFeedMissingError(err)) {
            // The release exists but carries no metadata for this platform —
            // there is simply nothing to update to. Not an error the user can
            // act on, and identical in effect to "you're on the latest".
            broadcast(manualCheckInFlight
                ? { state: 'error', message: noBuildMessage() }
                : { state: 'not-available' })
            return
        }
        broadcast({ state: 'error', message: describeError(err) })
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

// A release body is remote, attacker-influenceable content, so it is treated as
// untrusted text end to end: normalized to a plain string here and rendered as
// text (never as HTML) in the renderer.
const MAX_NOTES_LENGTH = 4000

/**
 * electron-updater types `releaseNotes` as `string | ReleaseNoteInfo[] | null`:
 * a plain string is the GitHub release body, the array form appears only when
 * `fullChangelog` is on. Collapse both to one trimmed, length-capped string so
 * the renderer has a single shape to deal with.
 */
function normalizeNotes(notes: unknown): string | null {
    let text: string
    if (typeof notes === 'string') {
        text = notes
    } else if (Array.isArray(notes)) {
        text = notes
            .map((n: any) => {
                const body = typeof n?.note === 'string' ? n.note.trim() : ''
                return n?.version ? `## ${n.version}\n${body}` : body
            })
            .filter(Boolean)
            .join('\n\n')
    } else {
        return null
    }

    // GitHub sends CRLF; normalize so line-splitting in the UI is predictable.
    text = text.replace(/\r\n/g, '\n').trim()
    if (!text) return null
    return text.length > MAX_NOTES_LENGTH
        ? `${text.slice(0, MAX_NOTES_LENGTH).trimEnd()}…`
        : text
}

/**
 * Minimal file logger for electron-updater. Deliberately dependency-free — it
 * only needs to answer "did the download finish, and did the install apply?"
 * after the fact, which the packaged app otherwise gives no way to see.
 */
function createUpdateLogger() {
    const logFile = path.join(app.getPath('logs'), 'updater.log')

    const write = (level: string, ...args: unknown[]) => {
        const line = `[${new Date().toISOString()}] ${level} ${args
            .map((a) => (a instanceof Error ? (a.stack ?? a.message) : typeof a === 'string' ? a : JSON.stringify(a)))
            .join(' ')}\n`
        try {
            fs.mkdirSync(path.dirname(logFile), { recursive: true })
            fs.appendFileSync(logFile, line)
        } catch {
            // Logging must never break the updater.
        }
    }

    return {
        info: (...a: unknown[]) => write('INFO', ...a),
        warn: (...a: unknown[]) => write('WARN', ...a),
        error: (...a: unknown[]) => write('ERROR', ...a),
        debug: (...a: unknown[]) => write('DEBUG', ...a),
    }
}

// Network-class failures: the machine is offline, DNS isn't up yet, or the
// release feed is briefly unreachable. On the automatic path these are
// expected and self-correcting — the next poll picks the update up — so
// surfacing them would train users to ignore a card that mostly cries wolf.
// The first automatic check fires 8s after launch, which routinely lands
// before wifi has associated.
export function isNetworkError(err: any): boolean {
    const code = String(err?.code ?? '')
    if (/^(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EPIPE|ERR_INTERNET_DISCONNECTED)$/.test(code)) {
        return true
    }
    const msg = String(err?.message ?? err ?? '').toLowerCase()
    if (/net::|getaddrinfo|enotfound|econnrefused|econnreset|etimedout|network|socket hang up|unable to (connect|resolve)/.test(msg)) {
        return true
    }
    // HTTP-level failures from the release feed are equally non-actionable on a
    // background poll: GitHub returned an HTML page / 4xx / 5xx instead of the
    // update descriptor (no matching release yet, latest.yml missing, a private
    // repo, or a transient GitHub error). electron-updater surfaces these via
    // createHttpError with a numeric statusCode and a message containing the raw
    // response headers — never something a user can act on. Suppress on the
    // background path; a manual "Check for updates" still reports it.
    if (typeof err?.statusCode === 'number') return true
    return /createhttperror|http error|cannot find|unable to find|status code|latest\.yml|latest-mac\.yml/.test(msg)
}

/**
 * Named for the platform actually running, not the one this was first written
 * for. Every platform reaches this path — a release carrying only some
 * platforms' assets is exactly the situation that produces it, and which of
 * them is missing varies per release.
 */
function platformLabel(): string {
    switch (process.platform) {
        case 'darwin':
            return 'macOS'
        case 'win32':
            return 'Windows'
        case 'linux':
            return 'Linux'
        default:
            return 'this platform'
    }
}

export function noBuildMessage(): string {
    return `No update is published for ${platformLabel()} yet. You are on the newest build available.`
}

// The update feed itself is missing: electron-updater asked GitHub for
// latest-mac.yml / latest.yml on the newest release and got a 404. That happens
// whenever a release ships assets for only some platforms — the release is real,
// this platform just has nothing in it. Nothing for the user to fix, and the
// raw error is a full dump of GitHub's response headers, so it must not reach
// the UI as a scary red card.
export function isFeedMissingError(err: any): boolean {
    if (Number(err?.statusCode) === 404) return true
    const msg = String(err?.message ?? err ?? '')
    return /HttpError:\s*404|404 Not Found|"?status(Code)?"?\s*[:=]\s*404/i.test(msg)
        || /cannot find .*(latest.*\.yml)/i.test(msg)
}

// electron-updater stringifies the entire HTTP response — headers and all —
// into `message`. Keep the first line and cap the length so the renderer shows
// something a human can read.
const MAX_ERROR_LENGTH = 300
export function describeError(err: any): string {
    const raw = String(err?.message ?? err ?? 'Unknown error')
    const firstLine = raw.split('\n')[0].trim() || raw.trim()
    return firstLine.length > MAX_ERROR_LENGTH
        ? `${firstLine.slice(0, MAX_ERROR_LENGTH).trimEnd()}…`
        : firstLine
}

/**
 * @param surfaceNetworkErrors true when a human explicitly asked (the
 *   Settings "Check for updates" button). A user who clicked deserves an
 *   answer even if that answer is "you're offline"; a background poll does
 *   not get to interrupt them with it.
 */
async function checkSilently(surfaceNetworkErrors = false) {
    try {
        await autoUpdater.checkForUpdates()
    } catch (err: any) {
        if (!surfaceNetworkErrors && isNetworkError(err)) {
            // Stay silent, as the name promises. Leave lastStatus alone so a
            // previously-found update isn't clobbered by a transient blip.
            return
        }
        if (isFeedMissingError(err)) {
            broadcast(surfaceNetworkErrors
                ? { state: 'error', message: noBuildMessage() }
                : { state: 'not-available' })
            return
        }
        broadcast({ state: 'error', message: describeError(err) })
    }
}

function registerIpc() {
    // Renderer pulls the current status on mount so it can render the right UI
    // even if it missed the initial broadcast.
    ipcMain.handle('update:getStatus', () => lastStatus)

    // Manual "check now" (e.g. a button in settings). No-op in dev.
    ipcMain.handle('update:check', async () => {
        if (!app.isPackaged) return { state: 'not-available' } as UpdateStatus
        manualCheckInFlight = true
        try {
            // Pass true: an explicit click gets a real answer, including
            // "you appear to be offline", which the background poll suppresses.
            await checkSilently(true)
        } finally {
            manualCheckInFlight = false
        }
        return lastStatus
    })

    // User consented to the download.
    ipcMain.handle('update:download', async () => {
        if (lastStatus.state !== 'available') return false
        try {
            await autoUpdater.downloadUpdate()
            return true
        } catch (err: any) {
            broadcast({ state: 'error', message: describeError(err) })
            return false
        }
    })

    // User clicked "Restart Now" — quit and install immediately.
    ipcMain.handle('update:restartAndInstall', () => {
        if (lastStatus.state !== 'downloaded') return false
        quittingToInstall = true

        // The main window's 'close' handler calls preventDefault() and hides the
        // window so the app lives on in the tray. During an update install that
        // keeps the process alive past the point Squirrel's ShipIt helper waits
        // for it to exit — the app quits late and never gets relaunched. Drop
        // those listeners so the quit actually goes through.
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) win.removeAllListeners('close')
        }

        // On macOS both arguments are ignored (MacUpdater delegates to Electron's
        // native autoUpdater, which relaunches via ShipIt). They apply to the
        // Windows NSIS installer: isSilent=false shows its UI,
        // isForceRunAfter=true relaunches afterwards.
        setImmediate(() => autoUpdater.quitAndInstall(false, true))
        return true
    })
}

export function isQuittingToInstall() {
    return quittingToInstall
}

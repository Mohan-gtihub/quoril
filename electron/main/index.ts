import {
    app,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu,
    nativeImage,
    shell,
    globalShortcut,
    Notification,
    screen,
    dialog
} from 'electron'

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import { initDatabase, dbOps } from './db'
import { trackingEngine } from './core/core'
import {
    getTrackingDetail,
    setFlag,
    requestAccessibility,
    type DetailCapability,
} from './core/trackingDetail'
import { registerCanvasIpc } from './canvas/ipc'
import { generateInsights } from './insights'
import { initAutoUpdate } from './updater'
import {
    assertBoolean,
    assertNonNegativeInteger,
    assertOptionalString,
    assertString,
    validateCloudRows,
    validateExternalUrl,
    validateFocusSessionRow,
    validateFocusSessionUpdate,
    validateId,
    validateListRow,
    validateListUpdate,
    validateLocallyDeletedTable,
    validateNullableId,
    validateNotification,
    validateReportsRange,
    validateScreenTimeArgs,
    validateSessionDistractionRange,
    validateStoreKey,
    validateSubtaskRow,
    validateSubtaskUpdate,
    validateSyncLimit,
    validateSyncTable,
    validateTaskRow,
    validateTaskUpdate,
    validateWindowBounds,
    validateWorkspaceRow,
} from './ipcValidation'

/* ---------------- PATH ---------------- */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- FLAGS ---------------- */

const isDev = !app.isPackaged
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

if (isDev) process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

/* ---------------- ICON PATH (works in dev + production) ---------------- */
function getIconPath() {
    const candidates = [
        path.join(app.getAppPath(), 'public', 'icon.png'),
        path.join(process.resourcesPath, 'app', 'public', 'icon.png'),
        path.join(__dirname, '../public/icon.png'),
        path.join(__dirname, '../../public/icon.png')
    ]

    return candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0]
}

/* Set App User Model ID so Windows Search can find the app */
if (process.platform === 'win32') {
    app.setAppUserModelId('com.quoril.in')
}

/* ---------------- CACHE LOCATION ----------------
 * Chromium's GPU/disk cache defaults to userData (AppData\Roaming), which is
 * synced and can be held open by a stale Electron child from a previous dev
 * run — producing "Unable to move the cache: Access is denied (0x5)" on the
 * next launch. Relocate the cache to LOCALAPPDATA (never synced) and let the
 * shader cache stay in memory so a locked folder can't block startup. */
try {
    const cacheDir = path.join(
        process.env.LOCALAPPDATA || app.getPath('temp'),
        'quoril-cache'
    )
    fs.mkdirSync(cacheDir, { recursive: true })
    app.commandLine.appendSwitch('disk-cache-dir', cacheDir)
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
} catch {
    // Non-fatal: fall back to Chromium's default cache path.
}

/* ---------------- STATE ---------------- */

let mainWindow: BrowserWindow | null = null
let pillWindow: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false

// Buffer for a deep link that arrives before the renderer has registered its
// listener (cold-start via OAuth callback, or a send that races ready-to-show).
// The renderer pulls this on mount via the 'auth:getPendingDeepLink' IPC.
let pendingDeepLink: string | null = null

function parseDeepLink(raw: string): URL | null {
    try {
        const url = new URL(raw)
        return url.protocol === 'quoril:' && ['auth', 'resume', 'focus'].includes(url.hostname)
            ? url
            : null
    } catch {
        return null
    }
}

function isAuthDeepLink(url: string) {
    return parseDeepLink(url)?.hostname === 'auth'
}

function isTrustedRendererUrl(raw: string): boolean {
    try {
        const url = new URL(raw)
        if (isDev && VITE_DEV_SERVER_URL) return url.origin === new URL(VITE_DEV_SERVER_URL).origin
        return url.protocol === 'file:' && fileURLToPath(url) === path.join(__dirname, '../dist/index.html')
    } catch {
        return false
    }
}

function closeSecondaryWindows() {
    for (const win of BrowserWindow.getAllWindows()) {
        if (win !== mainWindow && !win.isDestroyed()) {
            win.close()
        }
    }
}

function forwardDeepLink(url: string) {
    const parsed = parseDeepLink(url)
    if (!parsed) {
        console.warn('[Security] Ignored an invalid deep link')
        return
    }
    const safeUrl = parsed.toString()

    // Always buffer the latest link so the renderer can recover it even if the
    // window/webContents is not ready to receive the IPC yet.
    pendingDeepLink = safeUrl

    if (!mainWindow || mainWindow.isDestroyed()) {
        // No window yet (cold start). It will be drained once the renderer mounts.
        return
    }

    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()

    const deliver = () => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        mainWindow.webContents.send('deep-link', safeUrl)
    }

    // If the page is still loading, wait until it finishes so the listener exists.
    if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.once('did-finish-load', deliver)
    } else {
        deliver()
    }

    // Only auth callbacks should tear down secondary windows; resume/focus deep
    // links must NOT close the focus pill they are meant to act on.
    if (isAuthDeepLink(safeUrl)) {
        closeSecondaryWindows()
    }
}

/* ---------------- SINGLE INSTANCE ---------------- */

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (_event, argv) => {
        // On Windows, deep link URLs arrive as a command-line argument in the second instance.
        // We must forward it to the renderer BEFORE restoring the window.
        const deepLinkUrl = argv.find(arg => arg.startsWith('quoril://'))
        if (deepLinkUrl) {
            forwardDeepLink(deepLinkUrl)
        }

        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            if (!mainWindow.isVisible()) mainWindow.show()
            mainWindow.setAlwaysOnTop(true)
            mainWindow.setAlwaysOnTop(false)
            mainWindow.focus()
        }
    })
}


/* ---------------- DEEP LINKS ---------------- */

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('quoril', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('quoril')
}

app.on('open-url', (event, url) => {
    event.preventDefault()
    forwardDeepLink(url)
})

// Windows/Linux cold start: the OAuth callback URL arrives as a command-line
// argument when the OS launches the app fresh. macOS uses 'open-url' instead.
if (process.platform !== 'darwin') {
    const startupDeepLink = process.argv.find(arg => arg.startsWith('quoril://'))
    const parsedStartupDeepLink = startupDeepLink ? parseDeepLink(startupDeepLink) : null
    if (parsedStartupDeepLink) {
        // Buffer it; it will be delivered once the renderer mounts and drains it.
        pendingDeepLink = parsedStartupDeepLink.toString()
    }
}

app.on('web-contents-created', (_event, contents) => {
    // The app does not need renderer-granted browser permissions. Keeping this
    // deny-by-default prevents a navigated or compromised renderer from asking
    // for camera, microphone, notifications, or geolocation access.
    contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    contents.session.setPermissionCheckHandler(() => false)

    contents.on('will-navigate', (event, url) => {
        if (parseDeepLink(url)) {
            event.preventDefault()
            forwardDeepLink(url)
            return
        }
        if (!isTrustedRendererUrl(url)) {
            event.preventDefault()
            try {
                void shell.openExternal(validateExternalUrl(url))
            } catch {
                console.warn('[Security] Blocked an untrusted renderer navigation')
            }
        }
    })
    contents.on('will-redirect', (event, url) => {
        if (!isTrustedRendererUrl(url)) event.preventDefault()
    })
})

/* ---------------- WINDOW ---------------- */

function createWindow() {
    // Size the window to fit the current display's work area so it works on
    // small laptops (1366x768) up to large monitors without overflowing.
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
    const initialWidth = Math.min(1400, Math.max(900, Math.floor(sw * 0.9)))
    const initialHeight = Math.min(900, Math.max(600, Math.floor(sh * 0.9)))

    mainWindow = new BrowserWindow({
        width: initialWidth,
        height: initialHeight,
        minWidth: 820,
        minHeight: 560,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        resizable: true,
        maximizable: true,
        fullscreenable: true,
        icon: getIconPath(),

        webPreferences: {
            preload: path.join(__dirname, 'index.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    })

    Menu.setApplicationMenu(null)

    if (isDev && VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(
            path.join(__dirname, '../dist/index.html')
        )
    }

    const showMainWindow = () => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        mainWindow.show()
        mainWindow.focus()
        // Guarantee the window actually paints (see nudgeRepaint).
        nudgeRepaint(mainWindow)
    }

    mainWindow.once('ready-to-show', showMainWindow)

    // Fallback: if `ready-to-show` is delayed (e.g. slow dev-server first
    // paint), show the window anyway so it never stays stuck hidden.
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
            showMainWindow()
        }
    }, 3000)

    if (isDev) {
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            if (mainWindow) {
                mainWindow.webContents.toggleDevTools()
            }
        })
        globalShortcut.register('F12', () => {
            if (mainWindow) {
                mainWindow.webContents.toggleDevTools()
            }
        })
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (parseDeepLink(url)) {
            forwardDeepLink(url)
            return { action: 'deny' }
        }

        // Keep internal routes inside the app (e.g. popups)
        if (isTrustedRendererUrl(url)) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    width: 340, // Adjusted width
                    height: 48, // Initial height for the pill
                    frame: false,
                    autoHideMenuBar: true,
                    alwaysOnTop: true,
                    backgroundColor: '#00000000',
                    transparent: true, // Added transparency
                    hasShadow: false, // Added no shadow
                    resizable: false, // Set to non-resizable initially
                    webPreferences: {
                        preload: path.join(__dirname, 'index.mjs'),
                        contextIsolation: true,
                        nodeIntegration: false,
                        sandbox: true,
                    }
                }
            }
        }

        // Open truly external URLs in the default browser
        try {
            void shell.openExternal(validateExternalUrl(url))
        } catch {
            console.warn('[Security] Blocked an invalid external window request')
        }
        return { action: 'deny' }
    })

    mainWindow.on('close', e => {
        if (!quitting) {
            e.preventDefault()
            // Properly hide the window instead of closing it
            if (mainWindow) {
                mainWindow.hide()
                // On Windows, also blur to ensure it releases focus
                if (process.platform === 'win32') {
                    mainWindow.blur()
                }
            }
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

/* ---------------- FOCUS PILL WINDOW (macOS-friendly overlay) ---------------- */

// Load the renderer with the given query string in both dev and production.
function loadRenderer(win: BrowserWindow, query: Record<string, string> = {}) {
    if (isDev && VITE_DEV_SERVER_URL) {
        const url = new URL(VITE_DEV_SERVER_URL)
        for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
        win.loadURL(url.toString())
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'), { query })
    }
}

// The focus pill lives in its OWN window so it can travel across Spaces (and,
// on macOS, float over other apps' fullscreen Spaces via type:'panel') WITHOUT
// turning the whole app window into a roaming panel.
function createPillWindow() {
    if (pillWindow && !pillWindow.isDestroyed()) return pillWindow

    const display = screen.getDisplayMatching(mainWindow?.getBounds() ?? screen.getPrimaryDisplay().bounds)
    const area = display.workArea

    pillWindow = new BrowserWindow({
        width: 340,
        height: 80,
        x: area.x + 40,
        y: area.y + 40,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        resizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        // macOS: a native NSPanel is the only window kind allowed to float over
        // another app's fullscreen Space — this is what lets the pill follow the
        // user with Ctrl+arrow and onto fullscreen apps.
        ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
        webPreferences: {
            preload: path.join(__dirname, 'index.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    })

    loadRenderer(pillWindow, { pill: '1' })

    pillWindow.setAlwaysOnTop(true, 'screen-saver')
    if (process.platform === 'darwin') {
        pillWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    }

    // Reveal the pill AND hand off from the main window in one place, so the main
    // window is never hidden before the pill is actually on screen. On Windows a
    // transparent/frameless window's 'ready-to-show' can be unreliable, so a
    // timeout fallback force-shows the pill — otherwise the main window hides,
    // the pill never appears, and the app looks like it shut down.
    let handedOff = false
    const revealPill = () => {
        if (handedOff || !pillWindow || pillWindow.isDestroyed()) return
        handedOff = true
        pillWindow.showInactive()
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
    }
    pillWindow.once('ready-to-show', revealPill)
    setTimeout(revealPill, 1500)
    pillWindow.on('closed', () => { pillWindow = null })

    return pillWindow
}

function enterPill() {
    // createPillWindow reveals the pill and hides the main window together once
    // the pill is on screen (see revealPill), so we never end up with no visible
    // window if the pill is slow to paint.
    createPillWindow()
}

// Windows: a transparent + frameless window that was hidden can repaint as
// fully invisible/ghosted until the compositor is nudged. Toggle always-on-top
// and force a 1px bounds change to guarantee a real repaint. Shared by both the
// initial show and the pill-exit restore.
function nudgeRepaint(win: BrowserWindow) {
    if (process.platform !== 'win32' || win.isDestroyed()) return
    win.setAlwaysOnTop(true)
    win.setAlwaysOnTop(false)
    const bounds = win.getBounds()
    win.setBounds({ ...bounds, width: bounds.width + 1 })
    win.setBounds(bounds)
}

function exitPill() {
    if (pillWindow && !pillWindow.isDestroyed()) pillWindow.close()
    pillWindow = null
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
        // Guarantee the restored window actually paints — without this, coming
        // back from Super Focus can leave a ghosted/blank frame on Windows.
        nudgeRepaint(mainWindow)
        // The main window was dormant while the pill ran the session; pull the
        // latest persisted focus/settings state so it reflects what happened.
        mainWindow.webContents.send('app:rehydrate')
    }
}

/* ---------------- WINDOW RESTORATION ---------------- */

function restoreWindow() {
    if (!mainWindow) {
        createWindow()
        return
    }

    // Ensure window is not minimized
    if (mainWindow.isMinimized()) {
        mainWindow.restore()
    }

    // Show the window
    mainWindow.show()

    // Focus the window
    mainWindow.focus()

    // Force window to foreground (Windows-specific technique)
    mainWindow.setAlwaysOnTop(true)
    mainWindow.setAlwaysOnTop(false)

    // Additional Windows-specific fix for ghost windows
    if (process.platform === 'win32') {
        // Force a repaint
        const bounds = mainWindow.getBounds()
        mainWindow.setBounds({ ...bounds, width: bounds.width + 1 })
        mainWindow.setBounds(bounds)
    }
}

/* ---------------- TRAY ---------------- */

function createTray() {
    try {
        const iconPath = getIconPath()

        let icon = nativeImage.createEmpty()

        try {
            icon = nativeImage
                .createFromPath(iconPath)
                .resize({ width: 16, height: 16 })
        } catch {
            // Ignore if icon fails to load
        }

        tray = new Tray(icon)

        tray.setContextMenu(
            Menu.buildFromTemplate([
                {
                    label: 'Show App',
                    click: () => {
                        restoreWindow()
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    click: () => {
                        quitting = true
                        app.quit()
                    }
                }
            ])
        )

        tray.setToolTip('Quoril')
    } catch (e) {
        console.error('[Tray] Failed:', e)
    }
}

/* ---------------- IPC ---------------- */

function setupIPC() {

    /* Window */

    ipcMain.handle('window:minimize', () =>
        mainWindow?.minimize()
    )

    ipcMain.handle('window:maximize', () => {
        if (!mainWindow) return
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            // Transparent/frameless windows on Windows don't always honour
            // maximize() cleanly — explicitly size to the current display's
            // work area so the app fills the screen edge-to-edge.
        const display = screen.getDisplayMatching(mainWindow.getBounds())
            const { x, y, width, height } = display.workArea
            mainWindow.setBounds({ x, y, width, height })
        }
    })

    ipcMain.handle('window:isMaximized', () => {
        if (!mainWindow) return false
        if (mainWindow.isMaximized()) return true
const display = screen.getDisplayMatching(mainWindow.getBounds())
        const b = mainWindow.getBounds()
        const w = display.workArea
        return b.x === w.x && b.y === w.y && b.width === w.width && b.height === w.height
    })

    ipcMain.handle('window:close', () =>
        mainWindow?.close()
    )

    ipcMain.handle('window:closeDevTools', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
        win?.webContents.closeDevTools()
    })

    // Act on the window that sent the request (the pill window when called from
    // the pill) so the pill — not the main window — becomes the floating overlay.
    ipcMain.handle('window:setAlwaysOnTop', (event, flag: boolean) => {
        assertBoolean(flag, 'always-on-top flag')
        const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
        win?.setAlwaysOnTop(flag, 'screen-saver')
    })

    ipcMain.handle('window:setResizable', (event, flag: boolean) => {
        assertBoolean(flag, 'resizable flag')
        const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
        win?.setResizable(flag)
    })

    /* Focus pill window lifecycle */

    ipcMain.handle('pill:enter', () => enterPill())
    ipcMain.handle('pill:exit', () => exitPill())

    ipcMain.on('resize-window', (event, payload) => {
        const { width, height, x, y } = validateWindowBounds(payload)
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
            // Capture the display the window is currently on BEFORE unmaximizing,
            // so the compact focus widget stays on the same monitor (multi-monitor fix).
            const display = screen.getDisplayMatching(win.getBounds())

            win.setResizable(true)
            win.unmaximize()
            win.setFullScreen(false)
            win.setKiosk(false)
            win.setMinimumSize(0, 0)

            if (typeof x === 'number' && typeof y === 'number') {
                // x/y arrive as offsets from the screen's top-left (e.g. 20,20).
                // Anchor them to the CURRENT display's work area instead of the
                // global origin (which is always the primary monitor), so the
                // window doesn't jump to screen 1 when resized on screen 2.
                const area = display.workArea
                win.setBounds({
                    width,
                    height,
                    x: area.x + x,
                    y: area.y + y,
                })
            } else {
                win.setSize(width, height)
            }

            win.setResizable(false)
        }
    })

    ipcMain.on('restore-window', () => {
        if (!mainWindow) return
        mainWindow.setResizable(true)
        mainWindow.setMinimumSize(820, 560)

        const display = screen.getDisplayMatching(mainWindow.getBounds())
        const { width: sw, height: sh } = display.workAreaSize
        const w = Math.min(1400, Math.max(900, Math.floor(sw * 0.9)))
        const h = Math.min(900, Math.max(600, Math.floor(sh * 0.9)))

        // Center within the CURRENT display, not the primary one. mainWindow.center()
        // always centers on the primary monitor, which yanks the window back to
        // screen 1 when restoring from focus mode on a secondary monitor.
        const area = display.workArea
        const x = Math.round(area.x + (area.width - w) / 2)
        const y = Math.round(area.y + (area.height - h) / 2)
        mainWindow.setBounds({ x, y, width: w, height: h })
    })

    /* App Info */

    ipcMain.handle('app:getVersion', () => app.getVersion())
    ipcMain.handle('app:getPlatform', () => process.platform)

    /* Notifications */

    ipcMain.handle('notification:show', (_, payload: unknown) => {
        const { title, body } = validateNotification(payload)
        if (Notification.isSupported()) {
            new Notification({ title, body }).show()
        }
    })

    // Capture the sender's own window for the alpha feedback widget. Returns a
    // PNG data URL, or null if the window is gone. Runs in main because the
    // renderer can't screenshot the native window contents itself.
    ipcMain.handle('feedback:capture', async (event) => {
        try {
            const win = BrowserWindow.fromWebContents(event.sender)
            if (!win || win.isDestroyed()) return null
            const image = await win.webContents.capturePage()
            return image.isEmpty() ? null : image.toDataURL()
        } catch (err) {
            console.error('[feedback:capture] failed', err)
            return null
        }
    })

    /* Simple Key-Value Store (persisted to JSON file) */

    const storePath = path.join(app.getPath('userData'), 'quoril-store.json')

    function readStore(): Record<string, any> {
        try {
            if (fs.existsSync(storePath)) {
                return JSON.parse(fs.readFileSync(storePath, 'utf-8'))
            }
        } catch {
            // Corrupt or unreadable store data should not block app startup.
        }
        return {}
    }

    function writeStore(data: Record<string, any>) {
        try {
            fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
        } catch (e) {
            console.error('[Store] Write failed:', e)
        }
    }

    ipcMain.handle('store:get', (_, key: string) => {
        validateStoreKey(key)
        const data = readStore()
        return data[key] ?? null
    })

    ipcMain.handle('store:set', (_, key: string, value: any) => {
        validateStoreKey(key)
        const data = readStore()
        data[key] = value
        writeStore(data)
        return true
    })

    /* Tasks */

    ipcMain.handle('db:getTasks', (_, uid, listId) =>
        dbOps.getTasks(validateId(uid, 'user id'), assertOptionalString(listId, 'list id') ?? undefined)
    )

    ipcMain.handle('db:saveTask', (_, task) =>
        safe(() => dbOps.saveTask(validateTaskRow(task)))
    )

    ipcMain.handle('db:startTask', (_, id) =>
        safe(() => dbOps.startTask(validateId(id, 'task id')))
    )

    ipcMain.handle('db:pauseTask', (_, id) =>
        safe(() => dbOps.pauseTask(validateId(id, 'task id')))
    )

    ipcMain.handle('db:deleteTask', (_, id) =>
        safe(() => dbOps.deleteTask(validateId(id, 'task id')))
    )

    ipcMain.handle('db:hardDeleteTask', (_, id) =>
        safe(() => dbOps.hardDeleteTask(validateId(id, 'task id')))
    )

    /* Lists */

    ipcMain.handle('db:getLists', (_, uid, archived) =>
        dbOps.getLists(validateId(uid, 'user id'), archived === undefined ? false : assertBoolean(archived, 'archived flag'))
    )

    ipcMain.handle('db:saveList', (_, list) =>
        safe(() => dbOps.saveList(validateListRow(list)))
    )

    ipcMain.handle('db:deleteList', (_, id) =>
        safe(() => dbOps.deleteList(validateId(id, 'list id')))
    )

    ipcMain.handle('db:hardDeleteList', (_, id) =>
        safe(() => dbOps.hardDeleteList(validateId(id, 'list id')))
    )

    ipcMain.handle('db:restoreList', (_, id) =>
        safe(() => dbOps.restoreList(validateId(id, 'list id')))
    )

    ipcMain.handle('db:archiveList', (_, id) =>
        safe(() => dbOps.archiveList(validateId(id, 'list id')))
    )

    /* Workspaces */

    ipcMain.handle('db:getWorkspaces', (_, uid) =>
        safe(() => dbOps.getWorkspaces(validateId(uid, 'user id')))
    )

    ipcMain.handle('db:saveWorkspace', (_, ws) =>
        safe(() => dbOps.saveWorkspace(validateWorkspaceRow(ws)))
    )

    ipcMain.handle('db:deleteWorkspace', (_, id) =>
        safe(() => dbOps.deleteWorkspace(validateId(id, 'workspace id')))
    )

    ipcMain.handle('db:moveListToWorkspace', (_, listId, workspaceId) =>
        safe(() => dbOps.moveListToWorkspace(validateId(listId, 'list id'), validateNullableId(workspaceId, 'workspace id')))
    )

    /* Subtasks */

    ipcMain.handle('db:getSubtasks', (_, taskId) =>
        dbOps.getSubtasks(validateId(taskId, 'task id'))
    )

    ipcMain.handle('db:saveSubtask', (_, sub) =>
        safe(() => dbOps.saveSubtask(validateSubtaskRow(sub)))
    )

    /* Focus */

    ipcMain.handle('db:getSessions', (_, uid) =>
        dbOps.getSessions(validateId(uid, 'user id'))
    )

    ipcMain.handle('db:getAppUsage', (_, start, end) =>
        dbOps.getAppUsage(assertString(start, 'start date'), assertString(end, 'end date'))
    )

    ipcMain.handle('db:getDailyActivity', (_, start, end) =>
        dbOps.getDailyActivity(assertString(start, 'start date'), assertString(end, 'end date'))
    )

    ipcMain.handle('db:getAppUsageByTask', (_, taskId) =>
        dbOps.getAppUsageByTask(validateId(taskId, 'task id'))
    )

    ipcMain.handle('db:getDailyAppUsage', (_, date) =>
        dbOps.getDailyAppUsage(assertString(date, 'date'))
    )

    ipcMain.handle('db:getDailyDomainUsage', (_, date) =>
        dbOps.getDailyDomainUsage(assertString(date, 'date'))
    )

    ipcMain.handle('db:saveSession', (_, s) =>
        safe(() => dbOps.saveSession(validateFocusSessionRow(s)))
    )

    /* Sync */

    ipcMain.handle('db:getPending', (_, table, limit?: number) => {
        return dbOps.getPending(validateSyncTable(table), validateSyncLimit(limit))
    })

    ipcMain.handle('db:countPending', (_, table) => {
        return dbOps.countPending(validateSyncTable(table))
    })

    ipcMain.handle('db:markSynced', (_, table, id) => {
        return safe(() => dbOps.markSynced(validateSyncTable(table), validateId(id, 'row id')))
    })

    ipcMain.handle('db:upsertFromCloud', (_, table, rows) => {
        return safe(() => dbOps.upsertFromCloud(validateSyncTable(table), validateCloudRows(rows)))
    })

    /* Named update handlers (db:exec removed — no raw SQL from renderer) */

    ipcMain.handle('db:updateTask', (_, id, updates) =>
        safe(() => dbOps.updateTask(validateId(id, 'task id'), validateTaskUpdate(updates)))
    )

    ipcMain.handle('db:updateTaskSortOrder', (_, id, sortOrder) =>
        safe(() => dbOps.updateTaskSortOrder(validateId(id, 'task id'), assertNonNegativeInteger(sortOrder, 'sort order')))
    )

    ipcMain.handle('db:softDeleteTasksByListId', (_, listId) =>
        safe(() => dbOps.softDeleteTasksByListId(validateId(listId, 'list id')))
    )

    ipcMain.handle('db:resetAllTaskTimes', (_, userId) =>
        safe(() => dbOps.resetAllTaskTimes(validateId(userId, 'user id')))
    )

    ipcMain.handle('db:updateList', (_, id, updates) =>
        safe(() => dbOps.updateList(validateId(id, 'list id'), validateListUpdate(updates)))
    )

    ipcMain.handle('db:updateSubtask', (_, id, updates) =>
        safe(() => dbOps.updateSubtask(validateId(id, 'subtask id'), validateSubtaskUpdate(updates)))
    )

    ipcMain.handle('db:softDeleteSubtask', (_, id) =>
        safe(() => dbOps.softDeleteSubtask(validateId(id, 'subtask id')))
    )

    ipcMain.handle('db:updateFocusSession', (_, id, updates) =>
        safe(() => dbOps.updateFocusSession(validateId(id, 'focus session id'), validateFocusSessionUpdate(updates)))
    )

    ipcMain.handle('db:softDeleteAllSessions', (_, userId) =>
        safe(() => dbOps.softDeleteAllSessions(validateId(userId, 'user id')))
    )

    ipcMain.handle('db:taskExists', (_, taskId) =>
        safe(() => dbOps.taskExists(validateId(taskId, 'task id')))
    )

    ipcMain.handle('db:getLocallyDeletedIds', (_, table) =>
        safe(() => dbOps.getLocallyDeletedIds(validateLocallyDeletedTable(table)))
    )

    ipcMain.handle('db:requeueWorkspace', (_, workspaceId) =>
        safe(() => dbOps.requeueWorkspace(validateId(workspaceId, 'workspace id')))
    )

    ipcMain.handle('db:getWorkspaceForList', (_, workspaceId) =>
        safe(() => dbOps.getWorkspaceForList(validateId(workspaceId, 'workspace id')))
    )

    /* Tracker */

    ipcMain.handle('tracker:setContext', (_, taskId: string | null) => {
        trackingEngine.setTaskContext(validateNullableId(taskId, 'task id'))
    })

    ipcMain.handle('tracker:getLiveSession', () => {
        return trackingEngine.getLiveSession()
    })

    ipcMain.handle('auth:setUser', (_, userId: string | null, accessToken?: string | null) => {
        trackingEngine.setUserId(validateNullableId(userId, 'user id'), accessToken == null ? null : assertString(accessToken, 'access token'))
    })

    // Renderer drains any deep link that arrived before its listener was ready
    // (cold-start OAuth callback, or a send that raced page load).
    ipcMain.handle('auth:getPendingDeepLink', () => {
        const url = pendingDeepLink
        pendingDeepLink = null
        return url
    })

    /* App-tracking permissions. Baseline tracking (app names) needs no permission
       on any platform. The two *detail* capabilities are opt-in and each maps to a
       different macOS permission — see electron/main/core/trackingDetail.ts. */

    ipcMain.handle('permissions:getTrackingDetail', () => getTrackingDetail())

    ipcMain.handle(
        'permissions:setTrackingDetail',
        (_, capability: DetailCapability, enabled: boolean) => {
            if (capability !== 'titles' && capability !== 'urls') {
                throw new Error(`Unknown tracking capability: ${capability}`)
            }
            setFlag(capability, enabled)
            // Pick up the new capability set on the next pulse.
            trackingEngine.start()
            return getTrackingDetail()
        },
    )

    /* Surfaces the macOS Accessibility prompt. Only ever called from an explicit
       user action; every status read elsewhere is prompt-free. */
    ipcMain.handle('permissions:requestAccessibility', () => {
        const granted = requestAccessibility()
        return { granted, detail: getTrackingDetail() }
    })

    /* Screen Recording has no request API — the user grants it in System Settings.
       Deep-link straight to the right pane instead of making them hunt for it. */
    ipcMain.handle('permissions:openPrivacySettings', (_, capability: DetailCapability) => {
        if (process.platform !== 'darwin') return false
        const pane =
            capability === 'titles' ? 'Privacy_ScreenCapture' : 'Privacy_Accessibility'
        shell.openExternal(
            `x-apple.systempreferences:com.apple.preference.security?${pane}`,
        )
        return true
    })

    /* Screen Recording only takes effect after a restart. */
    ipcMain.handle('permissions:relaunch', () => {
        app.relaunch()
        app.exit(0)
    })

    ipcMain.handle('permissions:startTracking', () => {
        // Tracking runs without any permission; just (re)start the engine.
        trackingEngine.start()
        return true
    })

    /* External URLs (Google OAuth, etc.) */

    ipcMain.handle('file:openExternal', (_, url: string) => {
        shell.openExternal(validateExternalUrl(url))
    })

    /* Reports — single aggregated call */

    ipcMain.handle('reports:getDashboardData', (_, args: unknown) => {
        const { userId, startDate, endDate } = validateReportsRange(args)
        if (!userId) return null
        return dbOps.getReportsDashboardData(userId, startDate, endDate)
    })

    /* Reports — live distraction for the current focus sitting */

    ipcMain.handle('reports:getSessionDistraction', (_, args: unknown) => {
        const { startISO, endISO } = validateSessionDistractionRange(args)
        if (!startISO || !endISO) return { distractionSeconds: 0, byCategory: [] }
        return dbOps.getSessionDistraction(startISO, endISO)
    })

    /* Screen Time — single aggregated call for a specific day */

    ipcMain.handle('screenTime:getData', (_, args: unknown) => {
        const { date } = validateScreenTimeArgs(args)
        return dbOps.getScreenTimeData(date)
    })

    /* AI Insights (Groq — key stays in main) */
    ipcMain.handle('insights:generate', (_, summary: unknown) => generateInsights(summary))

    /* Canvas */
    registerCanvasIpc()
}

/* ---------------- SAFE WRAPPER ---------------- */

function safe(fn: () => any) {
    try {
        return fn()
    } catch (e) {
        console.error('[IPC Error]', e)
        throw e
    }
}

/* ---------------- APP ---------------- */

app.whenReady().then(async () => {
    // Every feature reads through the local SQLite database, so continuing past a
    // failed init just turns one startup fault into a cascade of confusing
    // "Database not initialized" IPC errors in the renderer. Surface the real
    // cause and stop instead.
    try {
        await initDatabase()
    } catch (e) {
        const detail = e instanceof Error ? (e.stack || e.message) : String(e)
        console.error('Failed to initialize database:', detail)
        dialog.showErrorBox(
            'Quoril could not start',
            'The local database failed to initialize, so Quoril cannot run.\n\n' +
            `${detail}\n\n` +
            'If this mentions a Node.js/NODE_MODULE_VERSION mismatch, rebuild the ' +
            'native modules with:\n\n    npx electron-builder install-app-deps'
        )
        app.exit(1)
        return
    }

    // macOS: set the Dock icon explicitly (window `icon` option is ignored on macOS,
    // and in dev the Dock otherwise shows the default Electron icon).
    if (process.platform === 'darwin' && app.dock) {
        try {
            const dockIcon = nativeImage.createFromPath(getIconPath())
            if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon)
        } catch {
            // Ignore if icon fails to load
        }
    }

    createWindow()
    createTray()
    setupIPC()

    // Silent background auto-update (check → download → prompt to restart).
    initAutoUpdate()

    // Start app tracking engine. It runs without any OS permission — on macOS via
    // the permission-free lsappinfo source, on Windows/Linux via active-win.
    trackingEngine.start()

    // Auto-launch on startup (Safe production-grade implementation)
    if (!isDev) {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe')
        })
    }
})

app.on('activate', () => {
    restoreWindow()
})

app.on('window-all-closed', () => {
    // Keep app running in background (tray active)
})

app.on('before-quit', async () => {
    quitting = true

    try {
        await trackingEngine.stop()
        dbOps.pauseTask('__all__')
    } catch (e) {
        console.error('[Cleanup] Failed', e)
    }
})

const logCrash = (type: string, error: any) => {
    try {
        const desktopPath = path.join(app.getPath('desktop'), 'quoril-crash.log')
        const errorMessage = `\n\n[${new Date().toISOString()}] ${type}\n${error?.stack || error}`
        fs.appendFileSync(desktopPath, errorMessage)
    } catch {
        // Best effort only; crash handling must never throw recursively.
    }
}

process.on('uncaughtException', e => {
    console.error('[Crash]', e)
    logCrash('uncaughtException', e)
})

process.on('unhandledRejection', e => {
    console.error('[Promise]', e)
    logCrash('unhandledRejection', e)
})

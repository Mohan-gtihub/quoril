import {
    app,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu,
    nativeImage,
    shell,
    globalShortcut,
    systemPreferences,
    Notification
} from 'electron'

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import { initDatabase, dbOps } from './db'
import { trackingEngine } from './core/core'

/* ---------------- PATH ---------------- */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- FLAGS ---------------- */

const isDev = !app.isPackaged
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

if (isDev) process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

/* ---------------- ICON PATH (works in dev + production) ---------------- */
function getIconPath() {
    if (app.isPackaged) {
        // In production: resources/app/public/icon.png or resources/icon.png
        return path.join(process.resourcesPath, 'app', 'public', 'icon.png')
    }
    // In dev: project root / public / icon.png
    return path.join(__dirname, '../../public/icon.png')
}

/* Set App User Model ID so Windows Search can find the app */
if (process.platform === 'win32') {
    app.setAppUserModelId('com.quoril.app')
}

/* ---------------- STATE ---------------- */

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false

/* ---------------- SINGLE INSTANCE ---------------- */

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (_event, argv) => {
        // On Windows, deep link URLs arrive as a command-line argument in the second instance.
        // We must forward it to the renderer BEFORE restoring the window.
        const deepLinkUrl = argv.find(arg => arg.startsWith('quoril://'))
        if (deepLinkUrl && mainWindow) {
            mainWindow.webContents.send('deep-link', deepLinkUrl)
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
    // Send URL to renderer to handle auth callback
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        mainWindow.webContents.send('deep-link', url)
    }
})

/* ---------------- WINDOW ---------------- */

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        frame: false,
        // FIX: Re-enable transparency so the SuperFocus widget can be frameless and rounded.
        // The ghost window rendering bug on Windows is mitigated by the activate/show repaint sequence below.
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false, // Turn off OS shadows to prevent native Windows 11 bounding box drawing around the transparent window
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
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(
            path.join(__dirname, '../dist/index.html')
        )
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show()
    })

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
        // Keep internal routes inside the app (e.g. popups)
        if ((VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL)) || url.startsWith('file://')) {
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
                    }
                }
            }
        }

        // Open truly external URLs in the default browser
        shell.openExternal(url)
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

    ipcMain.handle('window:maximize', () =>
        mainWindow?.isMaximized()
            ? mainWindow.unmaximize()
            : mainWindow?.maximize()
    )

    ipcMain.handle('window:close', () =>
        mainWindow?.close()
    )

    ipcMain.handle('window:closeDevTools', () => {
        mainWindow?.webContents.closeDevTools()
    })

    ipcMain.handle('window:setAlwaysOnTop', (_, flag: boolean) => {
        mainWindow?.setAlwaysOnTop(flag, 'screen-saver')
    })

    ipcMain.handle('window:setResizable', (_, flag: boolean) => {
        mainWindow?.setResizable(flag)
    })

    ipcMain.on('resize-window', (event, { width, height, x, y }) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win) {
            win.setResizable(true)
            win.unmaximize()
            win.setFullScreen(false)
            win.setKiosk(false)
            win.setMinimumSize(0, 0)

            if (typeof x === 'number' && typeof y === 'number') {
                win.setBounds({ width, height, x, y })
            } else {
                win.setSize(width, height)
            }

            win.setResizable(false)
        }
    })

    ipcMain.on('restore-window', () => {
        if (mainWindow) {
            mainWindow.setMinimumSize(1000, 600)
            mainWindow.setSize(1400, 900)
            mainWindow.center()
        }
    })

    /* App Info */

    ipcMain.handle('app:getVersion', () => app.getVersion())
    ipcMain.handle('app:getPlatform', () => process.platform)

    /* Notifications */

    ipcMain.handle('notification:show', (_, { title, body }: { title: string; body: string }) => {
        if (Notification.isSupported()) {
            new Notification({ title, body }).show()
        }
    })

    /* Simple Key-Value Store (persisted to JSON file) */

    const storePath = path.join(app.getPath('userData'), 'quoril-store.json')

    function readStore(): Record<string, any> {
        try {
            if (fs.existsSync(storePath)) {
                return JSON.parse(fs.readFileSync(storePath, 'utf-8'))
            }
        } catch (_) {}
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
        const data = readStore()
        return data[key] ?? null
    })

    ipcMain.handle('store:set', (_, key: string, value: any) => {
        const data = readStore()
        data[key] = value
        writeStore(data)
        return true
    })

    /* Tasks */

    ipcMain.handle('db:getTasks', (_, uid, listId) =>
        dbOps.getTasks(uid, listId)
    )

    ipcMain.handle('db:saveTask', (_, task) =>
        safe(() => dbOps.saveTask(task))
    )

    ipcMain.handle('db:startTask', (_, id) =>
        safe(() => dbOps.startTask(id))
    )

    ipcMain.handle('db:pauseTask', (_, id) =>
        safe(() => dbOps.pauseTask(id))
    )

    ipcMain.handle('db:deleteTask', (_, id) =>
        safe(() => dbOps.deleteTask(id))
    )

    ipcMain.handle('db:hardDeleteTask', (_, id) =>
        safe(() => dbOps.hardDeleteTask(id))
    )

    /* Lists */

    ipcMain.handle('db:getLists', (_, uid, archived) =>
        dbOps.getLists(uid, archived)
    )

    ipcMain.handle('db:saveList', (_, list) =>
        safe(() => dbOps.saveList(list))
    )

    ipcMain.handle('db:deleteList', (_, id) =>
        safe(() => dbOps.deleteList(id))
    )

    ipcMain.handle('db:hardDeleteList', (_, id) =>
        safe(() => dbOps.hardDeleteList(id))
    )

    ipcMain.handle('db:restoreList', (_, id) =>
        safe(() => dbOps.restoreList(id))
    )

    ipcMain.handle('db:archiveList', (_, id) =>
        safe(() => dbOps.archiveList(id))
    )

    /* Workspaces */

    ipcMain.handle('db:getWorkspaces', (_, uid) =>
        safe(() => dbOps.getWorkspaces(uid))
    )

    ipcMain.handle('db:saveWorkspace', (_, ws) =>
        safe(() => dbOps.saveWorkspace(ws))
    )

    ipcMain.handle('db:deleteWorkspace', (_, id) =>
        safe(() => dbOps.deleteWorkspace(id))
    )

    ipcMain.handle('db:moveListToWorkspace', (_, listId, workspaceId) =>
        safe(() => dbOps.moveListToWorkspace(listId, workspaceId))
    )

    /* Subtasks */

    ipcMain.handle('db:getSubtasks', (_, taskId) =>
        dbOps.getSubtasks(taskId)
    )

    ipcMain.handle('db:saveSubtask', (_, sub) =>
        safe(() => dbOps.saveSubtask(sub))
    )

    /* Focus */

    ipcMain.handle('db:getSessions', (_, uid) =>
        dbOps.getSessions(uid)
    )

    ipcMain.handle('db:getAppUsage', (_, start, end) =>
        dbOps.getAppUsage(start, end)
    )

    ipcMain.handle('db:getDailyActivity', (_, start, end) =>
        dbOps.getDailyActivity(start, end)
    )

    ipcMain.handle('db:getAppUsageByTask', (_, taskId) =>
        dbOps.getAppUsageByTask(taskId)
    )

    ipcMain.handle('db:getDailyAppUsage', (_, date) =>
        dbOps.getDailyAppUsage(date)
    )

    ipcMain.handle('db:getDailyDomainUsage', (_, date) =>
        dbOps.getDailyDomainUsage(date)
    )

    ipcMain.handle('db:saveSession', (_, s) =>
        safe(() => dbOps.saveSession(s))
    )

    /* Sync */

    const SYNC_TABLES = new Set(['workspaces', 'lists', 'tasks', 'subtasks', 'focus_sessions'])

    ipcMain.handle('db:getPending', (_, table, limit?: number) => {
        if (!SYNC_TABLES.has(table)) throw new Error(`Invalid sync table: ${table}`)
        return dbOps.getPending(table, limit)
    })

    ipcMain.handle('db:markSynced', (_, table, id) => {
        if (!SYNC_TABLES.has(table)) throw new Error(`Invalid sync table: ${table}`)
        return safe(() => dbOps.markSynced(table, id))
    })

    /* Named update handlers (db:exec removed — no raw SQL from renderer) */

    ipcMain.handle('db:updateTask', (_, id, updates) =>
        safe(() => dbOps.updateTask(id, updates))
    )

    ipcMain.handle('db:updateTaskSortOrder', (_, id, sortOrder) =>
        safe(() => dbOps.updateTaskSortOrder(id, sortOrder))
    )

    ipcMain.handle('db:softDeleteTasksByListId', (_, listId) =>
        safe(() => dbOps.softDeleteTasksByListId(listId))
    )

    ipcMain.handle('db:resetAllTaskTimes', (_, userId) =>
        safe(() => dbOps.resetAllTaskTimes(userId))
    )

    ipcMain.handle('db:updateList', (_, id, updates) =>
        safe(() => dbOps.updateList(id, updates))
    )

    ipcMain.handle('db:updateSubtask', (_, id, updates) =>
        safe(() => dbOps.updateSubtask(id, updates))
    )

    ipcMain.handle('db:softDeleteSubtask', (_, id) =>
        safe(() => dbOps.softDeleteSubtask(id))
    )

    ipcMain.handle('db:updateFocusSession', (_, id, updates) =>
        safe(() => dbOps.updateFocusSession(id, updates))
    )

    ipcMain.handle('db:softDeleteAllSessions', (_, userId) =>
        safe(() => dbOps.softDeleteAllSessions(userId))
    )

    ipcMain.handle('db:taskExists', (_, taskId) =>
        safe(() => dbOps.taskExists(taskId))
    )

    ipcMain.handle('db:requeueWorkspace', (_, workspaceId) =>
        safe(() => dbOps.requeueWorkspace(workspaceId))
    )

    ipcMain.handle('db:getWorkspaceForList', (_, workspaceId) =>
        safe(() => dbOps.getWorkspaceForList(workspaceId))
    )

    /* Tracker */

    ipcMain.handle('tracker:setContext', (_, taskId: string | null) => {
        trackingEngine.setTaskContext(taskId)
    })

    ipcMain.handle('tracker:getLiveSession', () => {
        return trackingEngine.getLiveSession()
    })

    ipcMain.handle('auth:setUser', (_, userId: string | null, accessToken?: string | null) => {
        trackingEngine.setUserId(userId, accessToken)
    })

    /* macOS Accessibility Permission (needed for active-win app tracking) */

    ipcMain.handle('permissions:checkAccessibility', () => {
        if (process.platform !== 'darwin') return true
        return systemPreferences.isTrustedAccessibilityClient(false)
    })

    ipcMain.handle('permissions:requestAccessibility', () => {
        if (process.platform !== 'darwin') return true
        // Passing true triggers the macOS system prompt
        return systemPreferences.isTrustedAccessibilityClient(true)
    })

    ipcMain.handle('permissions:startTracking', () => {
        // Called after user grants accessibility permission from the in-app prompt
        if (process.platform === 'darwin') {
            const hasAccess = systemPreferences.isTrustedAccessibilityClient(false)
            if (hasAccess) {
                trackingEngine.start()
                return true
            }
            return false
        }
        return true
    })

    /* External URLs (Google OAuth, etc.) */

    ipcMain.handle('file:openExternal', (_, url: string) => {
        if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
            shell.openExternal(url)
        }
    })

    /* Reports — single aggregated call */

    ipcMain.handle('reports:getDashboardData', (_, { userId, startDate, endDate }: { userId: string, startDate: string, endDate: string }) => {
        if (!userId) return null
        return dbOps.getReportsDashboardData(userId, startDate, endDate)
    })

    /* Screen Time — single aggregated call for a specific day */

    ipcMain.handle('screenTime:getData', (_, { date }: { date: string }) => {
        return dbOps.getScreenTimeData(date)
    })
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
    try {
        await initDatabase()
    } catch (e) {
        console.error('Failed to initialize database:', e)
    }

    createWindow()
    createTray()
    setupIPC()

    // Start app tracking engine.
    // On macOS, the engine handles passive permission checks via systemPreferences.
    // This allows the app to start quietly even without permissions, and pick up 
    // permissions automatically if the user grants them in System Settings later.
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
    } catch (_) { }
}

process.on('uncaughtException', e => {
    console.error('[Crash]', e)
    logCrash('uncaughtException', e)
})

process.on('unhandledRejection', e => {
    console.error('[Promise]', e)
    logCrash('unhandledRejection', e)
})



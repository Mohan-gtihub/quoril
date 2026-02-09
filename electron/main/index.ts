import {
    app,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu,
    nativeImage,
    shell
} from 'electron'

import path from 'path'
import { fileURLToPath } from 'url'

import { initDatabase, dbOps } from './db'
import { trackingEngine } from './core/core'

/* ---------------- PATH ---------------- */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- FLAGS ---------------- */

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

const isDev = !app.isPackaged
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

/* ---------------- STATE ---------------- */

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false

/* ---------------- WINDOW ---------------- */

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        frame: false,
        transparent: true,
        hasShadow: false,

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
            mainWindow?.hide()
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

/* ---------------- TRAY ---------------- */

function createTray() {
    try {
        const iconPath =
            path.join(__dirname, '../../public/icon.png')

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
                    click: () => mainWindow?.show()
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

    ipcMain.handle('db:restoreList', (_, id) =>
        safe(() => dbOps.restoreList(id))
    )

    ipcMain.handle('db:archiveList', (_, id) =>
        safe(() => dbOps.archiveList(id))
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

    ipcMain.handle('db:getAppUsageByTask', (_, taskId) =>
        dbOps.getAppUsageByTask(taskId)
    )

    ipcMain.handle('db:saveSession', (_, s) =>
        safe(() => dbOps.saveSession(s))
    )

    /* Sync */

    ipcMain.handle('db:getPending', (_, table) =>
        dbOps.getPending(table)
    )

    ipcMain.handle('db:markSynced', (_, table, id) =>
        safe(() => dbOps.markSynced(table, id))
    )

    ipcMain.handle('db:exec', (_, sql, params) =>
        safe(() => dbOps.exec(sql, params))
    )

    /* Tracker */

    ipcMain.handle('tracker:setContext', (_, taskId: string | null) => {
        trackingEngine.setTaskContext(taskId)
    })

    ipcMain.handle('auth:setUser', (_, userId: string) => {
        trackingEngine.setUserId(userId)
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
    trackingEngine.start()

    // Auto-launch on startup (Safe production-grade implementation)
    if (!isDev) {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe')
        })
    }
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

process.on('uncaughtException', e =>
    console.error('[Crash]', e)
)

process.on('unhandledRejection', e =>
    console.error('[Promise]', e)
)

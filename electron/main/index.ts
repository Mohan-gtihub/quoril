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

/* ---------------- PATH ---------------- */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* ---------------- FLAGS ---------------- */

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

const isDev = process.env.NODE_ENV === 'development'
const DEV_URL = 'http://localhost:5173'

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
        backgroundColor: '#1a1f2e',
        show: false,
        frame: false,

        webPreferences: {
            preload: path.join(__dirname, 'index.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    })

    Menu.setApplicationMenu(null)

    if (isDev) {
        mainWindow.loadURL(DEV_URL)
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(
            path.join(__dirname, '../../dist/index.html')
        )
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })

    mainWindow.on('close', e => {
        if (process.platform === 'darwin' && !quitting) {
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
        } catch { }

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

    ipcMain.on('resize-window', (_, { width, height, x, y }) => {
        if (mainWindow) {
            mainWindow.setSize(width, height)
            if (x !== undefined && y !== undefined) {
                mainWindow.setPosition(x, y)
            }
        }
    })

    ipcMain.on('restore-window', () => {
        if (mainWindow) {
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

    ipcMain.handle('db:getLists', (_, uid) =>
        dbOps.getLists(uid)
    )

    ipcMain.handle('db:saveList', (_, list) =>
        safe(() => dbOps.saveList(list))
    )

    ipcMain.handle('db:deleteList', (_, id) =>
        safe(() => dbOps.deleteList(id))
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
    await initDatabase()

    createWindow()
    createTray()
    setupIPC()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    quitting = true

    try {
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

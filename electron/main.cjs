const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow = null
let isCompactMode = false

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        frame: true,
        resizable: true,
        backgroundColor: '#0d0d0d'
    })

    // Load the app
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`
    mainWindow.loadURL(startUrl)

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools()
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// Handle window resize requests from renderer
ipcMain.on('resize-window', (event, { width, height, x, y }) => {
    if (mainWindow) {
        mainWindow.setSize(width, height)
        if (x !== undefined && y !== undefined) {
            mainWindow.setPosition(x, y)
        }
        isCompactMode = width < 400
    }
})

// Handle window restore
ipcMain.on('restore-window', () => {
    if (mainWindow) {
        mainWindow.setSize(1400, 900)
        mainWindow.center()
        isCompactMode = false
    }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

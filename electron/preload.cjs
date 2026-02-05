const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    resizeWindow: (width, height, x, y) => {
        ipcRenderer.send('resize-window', { width, height, x, y })
    },
    restoreWindow: () => {
        ipcRenderer.send('restore-window')
    },
    setAlwaysOnTop: (flag) => {
        ipcRenderer.invoke('window:setAlwaysOnTop', flag)
    },
    setResizable: (flag) => {
        ipcRenderer.invoke('window:setResizable', flag)
    },
    closeDevTools: () => {
        ipcRenderer.invoke('window:closeDevTools')
    }
})

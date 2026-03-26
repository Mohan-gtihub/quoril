import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
    },

    // App info
    app: {
        getVersion: () => ipcRenderer.invoke('app:getVersion'),
        getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    },

    // Notifications
    notification: {
        show: (title: string, body: string) =>
            ipcRenderer.invoke('notification:show', { title, body }),
    },

    // Focus session
    focus: {
        started: (data: { duration: number; taskId: string }) =>
            ipcRenderer.send('focus:started', data),
        ended: () => ipcRenderer.send('focus:ended'),
        onStartRequest: (callback: () => void) => {
            ipcRenderer.on('start-focus-session', callback)
            return () => ipcRenderer.removeListener('start-focus-session', callback)
        },
    },

    // File operations
    file: {
        openExternal: (url: string) => ipcRenderer.invoke('file:openExternal', url),
    },

    // Store operations
    store: {
        get: (key: string) => ipcRenderer.invoke('store:get', key),
        set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    },

    // Database operations
    db: {
        getTasks: (userId: string, listId?: string) => ipcRenderer.invoke('db:getTasks', userId, listId),
        saveTask: (task: any) => ipcRenderer.invoke('db:saveTask', task),
        updateTask: (id: string, updates: any) => ipcRenderer.invoke('db:updateTask', id, updates),
        updateTaskSortOrder: (id: string, sortOrder: number) => ipcRenderer.invoke('db:updateTaskSortOrder', id, sortOrder),
        softDeleteTasksByListId: (listId: string) => ipcRenderer.invoke('db:softDeleteTasksByListId', listId),
        resetAllTaskTimes: (userId: string) => ipcRenderer.invoke('db:resetAllTaskTimes', userId),
        deleteTask: (id: string) => ipcRenderer.invoke('db:deleteTask', id),
        startTask: (id: string) => ipcRenderer.invoke('db:startTask', id),
        pauseTask: (id: string) => ipcRenderer.invoke('db:pauseTask', id),
        reorderTasks: (items: any) => ipcRenderer.invoke('db:reorderTasks', items),
        getLists: (userId: string, archived?: boolean) => ipcRenderer.invoke('db:getLists', userId, archived),
        saveList: (list: any) => ipcRenderer.invoke('db:saveList', list),
        updateList: (id: string, updates: any) => ipcRenderer.invoke('db:updateList', id, updates),
        archiveList: (id: string) => ipcRenderer.invoke('db:archiveList', id),
        restoreList: (id: string) => ipcRenderer.invoke('db:restoreList', id),
        deleteList: (id: string) => ipcRenderer.invoke('db:deleteList', id),
        getSubtasks: (taskId: string) => ipcRenderer.invoke('db:getSubtasks', taskId),
        saveSubtask: (subtask: any) => ipcRenderer.invoke('db:saveSubtask', subtask),
        updateSubtask: (id: string, updates: any) => ipcRenderer.invoke('db:updateSubtask', id, updates),
        softDeleteSubtask: (id: string) => ipcRenderer.invoke('db:softDeleteSubtask', id),
        deleteSubtask: (id: string) => ipcRenderer.invoke('db:deleteSubtask', id),
        getSessions: (userId: string) => ipcRenderer.invoke('db:getSessions', userId),
        saveSession: (session: any) => ipcRenderer.invoke('db:saveSession', session),
        updateFocusSession: (id: string, updates: any) => ipcRenderer.invoke('db:updateFocusSession', id, updates),
        softDeleteAllSessions: (userId: string) => ipcRenderer.invoke('db:softDeleteAllSessions', userId),
        getAppUsage: (start: string, end: string) => ipcRenderer.invoke('db:getAppUsage', start, end),
        getDailyActivity: (start: string, end: string) => ipcRenderer.invoke('db:getDailyActivity', start, end),
        getAppUsageByTask: (taskId: string) => ipcRenderer.invoke('db:getAppUsageByTask', taskId),
        getDailyAppUsage: (date: string) => ipcRenderer.invoke('db:getDailyAppUsage', date),
        getDailyDomainUsage: (date: string) => ipcRenderer.invoke('db:getDailyDomainUsage', date),
        genericUpdate: (table: string, id: string, updates: any) => ipcRenderer.invoke('db:genericUpdate', table, id, updates),
        taskExists: (taskId: string) => ipcRenderer.invoke('db:taskExists', taskId),
        getPending: (table: string, limit?: number) => ipcRenderer.invoke('db:getPending', table, limit),
        markSynced: (table: string, id: string) => ipcRenderer.invoke('db:markSynced', table, id),
        requeueWorkspace: (workspaceId: string) => ipcRenderer.invoke('db:requeueWorkspace', workspaceId),
        getWorkspaceForList: (workspaceId: string) => ipcRenderer.invoke('db:getWorkspaceForList', workspaceId),
        getWorkspaces: (userId: string) => ipcRenderer.invoke('db:getWorkspaces', userId),
        saveWorkspace: (ws: any) => ipcRenderer.invoke('db:saveWorkspace', ws),
        deleteWorkspace: (id: string) => ipcRenderer.invoke('db:deleteWorkspace', id),
        moveListToWorkspace: (listId: string, workspaceId: string | null) => ipcRenderer.invoke('db:moveListToWorkspace', listId, workspaceId),
    },

    // Tracker
    tracker: {
        setContext: (taskId: string | null) => ipcRenderer.invoke('tracker:setContext', taskId),
        getLiveSession: () => ipcRenderer.invoke('tracker:getLiveSession'),
    },

    // Auth
    auth: {
        setUser: (userId: string | null, accessToken?: string | null) => ipcRenderer.invoke('auth:setUser', userId, accessToken),
        onDeepLink: (callback: (url: string) => void) => {
            const subscription = (_: any, url: string) => callback(url)
            ipcRenderer.on('deep-link', subscription)
            return () => ipcRenderer.removeListener('deep-link', subscription)
        }
    },

    // Reports
    reports: {
        getDashboardData: (args: { userId: string; startDate: string; endDate: string }) =>
            ipcRenderer.invoke('reports:getDashboardData', args),
    },
})

// Window Management (Special case for legacy/custom calls)
contextBridge.exposeInMainWorld('electron', {
    resizeWindow: (width: number, height: number, x?: number, y?: number) => {
        ipcRenderer.send('resize-window', { width, height, x, y })
    },
    restoreWindow: () => {
        ipcRenderer.send('restore-window')
    },
    setAlwaysOnTop: (flag: boolean) => {
        ipcRenderer.invoke('window:setAlwaysOnTop', flag)
    },
    setResizable: (flag: boolean) => {
        ipcRenderer.invoke('window:setResizable', flag)
    },
    closeDevTools: () => {
        ipcRenderer.invoke('window:closeDevTools')
    }
})

// Type definitions for TypeScript
export interface ElectronAPI {
    window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
    }
    app: {
        getVersion: () => Promise<string>
        getPlatform: () => Promise<string>
    }
    notification: {
        show: (title: string, body: string) => Promise<void>
    }
    focus: {
        started: (data: { duration: number; taskId: string }) => void
        ended: () => void
        onStartRequest: (callback: () => void) => () => void
    }
    file: {
        openExternal: (url: string) => Promise<void>
    }
    store: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<boolean>
    }
    db: {
        getTasks: (userId: string, listId?: string) => Promise<any[]>
        saveTask: (task: any) => Promise<any>
        updateTask: (id: string, updates: any) => Promise<any>
        updateTaskSortOrder: (id: string, sortOrder: number) => Promise<void>
        softDeleteTasksByListId: (listId: string) => Promise<void>
        resetAllTaskTimes: (userId: string) => Promise<void>
        deleteTask: (id: string) => Promise<any>
        startTask: (id: string) => Promise<any>
        pauseTask: (id: string) => Promise<any>
        reorderTasks: (items: any) => Promise<any>
        getLists: (userId: string, archived?: boolean) => Promise<any[]>
        saveList: (list: any) => Promise<any>
        updateList: (id: string, updates: any) => Promise<void>
        archiveList: (id: string) => Promise<any>
        restoreList: (id: string) => Promise<any>
        deleteList: (id: string) => Promise<any>
        getSubtasks: (taskId: string) => Promise<any[]>
        saveSubtask: (subtask: any) => Promise<any>
        updateSubtask: (id: string, updates: any) => Promise<void>
        softDeleteSubtask: (id: string) => Promise<void>
        deleteSubtask: (id: string) => Promise<any>
        getSessions: (userId: string) => Promise<any[]>
        saveSession: (session: any) => Promise<any>
        updateFocusSession: (id: string, updates: any) => Promise<void>
        softDeleteAllSessions: (userId: string) => Promise<void>
        getAppUsage: (start: string, end: string) => Promise<any[]>
        getDailyActivity: (start: string, end: string) => Promise<any[]>
        getDailyAppUsage: (date: string) => Promise<any[]>
        getDailyDomainUsage: (date: string) => Promise<any[]>
        getAppUsageByTask: (taskId: string) => Promise<any[]>
        genericUpdate: (table: string, id: string, updates: any) => Promise<any>
        taskExists: (taskId: string) => Promise<boolean>
        getPending: (table: string) => Promise<any[]>
        markSynced: (table: string, id: string) => Promise<void>
        requeueWorkspace: (workspaceId: string) => Promise<void>
        getWorkspaceForList: (workspaceId: string) => Promise<any[]>
        getWorkspaces: (userId: string) => Promise<any[]>
        saveWorkspace: (ws: any) => Promise<any>
        deleteWorkspace: (id: string) => Promise<any>
        moveListToWorkspace: (listId: string, workspaceId: string | null) => Promise<any>
    }
    tracker: {
        setContext: (taskId: string | null) => Promise<void>
        getLiveSession: () => Promise<any>
    }
    auth: {
        setUser: (userId: string | null, accessToken?: string | null) => Promise<void>
        onDeepLink: (callback: (url: string) => void) => () => void
    }
    reports: {
        getDashboardData: (args: { userId: string; startDate: string; endDate: string }) => Promise<any>
    }
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}

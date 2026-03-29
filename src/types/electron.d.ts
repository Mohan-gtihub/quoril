export interface ElectronAPI {
    reports: any
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
    auth: {
        setUser: (userId: string | null, accessToken?: string | null) => Promise<void>
        onDeepLink: (callback: (url: string) => void) => () => void
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
        getAppUsageByTask: (taskId: string) => Promise<any[]>
        getDailyAppUsage: (date: string) => Promise<any[]>
        getDailyDomainUsage: (date: string) => Promise<any[]>
        genericUpdate: (table: string, id: string, updates: any) => Promise<any>
        taskExists: (taskId: string) => Promise<boolean>
        getPending: (table: string, limit?: number) => Promise<any[]>
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
    permissions: {
        checkAccessibility: () => Promise<boolean>
        requestAccessibility: () => Promise<boolean>
        startTracking: () => Promise<boolean>
    }
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
        electron: {
            resizeWindow: (width: number, height: number, x?: number, y?: number) => void
            restoreWindow: () => void
            setAlwaysOnTop: (flag: boolean) => void
            setResizable: (flag: boolean) => void
            closeDevTools: () => void
        }
    }
}

export { }

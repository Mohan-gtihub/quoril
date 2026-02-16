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
    auth: {
        setUser: (userId: string | null, accessToken?: string | null) => Promise<void>
    }
    store: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<boolean>
    }
    db: {
        getTasks: (userId: string, listId?: string) => Promise<any[]>
        saveTask: (task: any) => Promise<any>
        updateTask: (id: string, updates: any) => Promise<any>
        deleteTask: (id: string) => Promise<any>
        startTask: (id: string) => Promise<any>
        pauseTask: (id: string) => Promise<any>
        reorderTasks: (items: any) => Promise<any>
        getLists: (userId: string, archived?: boolean) => Promise<any[]>
        saveList: (list: any) => Promise<any>
        deleteList: (id: string) => Promise<any>
        restoreList: (id: string) => Promise<any>
        getSubtasks: (taskId: string) => Promise<any[]>
        saveSubtask: (subtask: any) => Promise<any>
        deleteSubtask: (id: string) => Promise<any>
        getSessions: (userId: string) => Promise<any[]>
        getAppUsage: (start: string, end: string) => Promise<any[]>
        getDailyActivity: (start: string, end: string) => Promise<any[]>
        getAppUsageByTask: (taskId: string) => Promise<any[]>
        saveFocusSession: (session: any) => Promise<any>
        updateFocusSession: (id: string, updates: any) => Promise<any>
        genericUpdate: (table: string, id: string, updates: any) => Promise<any>
        exec: (sql: string, params: any[]) => Promise<any>
        getPending: (table: string) => Promise<any[]>
        markSynced: (table: string, id: string) => Promise<void>
    }
    tracker: {
        setContext: (taskId: string | null) => Promise<void>
        getLiveSession: () => Promise<any>
    }
    auth: {
        setUser: (userId: string | null, accessToken?: string | null) => Promise<void>
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

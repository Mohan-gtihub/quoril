export interface Capabilities {
  appTracking: boolean
  nativeOverlay: boolean
  pictureInPicture: boolean
  localDb: boolean
}

export type Unavailable = { available: false }
export const UNAVAILABLE: Unavailable = { available: false }

export interface DataPort {
  listTasks(): Promise<any[]>
  saveTask(task: any): Promise<any>
  deleteTask(id: string): Promise<void>
  listLists(): Promise<any[]>
  listWorkspaces(): Promise<any[]>
  listCanvasDocs(): Promise<any[]>
  saveCanvasDoc(doc: any): Promise<any>
  saveSession(session: any): Promise<any>
  listSessions(range?: { from: string; to: string }): Promise<any[]>
}

export interface ScreenTimePort {
  getData(args: { date: string }): Promise<any | Unavailable>
  isTrackingAvailable(): boolean
}

export interface FocusWindowPort {
  setAlwaysOnTop(flag: boolean): void | Unavailable
  resize(w: number, h: number, x?: number, y?: number): void | Unavailable
  restore(): void | Unavailable
}

export interface KeyValuePort {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
}

export interface AuthPort {
  getSession(): Promise<any | null>
  signInWithPassword(email: string, password: string): Promise<any>
  signOut(): Promise<void>
}

export interface Platform {
  capabilities: Capabilities
  data: DataPort
  screenTime: ScreenTimePort
  focusWindow: FocusWindowPort
  store: KeyValuePort
  auth: AuthPort
}

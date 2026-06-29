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
  /** App-level tracking — which apps are used. Works on all desktop platforms. */
  isTrackingAvailable(): boolean | Promise<boolean>
  /**
   * Detailed tracking — window titles + in-browser website/domain detection.
   * Available on Windows/Linux and on macOS once Accessibility is granted; not
   * available on the permission-free macOS (lsappinfo) path or on web.
   */
  isDetailTrackingAvailable(): boolean | Promise<boolean>
}

export interface FocusWindowPort {
  setAlwaysOnTop(flag: boolean): void | Unavailable
  resize(w: number, h: number, x?: number, y?: number): void | Unavailable
  restore(): void | Unavailable
  setResizable(flag: boolean): void | Unavailable
  closeDevTools(): void | Unavailable
}

export interface KeyValuePort {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
}

export interface AuthPort {
  getSession(): Promise<any | null>
  signInWithPassword(email: string, password: string): Promise<any>
  signOut(): Promise<void>
  onDeepLink(cb: (url: string) => void): (() => void) | Unavailable
  getPendingDeepLink(): Promise<string | null>
  setUser(userId: string | null, accessToken?: string | null): void | Unavailable
}

export interface WindowControlsPort {
  minimize(): void | Unavailable
  maximize(): void | Unavailable
  close(): void | Unavailable
}

export interface TrackerPort {
  setContext(taskId: any): void | Unavailable
}

export interface LinksPort {
  openExternal(url: string): void | Unavailable
}

export interface CanvasPort {
  list(userId: string): Promise<any[]>
  get(id: string): Promise<any | null>
  create(c: any): Promise<any>
  update(id: string, patch: any): Promise<any>
  softDelete(id: string): Promise<void>

  listBlocks(canvasId: string): Promise<any[]>
  upsertBlock(b: any): Promise<any>
  upsertBlocksBatch(bs: any[]): Promise<any>
  softDeleteBlock(id: string): Promise<void>
  softDeleteBlocksBatch(ids: string[]): Promise<void>

  listConnections(canvasId: string): Promise<any[]>
  upsertConnection(c: any): Promise<any>
  softDeleteConnection(id: string): Promise<void>

  listZones(canvasId: string): Promise<any[]>
  upsertZone(z: any): Promise<any>
  softDeleteZone(id: string): Promise<void>

  unfurlLink(url: string): Promise<{ url: string; title: string; description: string; image?: string; siteName?: string; fetchedAt?: number }>
}

export interface Platform {
  capabilities: Capabilities
  data: DataPort
  screenTime: ScreenTimePort
  focusWindow: FocusWindowPort
  store: KeyValuePort
  auth: AuthPort
  windowControls: WindowControlsPort
  tracker: TrackerPort
  links: LinksPort
  canvas: CanvasPort
}

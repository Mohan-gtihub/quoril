export interface Capabilities {
  appTracking: boolean
  nativeOverlay: boolean
  pictureInPicture: boolean
  localDb: boolean
  /** AI-generated report insights are available (key + backend present). */
  aiInsights: boolean
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
  /** Open the dedicated focus-pill overlay window and hide the main window. */
  enterPill(): void | Unavailable
  /** Close the pill window and bring the main app window back. */
  exitPill(): void | Unavailable
  /** Subscribe to the main window's "re-read persisted state" signal. */
  onRehydrate(cb: () => void): (() => void) | Unavailable
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

export interface NotificationsPort {
  /** Fire a native OS notification (outside the app window). No-op on web. */
  show(title: string, body: string): void | Unavailable
}

// Mirrors UpdateStatus in electron/main/updater.ts + electron/preload/index.ts.
export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'not-available' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

export interface UpdatesPort {
  /** Current updater status (pulled on mount so we don't miss the first event). */
  getStatus(): Promise<UpdateStatus>
  /** Trigger a manual check. */
  check(): Promise<UpdateStatus>
  /** Quit and install a downloaded update ("Restart Now"). Resolves false if none ready. */
  restartAndInstall(): Promise<boolean>
  /** Subscribe to status changes. Returns an unsubscribe fn, or Unavailable on web. */
  onStatus(cb: (status: UpdateStatus) => void): (() => void) | Unavailable
}

export interface FeedbackPort {
  /**
   * Capture the current app window as a PNG data URL for the alpha feedback
   * widget. Desktop-only (native window capture); web returns Unavailable.
   */
  captureScreen(): Promise<string | Unavailable>
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

export interface InsightsPort {
  /**
   * Turn an aggregated, privacy-safe report summary into structured suggestions.
   * `summary` is the ReportInsightSummary from services/insights; typed as unknown
   * here so the platform layer stays decoupled from the insights module's shape.
   * Returns an InsightsResponse ({ ok, ... }); web/mobile without a backend return
   * { ok: false }. A future mobile target implements this against an HTTPS endpoint.
   */
  generate(summary: unknown): Promise<{ ok: true; result: any; model: string } | { ok: false; error: string }>
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
  notifications: NotificationsPort
  updates: UpdatesPort
  canvas: CanvasPort
  feedback: FeedbackPort
  insights: InsightsPort
}

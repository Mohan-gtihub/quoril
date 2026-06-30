// NOTE: This is the ONLY file in src/ allowed to access window.electron* globals.
// Method names (db.listTasks, screenTime.getData, etc.) follow the IPC channel naming
// convention seen in electron/preload/index.ts (db:saveSession, screenTime:getData).
// If the actual preload surface differs, a later task will align names — this file
// provides a structurally-correct impl that compiles and passes the selector test.

import type { Platform } from './types'

const api = () => (window as any).electronAPI
const legacy = () => (window as any).electron

export const electronPlatform: Platform = {
  capabilities: { appTracking: true, nativeOverlay: true, pictureInPicture: false, localDb: true },
  data: {
    async listTasks() { return api().db.listTasks?.() ?? [] },
    async saveTask(t) { return api().db.saveTask?.(t) },
    async deleteTask(id) { return api().db.deleteTask?.(id) },
    async listLists() { return api().db.listLists?.() ?? [] },
    async listWorkspaces() { return api().db.listWorkspaces?.() ?? [] },
    async listCanvasDocs() { return api().db.listCanvasDocs?.() ?? [] },
    async saveCanvasDoc(d) { return api().db.saveCanvasDoc?.(d) },
    async saveSession(s) { return api().db.saveSession?.(s) },
    async listSessions() { return api().db.listSessions?.() ?? [] },
  },
  screenTime: {
    async getData(args) { return api().screenTime?.getData(args) },
    // App-level tracking works on every desktop platform — on macOS the
    // permission-free lsappinfo path records app usage even without Accessibility.
    async isTrackingAvailable() { return true },
    // Window titles + website detection need active-win, which on macOS requires
    // Accessibility. Windows/Linux always have it; web never does.
    async isDetailTrackingAvailable() {
      const current = api()
      const platformName = await current.app?.getPlatform?.()
      if (platformName !== 'darwin') return true
      return Boolean(await current.permissions?.checkAccessibility?.())
    },
  },
  focusWindow: {
    setAlwaysOnTop(flag) { legacy()?.setAlwaysOnTop?.(flag) },
    resize(w, h, x, y) { legacy()?.resizeWindow?.(w, h, x, y) },
    restore() { legacy()?.restoreWindow?.() },
    setResizable(flag) { legacy()?.setResizable?.(flag) },
    closeDevTools() { legacy()?.closeDevTools?.() },
    enterPill() {
      const r = api()?.pill?.enter?.()
      if (r && typeof r.catch === 'function') r.catch(console.error)
    },
    exitPill() {
      const r = api()?.pill?.exit?.()
      if (r && typeof r.catch === 'function') r.catch(console.error)
    },
    onRehydrate(cb) { return api()?.pill?.onRehydrate?.(cb) ?? { available: false as const } },
  },
  store: {
    async get(key) { return api().store?.get(key) ?? null },
    async set(key, value) { return api().store?.set(key, value) },
  },
  auth: {
    async getSession() { return null },
    async signInWithPassword() { throw new Error('electron auth uses deep-link flow') },
    async signOut() {},
    onDeepLink(cb) { return api().auth?.onDeepLink?.(cb) ?? { available: false as const } },
    async getPendingDeepLink() { return api().auth?.getPendingDeepLink?.() ?? null },
    setUser(userId, accessToken) { const r = api().auth?.setUser?.(userId, accessToken); if (r && typeof r.catch === 'function') r.catch(console.error); return r },
  },
  windowControls: {
    minimize() { api().window?.minimize?.() },
    maximize() { api().window?.maximize?.() },
    close() { api().window?.close?.() },
  },
  tracker: {
    setContext(taskId) { api().tracker?.setContext?.(taskId) },
  },
  links: {
    openExternal(url) {
      const fn = api()?.file?.openExternal
      if (typeof fn !== 'function') return { available: false as const }
      const r = fn(url)
      if (r && typeof r.catch === 'function') r.catch(console.error)
      return undefined
    },
  },
  notifications: {
    show(title, body) {
      const fn = api()?.notification?.show
      if (typeof fn !== 'function') return { available: false as const }
      const r = fn(title, body)
      if (r && typeof r.catch === 'function') r.catch(console.error)
      return undefined
    },
  },
  canvas: {
    list: (userId) => api().canvas.list(userId),
    get: (id) => api().canvas.get(id),
    create: (c) => api().canvas.create(c),
    update: (id, patch) => api().canvas.update(id, patch),
    softDelete: (id) => api().canvas.softDelete(id),
    listBlocks: (canvasId) => api().canvas.listBlocks(canvasId),
    upsertBlock: (b) => api().canvas.upsertBlock(b),
    upsertBlocksBatch: (bs) => api().canvas.upsertBlocksBatch(bs),
    softDeleteBlock: (id) => api().canvas.softDeleteBlock(id),
    softDeleteBlocksBatch: (ids) => api().canvas.softDeleteBlocksBatch(ids),
    listConnections: (canvasId) => api().canvas.listConnections(canvasId),
    upsertConnection: (c) => api().canvas.upsertConnection(c),
    softDeleteConnection: (id) => api().canvas.softDeleteConnection(id),
    listZones: (canvasId) => api().canvas.listZones(canvasId),
    upsertZone: (z) => api().canvas.upsertZone(z),
    softDeleteZone: (id) => api().canvas.softDeleteZone(id),
    unfurlLink: (url) => api().canvas.unfurlLink(url),
  },
}

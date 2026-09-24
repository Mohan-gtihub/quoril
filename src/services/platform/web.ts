import type { Platform } from './types'
import { UNAVAILABLE } from './types'
import { supabase } from '@/services/supabase'
import { webCanvas } from './webCanvas'
import { generateViaEdge, isReportSummary } from '@/services/insights/insightClient'

const hasPiP = typeof window !== 'undefined' && 'documentPictureInPicture' in window

export const webPlatform: Platform = {
  capabilities: { appTracking: false, nativeOverlay: false, pictureInPicture: hasPiP, localDb: false, aiInsights: true },
  data: {
    async listTasks() { const { data } = await supabase.from('tasks').select('*'); return data ?? [] },
    async saveTask(t) { const { data } = await supabase.from('tasks').upsert(t).select().single(); return data },
    async deleteTask(id) { await supabase.from('tasks').delete().eq('id', id) },
    async listLists() { const { data } = await supabase.from('lists').select('*'); return data ?? [] },
    async listWorkspaces() { const { data } = await supabase.from('workspaces').select('*'); return data ?? [] },
    async listCanvasDocs() { const { data } = await supabase.from('canvases').select('*'); return data ?? [] },
    async saveCanvasDoc(d) { const { data } = await supabase.from('canvases').upsert(d).select().single(); return data },
    async saveSession(s) { const { data } = await supabase.from('focus_sessions').upsert(s).select().single(); return data },
    async listSessions(range) {
      let q = supabase.from('focus_sessions').select('*')
      if (range) q = q.gte('start', range.from).lte('start', range.to)
      const { data } = await q; return data ?? []
    },
  },
  screenTime: {
    async getData() { return UNAVAILABLE },
    isTrackingAvailable() { return false },
    isDetailTrackingAvailable() { return false },
    // The browser cannot observe other apps at all, so there is nothing to opt into.
    async getTrackingDetail() { return null },
    async setTrackingDetail() { return null },
    async requestAccessibility() { return null },
    async openPrivacySettings() { return false },
    async relaunch() { },
  },
  focusWindow: {
    setAlwaysOnTop() { return UNAVAILABLE },
    resize() { return UNAVAILABLE },
    restore() { return UNAVAILABLE },
    setResizable() { return UNAVAILABLE },
    closeDevTools() { return UNAVAILABLE },
    enterPill() { return UNAVAILABLE },
    exitPill() { return UNAVAILABLE },
    onRehydrate() { return UNAVAILABLE },
  },
  store: {
    async get(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null },
    async set(key, value) { localStorage.setItem(key, JSON.stringify(value)) },
  },
  auth: {
    async getSession() { const { data } = await supabase.auth.getSession(); return data.session },
    async signInWithPassword(email, password) { return supabase.auth.signInWithPassword({ email, password }) },
    async signOut() { await supabase.auth.signOut() },
    onDeepLink() { return UNAVAILABLE },
    async getPendingDeepLink() { return null },
    setUser() { return UNAVAILABLE },
  },
  windowControls: {
    minimize() { return UNAVAILABLE },
    maximize() { return UNAVAILABLE },
    close() { return UNAVAILABLE },
  },
  tracker: {
    setContext() { return UNAVAILABLE },
  },
  links: {
    openExternal() { return UNAVAILABLE },
  },
  notifications: {
    show() { return UNAVAILABLE },
  },
  updates: {
    async getStatus() { return { state: 'not-available' as const } },
    async check() { return { state: 'not-available' as const } },
    async download() { return false },
    async restartAndInstall() { return false },
    onStatus() { return UNAVAILABLE },
  },
  feedback: {
    async captureScreen() { return UNAVAILABLE },
  },
  canvas: webCanvas,
  insights: {
    // Briefing and planning insights work on the web too: the `quoril-insights`
    // edge function holds the key server-side and authenticates with the user's
    // Supabase session, so no client key is needed. There is no Groq fallback on
    // web (that path lives in the desktop main process), and the reports modal's
    // report-summary shape isn't an edge concern.
    async generate(summary) {
      if (isReportSummary(summary)) {
        return { ok: false as const, error: 'AI report insights are only available in the Quoril desktop app.' }
      }
      const edge = await generateViaEdge(summary)
      if (edge.ok) return { ok: true as const, result: edge.result, model: edge.model }
      return { ok: false as const, error: edge.error }
    },
  },
  calendar: {
    // Calendar events are a desktop-only, on-device schedule (not synced).
    async list() { return [] },
    async save(ev) { return ev },
    async update(_id, patch) { return patch },
    async remove() {},
  },
}

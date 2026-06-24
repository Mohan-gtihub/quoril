import type { Platform } from './types'
import { UNAVAILABLE } from './types'
import { supabase } from '@/services/supabase'

const hasPiP = typeof window !== 'undefined' && 'documentPictureInPicture' in window

export const webPlatform: Platform = {
  capabilities: { appTracking: false, nativeOverlay: false, pictureInPicture: hasPiP, localDb: false },
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
  },
  focusWindow: {
    setAlwaysOnTop() { return UNAVAILABLE },
    resize() { return UNAVAILABLE },
    restore() { return UNAVAILABLE },
  },
  store: {
    async get(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null },
    async set(key, value) { localStorage.setItem(key, JSON.stringify(value)) },
  },
  auth: {
    async getSession() { const { data } = await supabase.auth.getSession(); return data.session },
    async signInWithPassword(email, password) { return supabase.auth.signInWithPassword({ email, password }) },
    async signOut() { await supabase.auth.signOut() },
  },
}

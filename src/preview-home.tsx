import React from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import './index.css'
import { HabitOverview } from './components/dashboard/HabitOverview'
import { useAuthStore } from './store/authStore'
import { useTaskStore } from './store/taskStore'
import { useListStore } from './store/listStore'
import { useWorkspaceStore } from './store/workspaceStore'
import { useFocusStore } from './store/focusStore'

const now = new Date()
const iso = (d: Date) => d.toISOString()
const todayStr = iso(now)

const workspaces = [
  { id: 'w1', name: 'Health', color: '#5c8a5a' },
  { id: 'w2', name: 'Mind', color: '#8b5cf6' },
  { id: 'w3', name: 'Work', color: '#c2724e' },
]
const lists = [
  { id: 'l1', workspace_id: 'w1', name: 'Body' },
  { id: 'l2', workspace_id: 'w2', name: 'Focus' },
  { id: 'l3', workspace_id: 'w3', name: 'Craft' },
]
const mk = (i: number, o: any) => ({
  id: 't' + i, title: o.title, status: o.status || 'todo', priority: o.priority || 'medium',
  list_id: o.list_id, due_date: o.due_date || null, completed_at: o.completed_at || null,
  deleted_at: null, sort_order: i,
})
const tasks = [
  mk(1, { title: 'Morning workout — 30 min', list_id: 'l1', status: 'done', completed_at: todayStr }),
  mk(2, { title: 'Drink 8 glasses of water', list_id: 'l1' }),
  mk(3, { title: 'Meditate 10 minutes', list_id: 'l2', status: 'done', completed_at: todayStr }),
  mk(4, { title: 'Read 20 pages', list_id: 'l2' }),
  mk(5, { title: 'No social media before noon', list_id: 'l2' }),
  mk(6, { title: 'Deep work block', list_id: 'l3', status: 'done', completed_at: todayStr }),
  mk(7, { title: 'Write 500 words', list_id: 'l3' }),
  mk(8, { title: 'Walk 8,000 steps', list_id: 'l1' }),
  mk(9, { title: 'Sleep by 11 PM', list_id: 'l1' }),
]

// fabricate a few focus sessions today + history for the heatmap/streak
const sessions: any[] = []
for (let d = 0; d < 40; d++) {
  const day = new Date(now); day.setDate(now.getDate() - d)
  const count = (d * 7) % 4
  for (let s = 0; s < count; s++) {
    const start = new Date(day); start.setHours(9 + s * 2, 0, 0, 0)
    const end = new Date(start); end.setMinutes(start.getMinutes() + 50)
    sessions.push({ id: `s${d}_${s}`, type: 'focus', start_time: iso(start), end_time: iso(end), duration: 3000 })
  }
}

useAuthStore.setState({ user: { email: 'mohan@quoril.app' } as any })
useWorkspaceStore.setState({ workspaces: workspaces as any, activeWorkspaceId: null })
useListStore.setState({ lists: lists as any })
useTaskStore.setState({ tasks: tasks as any })
useFocusStore.setState({ sessions: sessions as any, isActive: false, startTime: null })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter>
      <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <HabitOverview />
      </div>
    </MemoryRouter>
  </React.StrictMode>
)

import { useEffect, useState, useMemo } from 'react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useFocusStore } from '@/store/focusStore'
import type { BlockBehavior, BlockRenderProps } from './registry'
import type { TaskRefContent } from '@/types/canvas'
import { Play, Pause, CheckCircle2, Circle, Target } from 'lucide-react'

function formatTime(s: number) {
    if (!s || s < 0) s = 0
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${m}:${String(sec).padStart(2, '0')}`
}

function Render({ block }: BlockRenderProps) {
    const data = (block.content.kind === 'task_ref' ? block.content.data : { taskId: '' }) as TaskRefContent
    const patch = useBlocksStore((s) => s.patch)
    const tasks = useTaskStore((s) => s.tasks)
    const lists = useListStore((s) => s.lists)
    const fetchTasks = useTaskStore((s) => s.fetchTasks)
    const focus = useFocusStore()
    const [picking, setPicking] = useState(!data.taskId)
    const [q, setQ] = useState('')

    useEffect(() => {
        if (tasks.length === 0) fetchTasks().catch(() => {})
    }, [tasks.length, fetchTasks])

    const task = useMemo(() => tasks.find((t) => t.id === data.taskId), [tasks, data.taskId])
    const list = useMemo(() => lists.find((l) => l.id === task?.list_id), [lists, task])

    const results = useMemo(() => {
        const qq = q.toLowerCase().trim()
        const src = qq ? tasks.filter((t) => t.title?.toLowerCase().includes(qq)) : tasks
        return src.slice(0, 20)
    }, [q, tasks])

    if (picking || !task) {
        return (
            <div
                className="w-full h-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] flex flex-col overflow-hidden"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="px-3 pt-2 pb-1 flex items-center gap-2 border-b border-[var(--border-default)]">
                    <Target size={12} className="text-[var(--text-muted)]" />
                    <input
                        autoFocus
                        placeholder="Search tasks…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                </div>
                <div className="flex-1 overflow-auto">
                    {results.length === 0 && (
                        <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No tasks. Create one in Planner.</div>
                    )}
                    {results.map((t) => {
                        const l = lists.find((ls) => ls.id === t.list_id)
                        return (
                            <button
                                key={t.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    patch(block.id, {
                                        content: { kind: 'task_ref', data: { taskId: t.id } },
                                        linkedTaskId: t.id,
                                    }, true)
                                    setPicking(false)
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)]"
                            >
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l?.color ?? '#888' }} />
                                <span className="text-sm text-[var(--text-primary)] truncate">{t.title}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    const isRunning = focus.isActive && !focus.isPaused && focus.taskId === task.id
    const spent = (task as any).spent_s ?? 0
    const done = task.status === 'done'

    return (
        <div
            className="w-full h-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3 flex flex-col gap-2"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <span className="w-2 h-2 rounded-full" style={{ background: list?.color ?? '#888' }} />
                <span className="truncate">{list?.name ?? 'No list'}</span>
                <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="ml-auto text-[10px] underline hover:text-[var(--text-primary)]"
                >
                    change
                </button>
            </div>
            <div className={`text-sm font-medium leading-snug ${done ? 'line-through opacity-60' : 'text-[var(--text-primary)]'}`}>
                {task.title}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
                <div className="text-xs font-mono text-[var(--text-muted)]">{formatTime(spent)}</div>
                <div className="flex items-center gap-1">
                    {isRunning ? (
                        <button
                            className="px-2 py-1 rounded-md text-xs bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 flex items-center gap-1"
                            onClick={() => focus.pauseSession()}
                        >
                            <Pause size={12} /> Pause
                        </button>
                    ) : (
                        <button
                            className="px-2 py-1 rounded-md text-xs bg-[var(--accent-primary)] text-white hover:opacity-90 flex items-center gap-1"
                            onClick={() => focus.startSession(task.id)}
                            disabled={done}
                        >
                            <Play size={12} /> Start
                        </button>
                    )}
                    {done ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                        <Circle size={16} className="text-[var(--text-muted)]" />
                    )}
                </div>
            </div>
        </div>
    )
}

export const TaskRefBehavior: BlockBehavior = { render: Render }

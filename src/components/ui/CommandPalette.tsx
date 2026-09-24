import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Circle,
    CornerDownLeft,
    LayoutDashboard,
    CalendarDays,
    BarChart3,
    Clock,
    Settings as SettingsIcon,
    Timer,
    Square,
    Plus,
    Search,
} from 'lucide-react'

import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useListStore } from '@/store/listStore'
import { parseQuickAdd, quickAddHint } from '@/utils/quickAdd'
import type { Task } from '@/types/database'

/* ---------------------------------------------------------------
   Fuzzy match — Swift-style: case-insensitive substring OR ordered
   subsequence. Returns true when every char of `query` appears in
   `text` in order.
--------------------------------------------------------------- */
function fuzzyMatch(query: string, text: string): boolean {
    if (!query) return true
    const q = query.toLowerCase()
    const t = text.toLowerCase()
    if (t.includes(q)) return true
    let qi = 0
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++
    }
    return qi === q.length
}

type CommandGroup = 'Tasks' | 'Go to' | 'Actions'

interface Command {
    id: string
    group: CommandGroup
    icon: React.ReactNode
    title: string
    subtitle?: string
    hint?: string | null
    run: () => void | Promise<void>
}

const NAV_ITEMS: { label: string; path: string; icon: React.ReactNode }[] = [
    { label: 'Home', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Planner', path: '/planner', icon: <CalendarDays className="w-4 h-4" /> },
    { label: 'Calendar', path: '/calendar', icon: <CalendarDays className="w-4 h-4" /> },
    { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Screen Time', path: '/screen-time', icon: <Clock className="w-4 h-4" /> },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon className="w-4 h-4" /> },
]

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState(0)

    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    const close = useCallback(() => {
        setOpen(false)
        setQuery('')
        setSelected(0)
    }, [])

    /* ---- Global key listener: ⌘K / Ctrl+K toggles; "/" opens ---- */
    useEffect(() => {
        const isTyping = (el: EventTarget | null): boolean => {
            const node = el as HTMLElement | null
            if (!node) return false
            const tag = node.tagName
            return (
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                node.isContentEditable
            )
        }

        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey
            if (mod && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault()
                setOpen((v) => !v)
                return
            }
            if (e.key === '/' && !open && !isTyping(e.target)) {
                e.preventDefault()
                setOpen(true)
                return
            }
            if (e.key === 'Escape' && open) {
                e.preventDefault()
                close()
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, close])

    /* ---- Autofocus input when opened ---- */
    useEffect(() => {
        if (open) {
            // Defer so the element is mounted before focusing.
            const id = requestAnimationFrame(() => inputRef.current?.focus())
            return () => cancelAnimationFrame(id)
        }
    }, [open])

    /* ---- Resolve the target list for new tasks ---- */
    const resolveListId = useCallback((): string | null => {
        const { selectedListId, lists } = useListStore.getState()
        if (selectedListId && lists.some((l) => l.id === selectedListId)) {
            return selectedListId
        }
        return lists[0]?.id ?? null
    }, [])

    /* ---- Build the command list from the query ---- */
    const commands = useMemo<Command[]>(() => {
        const q = query.trim()
        const out: Command[] = []

        const focus = useFocusStore.getState()
        const tasks = useTaskStore.getState().tasks

        /* a. Matching open tasks → start focus */
        if (q) {
            const openTasks = tasks
                .filter((t) => t.status !== 'done' && !t.deleted_at)
                .filter((t) => fuzzyMatch(q, t.title))
                .slice(0, 6)

            for (const t of openTasks) {
                out.push({
                    id: `task-${t.id}`,
                    group: 'Tasks',
                    icon: <Circle className="w-4 h-4" />,
                    title: t.title,
                    subtitle: 'Start focus',
                    run: async () => {
                        await useFocusStore.getState().startFocus(t.id)
                        close()
                    },
                })
            }
        }

        /* b. Navigation commands */
        const dedupNav = new Set<string>()
        for (const item of NAV_ITEMS) {
            if (dedupNav.has(item.label)) continue
            dedupNav.add(item.label)
            if (!q || fuzzyMatch(q, item.label)) {
                out.push({
                    id: `nav-${item.path}-${item.label}`,
                    group: 'Go to',
                    icon: item.icon,
                    title: item.label,
                    run: () => {
                        navigate(item.path)
                        close()
                    },
                })
            }
        }

        /* c. Action commands */
        if (q) {
            const parsed = parseQuickAdd(q)
            const title = parsed.title || q
            out.unshift({
                id: 'action-new-task',
                group: 'Actions',
                icon: <Plus className="w-4 h-4" />,
                title: `New task: ${title}`,
                subtitle: 'Create task',
                hint: quickAddHint(parsed),
                run: async () => {
                    const listId = resolveListId()
                    if (!listId) {
                        close()
                        return
                    }
                    const draft: Partial<Task> = {
                        list_id: listId,
                        title,
                    }
                    if (parsed.priority) draft.priority = parsed.priority
                    if (parsed.estimateMinutes) draft.estimated_minutes = parsed.estimateMinutes
                    if (parsed.dueAt) draft.due_date = parsed.dueAt
                    try {
                        await useTaskStore.getState().createTask(draft, 'today', 'top')
                    } catch {
                        /* store surfaces its own error */
                    }
                    close()
                },
            })
        }

        if (focus.isActive) {
            if (!q || fuzzyMatch(q, 'Stop focus')) {
                out.push({
                    id: 'action-stop-focus',
                    group: 'Actions',
                    icon: <Square className="w-4 h-4" />,
                    title: 'Stop focus',
                    run: async () => {
                        await useFocusStore.getState().endSession()
                        close()
                    },
                })
            }
        } else {
            // "Start focus" on the first matching open task when nothing is running.
            if (q && fuzzyMatch(q, 'Start focus')) {
                const firstOpen = tasks.find((t) => t.status !== 'done' && !t.deleted_at)
                if (firstOpen) {
                    out.push({
                        id: 'action-start-focus',
                        group: 'Actions',
                        icon: <Timer className="w-4 h-4" />,
                        title: 'Start focus',
                        subtitle: firstOpen.title,
                        run: async () => {
                            await useFocusStore.getState().startFocus(firstOpen.id)
                            close()
                        },
                    })
                }
            }
        }

        // Cap total ~12 results, preserving the "New task" action at the top.
        return out.slice(0, 12)
        // query drives everything; stores are read fresh via getState().
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, open, navigate, close, resolveListId])

    /* Keep selection in range as the result set changes. */
    useEffect(() => {
        setSelected((s) => (commands.length ? Math.min(s, commands.length - 1) : 0))
    }, [commands.length])

    /* ---- Keyboard navigation inside the palette ---- */
    const onInputKeyDown = (e: React.KeyboardEvent) => {
        if (!commands.length) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelected((s) => (s + 1) % commands.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelected((s) => (s - 1 + commands.length) % commands.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            void commands[selected]?.run()
        }
    }

    /* Scroll the selected row into view. */
    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
        el?.scrollIntoView({ block: 'nearest' })
    }, [selected])

    if (!open) return null

    // Render rows with group headers.
    let lastGroup: CommandGroup | null = null

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[10000] flex items-start justify-center"
                style={{ paddingTop: '15vh' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={close}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />

                {/* Panel */}
                <motion.div
                    className="relative w-full max-w-[560px] mx-4 bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden shadow-2xl"
                    style={{ borderRadius: 'var(--radius-card)' }}
                    initial={{ opacity: 0, scale: 0.98, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -8 }}
                    transition={{ duration: 0.14 }}
                >
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border-default)]">
                        <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setSelected(0)
                            }}
                            onKeyDown={onInputKeyDown}
                            placeholder="Search tasks, jump to a page, or type to add…"
                            className="flex-1 bg-transparent outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
                        {commands.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
                                No results
                            </div>
                        ) : (
                            commands.map((cmd, i) => {
                                const showHeader = cmd.group !== lastGroup
                                lastGroup = cmd.group
                                const active = i === selected
                                return (
                                    <div key={cmd.id}>
                                        {showHeader && (
                                            <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                {cmd.group}
                                            </div>
                                        )}
                                        <button
                                            data-index={i}
                                            onMouseEnter={() => setSelected(i)}
                                            onClick={() => void cmd.run()}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                                            style={{
                                                backgroundColor: active ? 'var(--accent-lime-100)' : 'transparent',
                                            }}
                                        >
                                            <span
                                                className="flex-shrink-0"
                                                style={{
                                                    color: active
                                                        ? 'var(--accent-primary)'
                                                        : 'var(--text-muted)',
                                                }}
                                            >
                                                {cmd.icon}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[14px] text-[var(--text-primary)] truncate">
                                                    {cmd.title}
                                                </span>
                                                {cmd.subtitle && (
                                                    <span className="block text-[12px] text-[var(--text-muted)] truncate">
                                                        {cmd.subtitle}
                                                    </span>
                                                )}
                                            </span>
                                            {cmd.hint && (
                                                <span className="flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                                                    {cmd.hint}
                                                </span>
                                            )}
                                            {active && (
                                                <CornerDownLeft className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                                            )}
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

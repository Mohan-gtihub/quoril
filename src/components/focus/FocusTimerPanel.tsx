import { useMemo, useState } from 'react'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { TaskCard } from '../planner/TaskCard'
import { cn } from '@/utils/helpers'

import {
    Play,
    Pause,
    CheckCircle2,
    ExternalLink,
    SkipForward,
    ChevronRight,
    Timer,
    Zap,
    Layout
} from 'lucide-react'

import {
    DndContext,
    DragEndEvent,
    closestCorners,
    useSensor,
    useSensors,
    PointerSensor,
    useDroppable,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'

import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'

/* ---------------------------------------------
   UTILS
--------------------------------------------- */

function formatTime(sec: number) {
    const s = Math.abs(Math.floor(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const r = s % 60

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export function FocusTimerPanel() {
    const focus = useFocusStore()
    const { tasks, moveTaskToColumn, reorderTasks } = useTaskStore()
    const { selectedListId } = useListStore()

    const {
        isActive,
        isPaused,
        taskId,
        duration,
        remainingTime,
        isOvertime,
        progress,
    } = useTimerDisplay()

    const {
        pauseSession,
        resumeSession,
        endSession,
        skipToNext,
        setShowFocusPanel,
    } = focus

    /* ---------- DROP ZONE ---------- */
    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: 'active-task-target',
    })

    /* ---------- TASKS ---------- */
    const activeTask = tasks.find(t => t.id === taskId)
    const nextTasks = useMemo(() => {
        return tasks
            .filter((t: any) =>
                t.id !== taskId &&
                t.status !== 'done' &&
                (selectedListId === 'all' || t.list_id === selectedListId) &&
                useTaskStore.getState().getColumnStatuses('today').includes(t.status)
            )
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }, [tasks, taskId, selectedListId])

    /* ---------- DND ---------- */
    const [activeId, setActiveId] = useState<string | null>(null)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const handleDragStart = (e: any) => setActiveId(e.active.id)

    const handleDragEnd = async (e: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = e
        if (!over) return

        // Check if dropped on the active task area (regardless of if a task is already active)
        if (over.id === 'active-task-target') {
            const taskIdToStart = active.id as string
            if (taskIdToStart !== taskId) {
                focus.startSession(taskIdToStart)
            }
            return
        }

        if (active.id === over.id) return

        const oldIndex = nextTasks.findIndex(t => t.id === active.id)
        const newIndex = nextTasks.findIndex(t => t.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return

        const reordered = arrayMove(nextTasks, oldIndex, newIndex)
        const updates = reordered.map((t: any, i: number) => ({
            id: t.id,
            sort_order: i + 1,
        }))
        await reorderTasks(updates)
    }

    /* ---------- ACTIONS ---------- */
    const handleDone = async () => {
        if (taskId) await moveTaskToColumn(taskId, 'done')
        await endSession()
    }

    const handleSkip = async () => {
        const next = nextTasks[0]?.id
        if (window.confirm(next ? 'Skip to next task?' : 'End session?')) {
            await skipToNext(next)
        }
    }

    const [isNativeDragOver, setIsNativeDragOver] = useState(false)

    const handleNativeDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsNativeDragOver(false)
        const droppedTaskId = e.dataTransfer.getData('taskId')
        if (droppedTaskId) {
            focus.startSession(droppedTaskId)
            setShowFocusPanel(true)
        }
    }

    const handlePopOut = () => {
        window.open('/focus-popup', 'BlitzFocus', 'width=400,height=700,resizable=yes,alwaysOnTop=yes')
    }

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault()
                setIsNativeDragOver(true)
            }}
            onDragLeave={() => setIsNativeDragOver(false)}
            onDrop={handleNativeDrop}
            className={cn(
                "h-full flex flex-col w-full overflow-hidden transition-colors",
                isNativeDragOver ? "bg-blue-500/5 ring-4 ring-inset ring-blue-500/20" : "bg-[var(--bg-secondary)]"
            )}
        >
            {/* GLASS HEADER */}
            <div className="h-20 flex items-center justify-between px-8 border-b backdrop-blur-xl sticky top-0 z-40" style={{ borderColor: 'var(--border-default)', backgroundColor: 'rgba(26, 26, 30, 0.8)' }}>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className={cn(
                            "w-3 h-3 rounded-full transition-all duration-500",
                            isActive && !isPaused ? "bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-white/20"
                        )} />
                    </div>
                    <div>
                        <span className="font-black text-[10px] tracking-[0.25em] uppercase text-white/40 block pb-0.5">Focus Terminal</span>
                        <span className="text-[9px] font-bold text-blue-400/60 font-mono tracking-tighter">OS_v1.0.4.quoril</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handlePopOut} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white">
                        <ExternalLink size={16} />
                    </button>
                    <button
                        onClick={() => {
                            setShowFocusPanel(false)
                            setTimeout(() => window.resizeTo(1400, 900), 100)
                        }}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {activeTask ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* PREMIUM TIMER CARD */}
                            <div className="relative overflow-hidden p-10 rounded-[2.5rem] border group transition-all duration-1000"
                                style={{
                                    background: 'linear-gradient(165deg, #1a1a1e 0%, #0d0d0f 100%)',
                                    borderColor: isOvertime ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)'
                                }}>

                                {/* Dynamic Atmosphere */}
                                <div className={cn(
                                    "absolute inset-0 transition-opacity duration-1000",
                                    isPaused ? "opacity-20 bg-amber-500/5" : "opacity-40 bg-blue-500/5"
                                )} />
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[100px] group-hover:bg-blue-500/20 transition-all" />

                                <div className="relative z-10 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-6 block">
                                        {isOvertime ? 'OVERTIME PROTOCOL' : isPaused ? 'SYSTEM PAUSED' : 'QUANTUM FLOW ACTIVE'}
                                    </span>

                                    <div className={cn(
                                        "font-mono text-8xl font-black tracking-tighter mb-6 transition-all duration-700",
                                        isOvertime ? "text-red-500" : isPaused ? "text-amber-500" : "text-white"
                                    )}
                                        style={{
                                            textShadow: isPaused ? 'none' : isOvertime ? '0 0 40px rgba(239, 68, 68, 0.4)' : '0 0 40px rgba(255,255,255,0.1)'
                                        }}>
                                        {formatTime(isOvertime ? -remainingTime : remainingTime)}
                                    </div>

                                    {/* Cinematic Progress */}
                                    {duration > 0 && (
                                        <div className="mt-10 mx-auto max-w-[240px]">
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden ring-1 ring-white/10">
                                                <div
                                                    className="h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                                    style={{
                                                        width: `${Math.min(100, progress)}%`,
                                                        background: isOvertime ? 'linear-gradient(to right, #ef4444, #f87171)' : 'linear-gradient(to right, #2563eb, #60a5fa)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACTIVE FRONTIER */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <Zap size={12} className="text-amber-500 fill-amber-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Active Frontier</h3>
                                    </div>
                                    <span className="text-[9px] font-bold text-white/20 font-mono">ID_{activeTask.id.slice(0, 8)}</span>
                                </div>

                                <div
                                    ref={setDropRef}
                                    className={cn(
                                        "relative transition-all duration-500 rounded-3xl group/active",
                                        isOver ? "scale-[1.05] z-50 ring-4 ring-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.4)]" : ""
                                    )}
                                >
                                    <TaskCard
                                        task={activeTask}
                                        column="today"
                                        draggable={false}
                                        disableTimer
                                    />
                                    {isOver && (
                                        <div className="absolute inset-0 bg-blue-500/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border-2 border-blue-500/50">
                                            <div className="text-center animate-in zoom-in duration-300">
                                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/50">
                                                    <Zap className="text-white fill-current" />
                                                </div>
                                                <span className="text-xs font-black text-white uppercase tracking-widest">Release to Focus</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FUTURISTIC CONTROLS */}
                            <div className="grid grid-cols-3 gap-4">
                                <ControlBtn
                                    icon={isPaused ? <Play size={24} className="fill-current" /> : <Pause size={24} className="fill-current" />}
                                    label={isPaused ? 'Engage' : 'Holding'}
                                    active={isPaused}
                                    onClick={isPaused ? resumeSession : pauseSession}
                                    color={isPaused ? 'amber' : 'blue'}
                                />
                                <ControlBtn
                                    icon={<CheckCircle2 size={24} />}
                                    label="Fulfill"
                                    onClick={handleDone}
                                    color="emerald"
                                />
                                <ControlBtn
                                    icon={<SkipForward size={24} />}
                                    label="Bypass"
                                    onClick={handleSkip}
                                    color="gray"
                                />
                            </div>
                        </div>
                    ) : (
                        <div
                            ref={setDropRef}
                            className={cn(
                                "flex flex-col items-center justify-center h-[400px] text-center space-y-6 rounded-[3rem] transition-all duration-500",
                                isOver ? "bg-blue-500/10 border-2 border-dashed border-blue-500/40 scale-[1.02] shadow-[0_0_50px_rgba(59,130,246,0.2)]" : "border-2 border-transparent"
                            )}
                        >
                            <div className={cn(
                                "w-24 h-24 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center transition-all duration-500",
                                isOver ? "bg-blue-500 text-white rotate-12 scale-110" : "text-white/10"
                            )}>
                                <Timer size={48} strokeWidth={1} className={isOver ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                                <p className={cn(
                                    "text-lg font-black uppercase tracking-[0.3em] transition-colors",
                                    isOver ? "text-blue-400" : "text-white/40"
                                )}>
                                    {isOver ? "Ignite Session" : "Hangar Empty"}
                                </p>
                                <p className="text-xs text-white/20 mt-2 italic">
                                    {isOver ? "Release to launch this mission" : "Transmit a mission into the void to begin."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* QUEUE */}
                    <div className="space-y-6 pt-10 border-t border-white/5">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Layout size={12} className="text-white/20" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Mission Buffer</h3>
                            </div>
                            <span className="text-[10px] font-bold text-white/20">{nextTasks.length} queued</span>
                        </div>

                        <SortableContext items={nextTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4 pb-20">
                                {nextTasks.length > 0 ? (
                                    nextTasks.map(t => (
                                        <div key={t.id} className="animate-in fade-in slide-in-from-left-4 duration-500">
                                            <TaskCard
                                                task={t}
                                                column="today"
                                                draggable
                                                disableTimer
                                                onComplete={() => { }}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-16 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-white/10 space-y-3">
                                        <Layout size={32} strokeWidth={1} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Buffer Clear</span>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </div>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: {
                                    opacity: '0.4',
                                },
                            },
                        }),
                    }}>
                        {activeId ? (
                            <div className="scale-105 shadow-2xl z-[100] cursor-grabbing w-full">
                                <TaskCard
                                    task={tasks.find(t => t.id === activeId)!}
                                    column="today"
                                    draggable={false}
                                    disableTimer
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    )
}

interface ControlBtnProps {
    icon: React.ReactNode
    label: string
    onClick: () => void
    color: 'blue' | 'amber' | 'emerald' | 'gray'
    active?: boolean
}

function ControlBtn({ icon, label, onClick, color }: ControlBtnProps) {
    const colors: Record<string, string> = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20',
        gray: 'text-white/40 bg-white/5 border-white/5 hover:bg-white/10 hover:text-white',
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex flex-col items-center justify-center gap-3 h-28 rounded-[2rem] transition-all duration-300 border backdrop-blur-sm",
                colors[color]
            )}
        >
            <div className="transition-transform duration-500 group-hover:scale-110 group-active:scale-95">
                {icon}
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 group-hover:opacity-100">{label}</span>
        </button>
    )
}

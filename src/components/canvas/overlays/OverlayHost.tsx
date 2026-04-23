import { useOverlayStore } from '@/store/canvas/overlayStore'
import { X } from 'lucide-react'
import { Settings } from '@/components/focus/Settings'
import { Planner } from '@/components/planner/Planner'
import { Reports } from '@/components/reports/Reports'
import { ScreenTime } from '@/components/screentime/ScreenTime'
import { FocusMode } from '@/components/focus/FocusMode'

const MAP: Record<string, { title: string; node: React.ReactNode }> = {
    settings: { title: 'Settings', node: <Settings /> },
    planner: { title: 'Planner', node: <Planner /> },
    reports: { title: 'Reports', node: <Reports /> },
    screentime: { title: 'Screen Time', node: <ScreenTime /> },
    focus: { title: 'Focus', node: <FocusMode /> },
}

export function OverlayHost() {
    const active = useOverlayStore((s) => s.active)
    const close = useOverlayStore((s) => s.close)
    if (!active) return null
    const entry = MAP[active]
    if (!entry) return null
    return (
        <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-6xl h-[90vh] bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)]">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{entry.title}</div>
                    <button onClick={close} className="p-1 hover:bg-[var(--bg-hover)] rounded" aria-label="Close">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto">{entry.node}</div>
            </div>
        </div>
    )
}

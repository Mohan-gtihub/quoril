import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useReactFlow } from '@xyflow/react'
import { MousePointer2, Square, Home, Focus, Download } from 'lucide-react'

export function CanvasToolbar({ canvasId, onExport }: { canvasId: string; onExport: (format: 'json' | 'png') => void }) {
    const mode = useCanvasStore((s) => s.mode)
    const setMode = useCanvasStore((s) => s.setMode)
    const rf = useReactFlow()

    const setHome = async () => {
        const vp = rf.getViewport()
        await window.electronAPI.canvas.update(canvasId, { homeViewport: { x: vp.x, y: vp.y, zoom: vp.zoom } }).catch(() => {})
    }
    const goHome = async () => {
        const c = await window.electronAPI.canvas.get(canvasId)
        const hv = (c as any)?.homeViewport
        if (hv) rf.setViewport({ x: hv.x, y: hv.y, zoom: hv.zoom }, { duration: 300 })
        else rf.fitView({ duration: 300 })
    }

    const Btn = ({ active, title, onClick, children }: any) => (
        <button
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors ${active ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}
            title={title}
            type="button"
        >
            {children}
        </button>
    )

    return (
        <div
            className="absolute top-3 right-3 z-20 flex items-center gap-0.5 px-1 py-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <Btn active={mode === 'select'} title="Select (V)" onClick={() => setMode('select')}><MousePointer2 size={14} /></Btn>
            <Btn active={mode === 'zoneDraw'} title="Draw zone (Z)" onClick={() => setMode(mode === 'zoneDraw' ? 'select' : 'zoneDraw')}><Square size={14} /></Btn>
            <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
            <Btn title="Set home (⌘H)" onClick={setHome}><Home size={14} /></Btn>
            <Btn title="Home viewport (⌘0)" onClick={goHome}><Home size={14} className="rotate-180" /></Btn>
            <Btn active={mode === 'focus'} title="Focus mode (⌘.)" onClick={() => setMode(mode === 'focus' ? 'select' : 'focus')}><Focus size={14} /></Btn>
            <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
            <Btn title="Export JSON" onClick={() => onExport('json')}><Download size={14} /></Btn>
            <Btn title="Export PNG" onClick={() => onExport('png')}><Download size={14} className="opacity-70" /></Btn>
        </div>
    )
}

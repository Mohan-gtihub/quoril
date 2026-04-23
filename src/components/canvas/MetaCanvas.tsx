import type { Canvas } from '@/types/canvas'
import { Plus } from 'lucide-react'

export function MetaCanvas({
    canvases,
    onPick,
    onNew,
}: {
    canvases: Canvas[]
    onPick: (id: string) => void
    onNew: () => void
}) {
    return (
        <div className="w-full h-full bg-[var(--bg-primary)] overflow-auto p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-xl font-semibold mb-6 text-[var(--text-primary)]">Canvases</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <button
                        onClick={onNew}
                        className="aspect-video rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
                    >
                        <Plus size={20} />
                        <span className="text-sm">New canvas</span>
                    </button>
                    {canvases.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => onPick(c.id)}
                            className="aspect-video rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left hover:border-[var(--accent-primary)] transition-colors relative overflow-hidden"
                            style={c.color ? { background: c.color } : undefined}
                        >
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{c.title}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                {new Date(c.updatedAt).toLocaleDateString()}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

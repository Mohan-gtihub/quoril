import { useBlocksStore } from '@/store/canvas/blocksStore'
import type { BlockBehavior, BlockRenderProps } from './registry'
import type { ChecklistContent, ChecklistItem } from '@/types/canvas'
import { v4 as uuid } from 'uuid'
import { Plus, X } from 'lucide-react'
import { useRef } from 'react'

function Render({ block }: BlockRenderProps) {
    const data = (block.content.kind === 'checklist'
        ? block.content.data
        : { items: [] }) as ChecklistContent
    const patch = useBlocksStore((s) => s.patch)
    const newInputRef = useRef<HTMLInputElement>(null)

    const commit = (items: ChecklistItem[]) => {
        patch(block.id, { content: { kind: 'checklist', data: { items } } }, true)
    }

    const toggle = (id: string) => {
        commit(data.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))
    }
    const rename = (id: string, text: string) => {
        commit(data.items.map((it) => (it.id === id ? { ...it, text } : it)))
    }
    const remove = (id: string) => {
        commit(data.items.filter((it) => it.id !== id))
    }
    const add = (text: string) => {
        const t = text.trim()
        if (!t) return
        commit([...data.items, { id: uuid(), text: t, done: false }])
    }

    const total = data.items.length
    const done = data.items.filter((i) => i.done).length
    const pct = total === 0 ? 0 : Math.round((done / total) * 100)

    return (
        <div
            className="w-full h-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] flex flex-col overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {done}/{total} · {pct}%
                </div>
                <div className="flex-1 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div className="h-full bg-[var(--accent-primary)]" style={{ width: `${pct}%` }} />
                </div>
            </div>
            <div className="flex-1 overflow-auto px-2 py-1">
                {data.items.map((it) => (
                    <div key={it.id} className="group flex items-center gap-2 px-1 py-1 rounded hover:bg-[var(--bg-hover)]">
                        <input
                            type="checkbox"
                            checked={it.done}
                            onChange={() => toggle(it.id)}
                            className="accent-[var(--accent-primary)]"
                        />
                        <input
                            defaultValue={it.text}
                            onBlur={(e) => { if (e.currentTarget.value !== it.text) rename(it.id, e.currentTarget.value) }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.currentTarget.blur(); newInputRef.current?.focus() }
                            }}
                            className={`flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] ${it.done ? 'line-through opacity-60' : ''}`}
                        />
                        <button
                            type="button"
                            onClick={() => remove(it.id)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border-default)]">
                <Plus size={12} className="text-[var(--text-muted)]" />
                <input
                    ref={newInputRef}
                    placeholder="Add item…"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            add(e.currentTarget.value)
                            e.currentTarget.value = ''
                        }
                    }}
                    className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
            </div>
        </div>
    )
}

export const ChecklistBehavior: BlockBehavior = { render: Render }

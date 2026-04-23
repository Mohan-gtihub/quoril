import { memo } from 'react'
import { NodeResizer, Handle, Position } from '@xyflow/react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { behaviors } from './behaviors/registry'

type LodTier = 'full' | 'card' | 'map'

export const Block = memo(function Block({
    id,
    selected,
    data,
}: {
    id: string
    selected: boolean
    data: { blockId: string; lodTier: LodTier; recentAlpha: number; isLandmark: boolean }
}) {
    const block = useBlocksStore((s) => s.byId[id])
    if (!block) return null
    const behavior = behaviors[block.kind]
    if (!behavior) return null
    const Render = behavior.render
    const tier = data.lodTier

    const locked = (block.style as any)?.locked === true
    const pulsing = (block.style as any)?.pulsing === true

    const wrapStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        boxShadow: pulsing
            ? '0 0 0 3px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.4)'
            : data.isLandmark ? '0 0 0 2px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)' : undefined,
        outline: data.recentAlpha > 0
            ? `1px solid rgba(99, 102, 241, ${Math.min(0.4, data.recentAlpha * 0.4)})`
            : undefined,
        borderRadius: 8,
        opacity: locked ? 0.55 : undefined,
        filter: locked ? 'grayscale(0.4)' : undefined,
    }

    if (tier === 'map') {
        const color = block.kind === 'idea' ? '#fde68a'
            : block.kind === 'text' ? '#cbd5e1'
            : block.kind === 'image' ? '#60a5fa'
            : block.kind === 'video' ? '#f87171'
            : block.kind === 'link' ? '#a78bfa'
            : block.kind === 'checklist' ? '#34d399'
            : '#f472b6'
        return (
            <div style={{ ...wrapStyle, background: color, opacity: 0.85, borderRadius: 4 }} />
        )
    }

    if (tier === 'card') {
        return (
            <div style={wrapStyle} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-2 overflow-hidden">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{block.kind}</div>
                <div className="text-xs text-[var(--text-primary)] line-clamp-3 mt-1">
                    {block.content.kind === 'idea' ? block.content.data.text
                        : block.content.kind === 'link' ? (block.content.data.title ?? block.content.data.url)
                        : block.content.kind === 'checklist' ? `${block.content.data.items.length} items`
                        : block.kind}
                </div>
            </div>
        )
    }

    const keepAspect = block.kind === 'image'
        && block.content.kind === 'image'
        && !(block.content.data as any).freeResize
        && !!(block.content.data as any).natW
    // Videos resize freely; the iframe letterboxes itself. Locking aspect made
    // the resize feel stuck since only corner handles worked.

    return (
        <div style={wrapStyle}>
            <NodeResizer
                isVisible={selected}
                minWidth={120}
                minHeight={80}
                keepAspectRatio={keepAspect}
                lineStyle={{ borderColor: 'var(--accent-primary)' }}
                handleStyle={{ background: 'var(--accent-primary)', borderRadius: 2, width: 8, height: 8 }}
            />
            {/* Connection handles */}
            <Handle type="source" position={Position.Right} id="r" style={{ opacity: selected ? 1 : 0, background: 'var(--accent-primary)' }} />
            <Handle type="source" position={Position.Bottom} id="b" style={{ opacity: selected ? 1 : 0, background: 'var(--accent-primary)' }} />
            <Handle type="target" position={Position.Left} id="l" style={{ opacity: selected ? 1 : 0, background: 'var(--accent-primary)' }} />
            <Handle type="target" position={Position.Top} id="t" style={{ opacity: selected ? 1 : 0, background: 'var(--accent-primary)' }} />
            <Render block={block} selected={selected} zoom={1} />
            {locked && (
                <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white pointer-events-none">🔒 waiting</div>
            )}
        </div>
    )
})

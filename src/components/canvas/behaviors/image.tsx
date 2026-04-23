import { useEffect, useState } from 'react'
import type { BlockBehavior, BlockRenderProps } from './registry'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { MoreVertical } from 'lucide-react'

function Render({ block, selected }: BlockRenderProps) {
    const data = (block.content.kind === 'image' ? block.content.data : { src: '' }) as {
        src: string
        alt?: string
        natW?: number
        natH?: number
        freeResize?: boolean
    }
    const patch = useBlocksStore((s) => s.patch)
    const [menu, setMenu] = useState(false)

    // Capture natural dimensions once (only if missing)
    useEffect(() => {
        if (!data.src || data.natW) return
        const img = new Image()
        img.onload = () => {
            const cur = useBlocksStore.getState().byId[block.id]
            if (!cur || cur.content.kind !== 'image') return
            const curData = cur.content.data as typeof data
            if (curData.natW) return
            patch(block.id, {
                content: { kind: 'image', data: { ...curData, natW: img.width, natH: img.height } },
            }, false)
        }
        img.src = data.src
    }, [data.src, data.natW, block.id, patch])

    if (!data.src) {
        return (
            <div className="w-full h-full flex items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)]">
                Drop or paste an image
            </div>
        )
    }

    return (
        <div className="w-full h-full rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border-default)] relative group">
            <img
                src={data.src}
                alt={data.alt ?? ''}
                className={`w-full h-full select-none ${data.freeResize ? 'object-cover' : 'object-contain'}`}
                draggable={false}
            />
            {selected && (
                <div className="absolute top-1 right-1 z-10" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setMenu((v) => !v)}
                        className="p-1 rounded bg-black/60 hover:bg-black/80 text-white"
                        title="Options"
                    >
                        <MoreVertical size={12} />
                    </button>
                    {menu && (
                        <div className="absolute top-7 right-0 w-40 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-xl text-xs overflow-hidden">
                            <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] flex items-center justify-between"
                                onClick={() => {
                                    patch(block.id, {
                                        content: { kind: 'image', data: { ...data, freeResize: !data.freeResize } },
                                    }, true)
                                    setMenu(false)
                                }}
                            >
                                <span>Free resize</span>
                                <span className={`w-7 h-3.5 rounded-full relative transition-colors ${data.freeResize ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-hover)]'}`}>
                                    <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${data.freeResize ? 'left-4' : 'left-0.5'}`} />
                                </span>
                            </button>
                            {data.natW && data.natH && (
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)]"
                                    onClick={() => {
                                        const maxW = 500
                                        const w = Math.min(maxW, data.natW!)
                                        const h = w * (data.natH! / data.natW!)
                                        useBlocksStore.getState().upsert({ ...block, w, h }, true)
                                        setMenu(false)
                                    }}
                                >
                                    Reset to natural size
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export const ImageBehavior: BlockBehavior = { render: Render }

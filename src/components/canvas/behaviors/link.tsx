import { useEffect, useRef } from 'react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { parseYouTubeId } from '../hooks/useSmartPaste'
import type { BlockBehavior, BlockRenderProps } from './registry'
import type { LinkContent } from '@/types/canvas'
import { ExternalLink } from 'lucide-react'

function domain(u: string) {
    try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u }
}

function Render({ block }: BlockRenderProps) {
    const data = (block.content.kind === 'link' ? block.content.data : { url: '' }) as LinkContent
    const patch = useBlocksStore((s) => s.patch)
    const fetchedRef = useRef(false)
    const upgradedRef = useRef(false)

    // Auto-upgrade: if this link is actually a YouTube URL, morph into a VideoBlock.
    // Why: multiple entry points (drag-drop, legacy paste, existing persisted blocks) can
    //      land a YouTube URL as a LinkBlock. Detect and repair on render.
    useEffect(() => {
        if (upgradedRef.current) return
        if (!data.url) return
        const ytId = parseYouTubeId(data.url)
        if (!ytId) return
        upgradedRef.current = true
        patch(block.id, {
            kind: 'video',
            w: Math.max(320, block.w),
            h: Math.max(200, block.h),
            content: { kind: 'video', data: { provider: 'youtube', videoId: ytId } },
        } as any, true)
    }, [block.id, block.w, block.h, data.url, patch])

    useEffect(() => {
        if (!data.url) return
        if (data.title || data.description) return
        if (fetchedRef.current) return
        // Skip unfurl if we're about to upgrade to video
        if (parseYouTubeId(data.url)) return
        fetchedRef.current = true
        window.electronAPI.canvas.unfurlLink(data.url)
            .then((res) => {
                patch(block.id, {
                    content: {
                        kind: 'link',
                        data: {
                            url: data.url,
                            title: res.title,
                            description: res.description,
                            image: res.image,
                            siteName: res.siteName,
                            fetchedAt: res.fetchedAt,
                        },
                    },
                }, true)
            })
            .catch(() => { fetchedRef.current = false })
    }, [block.id, data.url, data.title, data.description, patch])

    const onOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (data.url) window.electronAPI.file.openExternal(data.url)
    }

    if (!data.url) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)] rounded-lg border border-dashed border-[var(--border-default)]">
                No URL
            </div>
        )
    }

    const loading = !data.title && !data.description && !data.fetchedAt

    return (
        <button
            type="button"
            onDoubleClick={onOpen}
            className="w-full h-full rounded-lg overflow-hidden bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-colors flex text-left"
            title="Double-click to open"
        >
            {data.image && (
                <div className="w-1/3 min-w-[80px] max-w-[160px] bg-black/20 overflow-hidden">
                    <img src={data.image} alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
            )}
            <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wide truncate">
                    <ExternalLink size={10} />
                    <span className="truncate">{data.siteName ?? domain(data.url)}</span>
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                    {loading ? 'Fetching…' : (data.title ?? domain(data.url))}
                </div>
                {data.description && (
                    <div className="text-xs text-[var(--text-muted)] line-clamp-2">{data.description}</div>
                )}
            </div>
        </button>
    )
}

export const LinkBehavior: BlockBehavior = { render: Render }

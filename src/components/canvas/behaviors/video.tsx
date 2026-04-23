import { useEffect, useState } from 'react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import type { BlockBehavior, BlockRenderProps } from './registry'
import type { VideoContent } from '@/types/canvas'
import { Youtube, ExternalLink } from 'lucide-react'
import { parseYouTubeId } from '../hooks/useSmartPaste'

const titleCache: Map<string, { title: string; author?: string }> = new Map()

async function fetchTitle(videoId: string): Promise<{ title?: string; author?: string }> {
    if (titleCache.has(videoId)) return titleCache.get(videoId)!
    try {
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        if (!r.ok) return {}
        const j = await r.json() as { title?: string; author_name?: string }
        const entry = { title: j.title ?? '', author: j.author_name }
        if (entry.title) titleCache.set(videoId, entry as any)
        return entry
    } catch {
        return {}
    }
}

function Render({ block }: BlockRenderProps) {
    const data = (block.content.kind === 'video'
        ? block.content.data
        : { provider: 'youtube', videoId: '' }) as VideoContent & { title?: string; author?: string }
    const patch = useBlocksStore((s) => s.patch)
    const [urlInput, setUrlInput] = useState('')
    const [meta, setMeta] = useState<{ title?: string; author?: string }>({ title: (data as any).title, author: (data as any).author })
    // Overlay on by default so the block is draggable. Click activates playback
    // (iframe then receives events). Re-armed on block deselect so moving the block
    // after watching doesn't require an extra click.
    const [active, setActive] = useState(false)

    useEffect(() => {
        if (!data.videoId) return
        if (meta.title) return
        fetchTitle(data.videoId).then((m) => {
            if (m.title) {
                setMeta(m)
                patch(block.id, {
                    content: { kind: 'video', data: { ...data, title: m.title, author: m.author } as any },
                }, true)
            }
        })
    }, [data.videoId])

    if (!data.videoId) {
        return (
            <div
                className="w-full h-full rounded-lg bg-[var(--bg-card)] border border-dashed border-[var(--border-default)] p-3 flex flex-col gap-2 items-center justify-center"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <Youtube size={20} className="text-red-500" />
                <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const id = parseYouTubeId(urlInput.trim())
                            if (id) patch(block.id, { content: { kind: 'video', data: { provider: 'youtube', videoId: id } } }, true)
                        }
                    }}
                    placeholder="Paste YouTube URL…"
                    className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-2 py-1 outline-none text-[var(--text-primary)]"
                />
            </div>
        )
    }

    // Use youtube.com (not -nocookie) + origin param. In Electron the page origin is
    // often file:// or app:// which YouTube-nocookie treats as an invalid embed domain
    // for some videos → Error 153. Passing a well-formed https origin avoids that path.
    const embedOrigin = 'https://www.youtube.com'
    const params = new URLSearchParams({
        rel: '0',
        modestbranding: '1',
        playsinline: '1',
        origin: embedOrigin,
    })
    if (data.start) params.set('start', String(data.start))
    const src = `https://www.youtube.com/embed/${data.videoId}?${params.toString()}`
    const watchUrl = `https://www.youtube.com/watch?v=${data.videoId}`

    const posterUrl = `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`

    return (
        <div className="w-full h-full rounded-lg overflow-hidden bg-black flex flex-col border border-[var(--border-default)]">
            <div className="flex-1 min-h-0 relative">
                {active ? (
                    <iframe
                        src={`${src}&autoplay=1`}
                        title={meta.title ?? 'YouTube video'}
                        className="w-full h-full border-0 block"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                ) : (
                    <button
                        type="button"
                        className="absolute inset-0 w-full h-full p-0 m-0 border-0 cursor-pointer group"
                        onClick={(e) => { e.stopPropagation(); setActive(true) }}
                        title="Click to play"
                    >
                        <img
                            src={posterUrl}
                            alt={meta.title ?? 'YouTube video'}
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                        />
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-14 h-14 rounded-full bg-black/70 group-hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                            </span>
                        </span>
                    </button>
                )}
                {active && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActive(false) }}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] hover:bg-black/90"
                        title="Stop and allow drag"
                    >
                        Stop
                    </button>
                )}
            </div>
            <div className="px-2.5 py-1.5 bg-[var(--bg-card)] border-t border-[var(--border-default)] flex items-center gap-2">
                <Youtube size={12} className="text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {meta.title ?? 'Loading…'}
                    </div>
                    {meta.author && (
                        <div className="text-[10px] text-[var(--text-muted)] truncate">{meta.author}</div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); window.electronAPI.file.openExternal(watchUrl) }}
                    className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-muted)]"
                    title="Open on YouTube"
                >
                    <ExternalLink size={12} />
                </button>
            </div>
        </div>
    )
}

export const VideoBehavior: BlockBehavior = { render: Render }

import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { v4 as uuid } from 'uuid'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useCanvasStore } from '@/store/canvas/canvasStore'
import type { Block } from '@/types/canvas'

const URL_RE = /\bhttps?:\/\/[^\s)]+/i

export function parseYouTubeId(input: string): string | null {
    if (!input) return null
    if (/^[\w-]{11}$/.test(input)) return input
    // Try URL parse first
    try {
        const u = new URL(input)
        if (u.hostname.includes('youtu.be')) {
            const id = u.pathname.replace(/^\//, '').split('/')[0]
            if (/^[\w-]{11}$/.test(id)) return id
        }
        if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
            const v = u.searchParams.get('v')
            if (v && /^[\w-]{11}$/.test(v)) return v
            const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/)
            if (m) return m[2]
        }
    } catch { /* ignore */ }
    // Fallback regex anywhere in string
    const m =
        input.match(/[?&]v=([\w-]{11})/) ||
        input.match(/youtu\.be\/([\w-]{11})/) ||
        input.match(/\/(embed|shorts|live|v)\/([\w-]{11})/)
    if (m) return m[m.length - 1]
    return null
}

function newBase(canvasId: string, userId: string, x: number, y: number): Omit<Block, 'kind' | 'content' | 'w' | 'h'> {
    const now = new Date().toISOString()
    return {
        id: uuid(),
        canvasId,
        userId,
        x, y,
        z: 0,
        createdAt: now,
        updatedAt: now,
    } as any
}

export function useSmartPaste(canvasId: string, userId: string) {
    const rf = useReactFlow()

    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName))) return

            const dt = e.clipboardData
            if (!dt) return

            const selection = useCanvasStore.getState().selectedBlockIds
            if (selection.length > 0) return

            const center = rf.screenToFlowPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
            })

            // Image paste
            const imgItem = Array.from(dt.items).find((i) => i.type.startsWith('image/'))
            if (imgItem) {
                const file = imgItem.getAsFile()
                if (file) {
                    e.preventDefault()
                    const reader = new FileReader()
                    reader.onload = () => {
                        const src = String(reader.result || '')
                        const img = new Image()
                        img.onload = () => {
                            const maxW = 400
                            const ratio = img.width / img.height || 1
                            const w = Math.min(maxW, img.width || maxW)
                            const h = w / ratio
                            useBlocksStore.getState().upsert({
                                ...(newBase(canvasId, userId, center.x - w / 2, center.y - h / 2) as any),
                                kind: 'image',
                                w, h,
                                content: { kind: 'image', data: { src, natW: img.width, natH: img.height } },
                            } as Block, true)
                        }
                        img.onerror = () => {
                            useBlocksStore.getState().upsert({
                                ...(newBase(canvasId, userId, center.x - 150, center.y - 100) as any),
                                kind: 'image',
                                w: 300, h: 200,
                                content: { kind: 'image', data: { src } },
                            } as Block, true)
                        }
                        img.src = src
                    }
                    reader.readAsDataURL(file)
                    return
                }
            }

            const text = dt.getData('text/plain').trim()
            if (!text) return

            // Find a URL anywhere in the pasted text
            const urlMatch = text.match(URL_RE)
            const url = urlMatch ? urlMatch[0] : null
            const onlyUrl = url && text === url

            if (url) {
                // YouTube detection on any URL encountered
                const ytId = parseYouTubeId(url)
                if (ytId) {
                    e.preventDefault()
                    useBlocksStore.getState().upsert({
                        ...(newBase(canvasId, userId, center.x - 160, center.y - 100) as any),
                        kind: 'video',
                        w: 320, h: 200,
                        content: { kind: 'video', data: { provider: 'youtube', videoId: ytId } },
                    } as Block, true)
                    return
                }
                if (onlyUrl) {
                    e.preventDefault()
                    useBlocksStore.getState().upsert({
                        ...(newBase(canvasId, userId, center.x - 160, center.y - 50) as any),
                        kind: 'link',
                        w: 320, h: 120,
                        content: { kind: 'link', data: { url } },
                    } as Block, true)
                    return
                }
            }

            e.preventDefault()
            useBlocksStore.getState().upsert({
                ...(newBase(canvasId, userId, center.x - 140, center.y - 80) as any),
                kind: 'text',
                w: 280, h: 160,
                content: { kind: 'text', data: { doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } } },
            } as Block, true)
        }

        window.addEventListener('paste', onPaste)
        return () => window.removeEventListener('paste', onPaste)
    }, [canvasId, userId, rf])
}

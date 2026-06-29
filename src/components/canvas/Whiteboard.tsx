import { useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { platform } from '@/services/platform'
import { useSettingsStore } from '@/store/settingsStore'

// The whole Excalidraw scene is stored as a single "block" row per canvas, so we
// reuse the existing canvas/blocks backend (SQLite on desktop, Supabase on web)
// with zero schema changes. The block id is derived from the canvas id so every
// save overwrites the same row.
const SCENE_KIND = 'excalidraw'
const sceneBlockId = (canvasId: string) => `${canvasId}:scene`

const LIGHT_THEMES = new Set(['daylight', 'light'])

type SceneData = {
    elements?: readonly unknown[]
    appState?: Record<string, unknown>
    files?: Record<string, unknown>
}

// appState carries transient/runtime keys (collaborators, width/height, offsets)
// that should not be persisted. Keep only what restores the visual scene.
const TRANSIENT_KEYS = ['collaborators', 'width', 'height', 'offsetTop', 'offsetLeft']
function sanitizeAppState(appState: Record<string, unknown> = {}): Record<string, unknown> {
    const rest: Record<string, unknown> = { ...appState }
    for (const k of TRANSIENT_KEYS) delete rest[k]
    return rest
}

export function Whiteboard({ canvasId, userId }: { canvasId: string; userId: string }) {
    const themeName = useSettingsStore((s) => s.theme)
    const theme = LIGHT_THEMES.has(themeName) ? 'light' : 'dark'

    const [initialData, setInitialData] = useState<SceneData | null>(null)
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pending = useRef<SceneData | null>(null)

    // Load the saved scene for this canvas.
    useEffect(() => {
        let cancelled = false
        setInitialData(null)
        ;(async () => {
            const blocks = (await platform.canvas.listBlocks(canvasId)) as any[]
            if (cancelled) return
            const block = blocks.find((b) => b.id === sceneBlockId(canvasId))
            const scene = (block?.content?.data ?? {}) as SceneData
            setInitialData({
                elements: (scene.elements as any) ?? [],
                appState: scene.appState ?? {},
                files: scene.files ?? {},
            })
        })()
        return () => {
            cancelled = true
        }
    }, [canvasId])

    // Flush any pending save when switching canvases or unmounting.
    const flush = useRef<() => void>(() => {})
    flush.current = () => {
        if (!pending.current) return
        const data = pending.current
        pending.current = null
        if (saveTimer.current) {
            clearTimeout(saveTimer.current)
            saveTimer.current = null
        }
        void platform.canvas.upsertBlock({
            id: sceneBlockId(canvasId),
            canvasId,
            userId,
            kind: SCENE_KIND,
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            content: { kind: SCENE_KIND, data },
        })
    }

    useEffect(() => {
        const onBeforeUnload = () => flush.current()
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload)
            flush.current()
        }
    }, [canvasId])

    // Autosave: debounce changes ~1.5s after the user stops editing.
    const onChange = (
        elements: readonly unknown[],
        appState: Record<string, unknown>,
        files: Record<string, unknown>,
    ) => {
        pending.current = { elements, appState: sanitizeAppState(appState), files }
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => flush.current(), 1500)
    }

    if (!initialData) return null

    return (
        <div className="w-full h-full">
            <Excalidraw
                key={canvasId}
                theme={theme}
                initialData={initialData as any}
                onChange={onChange as any}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveToActiveFile: false,
                        export: { saveFileToDisk: true },
                    },
                }}
            />
        </div>
    )
}

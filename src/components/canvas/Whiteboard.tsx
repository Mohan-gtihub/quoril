import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Excalidraw, MainMenu, serializeAsJSON } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { FileJson2 } from 'lucide-react'
import { platform } from '@/services/platform'
import { supabase } from '@/services/supabase'
import { useSettingsStore } from '@/store/settingsStore'

// Minimal slice of Excalidraw's imperative API — just what we need to read the
// current scene for the "Export as JSON" action. Avoids importing the full types.
type ExcalidrawAPI = {
    getSceneElements: () => readonly unknown[]
    getAppState: () => Record<string, unknown>
    getFiles: () => Record<string, unknown>
}

// The whole Excalidraw scene is stored as a single "block" row per canvas, so we
// reuse the existing canvas/blocks backend (SQLite on desktop, Supabase on web)
// with zero schema changes.
const SCENE_KIND = 'excalidraw'
// One scene block per canvas. Reuse the canvas's UUID as the block id so it stays
// deterministic AND is a valid UUID for the cloud `blocks.id` column (required for sync).
const sceneBlockId = (canvasId: string) => canvasId
// Earlier builds stored the scene under this non-UUID id. We migrate it to the new
// id on load so existing whiteboards aren't lost (and so they become sync-eligible).
const legacySceneBlockId = (canvasId: string) => `${canvasId}:scene`

const LIGHT_THEMES = new Set(['daylight', 'light'])

// After a local save, ignore realtime echoes of our own write for this long (covers
// the 10s desktop push interval + network latency) so the editor isn't disrupted.
const SELF_ECHO_MS = 13000

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

export function Whiteboard({
    canvasId,
    userId,
    renderTopRight,
}: {
    canvasId: string
    userId: string
    // Rendered inside Excalidraw's top-right grid cell so the centered toolbar
    // reserves space and never slides underneath these controls.
    renderTopRight?: () => ReactNode
}) {
    const themeName = useSettingsStore((s) => s.theme)
    const theme = LIGHT_THEMES.has(themeName) ? 'light' : 'dark'

    const [initialData, setInitialData] = useState<SceneData | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pending = useRef<SceneData | null>(null)
    const selfEchoUntil = useRef(0)
    const apiRef = useRef<ExcalidrawAPI | null>(null)

    // Export the entire board — elements, appState and embedded files — as a
    // portable JSON file the user can re-import or archive. Uses Excalidraw's
    // canonical serializer so the output round-trips cleanly.
    const handleExportJSON = () => {
        const api = apiRef.current
        if (!api) return
        const json = serializeAsJSON(
            api.getSceneElements() as any,
            api.getAppState() as any,
            api.getFiles() as any,
            'local',
        )
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `quoril-canvas-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    // Load (or reload) the saved scene for this canvas.
    useEffect(() => {
        let cancelled = false
        setInitialData(null)
        ;(async () => {
            const blocks = (await platform.canvas.listBlocks(canvasId)) as any[]
            if (cancelled) return
            const current = blocks.find((b) => b.id === sceneBlockId(canvasId))
            const legacy = blocks.find((b) => b.id === legacySceneBlockId(canvasId))

            const count = (b: any) =>
                Array.isArray(b?.content?.data?.elements) ? b.content.data.elements.length : 0

            // An earlier build changed the scene id, which could leave an empty row
            // under the new id while the real work sits under the legacy id. Use
            // whichever row actually has content; if the legacy one wins, migrate it
            // onto the new id and retire the legacy row.
            let block = current
            if (legacy && count(legacy) > count(current)) {
                block = legacy
                void platform.canvas.upsertBlock({
                    id: sceneBlockId(canvasId), canvasId, userId,
                    kind: SCENE_KIND, x: 0, y: 0, w: 0, h: 0, z: 0,
                    content: { kind: SCENE_KIND, data: legacy.content.data },
                })
                void platform.canvas.softDeleteBlock(legacy.id)
            }

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
    }, [canvasId, reloadKey])

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
        selfEchoUntil.current = Date.now() + SELF_ECHO_MS
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

    // Realtime: when another device changes this whiteboard's scene in the cloud,
    // pull it down and reload. Guards avoid clobbering in-progress local edits and
    // ignore echoes of our own recent writes (which arrive via the 10s push).
    useEffect(() => {
        const blockId = sceneBlockId(canvasId)
        const channel = supabase
            .channel(`blocks:${canvasId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'blocks', filter: `canvas_id=eq.${canvasId}` },
                async () => {
                    // Don't interrupt active local editing or echo our own push.
                    if (pending.current) return
                    if (Date.now() < selfEchoUntil.current) return

                    // Re-fetch the full row (realtime payloads are size-capped; a
                    // scene with inline base64 images can exceed that) and apply.
                    const { data } = await supabase
                        .from('blocks')
                        .select('id')
                        .eq('id', blockId)
                        .is('deleted_at', null)
                        .maybeSingle()
                    if (!data) return

                    // On desktop, mirror the cloud row into local SQLite first so the
                    // reload (which reads local) sees it. dataSyncService's pull does
                    // the same via upsertFromCloud; here we just need this one row.
                    const db = (window as any).electronAPI?.db
                    if (db?.upsertFromCloud) {
                        const { data: full } = await supabase.from('blocks').select('*').eq('id', blockId).maybeSingle()
                        if (full) {
                            try { await db.upsertFromCloud('blocks', [full]) } catch { /* best-effort */ }
                        }
                    }
                    setReloadKey((k) => k + 1)
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
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
        <div className="quoril-canvas w-full h-full">
            {/* Strip the Excalidraw-branded chrome so the board reads as native
                Quoril: hide the library trigger + docked library sidebar and the
                "Excalidraw+" / help affordances that a custom MainMenu can't reach. */}
            <style>{`
                .quoril-canvas .layer-ui__wrapper__top-right .sidebar-trigger,
                .quoril-canvas .default-sidebar-trigger,
                .quoril-canvas .layer-ui__wrapper .sidebar-trigger,
                .quoril-canvas .welcome-screen-decor--menu-hint,
                .quoril-canvas .welcome-screen-decor--help-hint,
                .quoril-canvas .dropdown-menu-item--social,
                .quoril-canvas .excalidraw-plus,
                .quoril-canvas a[href*="excalidraw.com"],
                .quoril-canvas a[href*="plus.excalidraw"] {
                    display: none !important;
                }
            `}</style>
            <Excalidraw
                key={`${canvasId}:${reloadKey}`}
                theme={theme}
                initialData={initialData as any}
                onChange={onChange as any}
                excalidrawAPI={(api) => { apiRef.current = api as unknown as ExcalidrawAPI }}
                renderTopRightUI={renderTopRight ? () => <>{renderTopRight()}</> : undefined}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveToActiveFile: false,
                        export: false,
                    },
                }}
            >
                {/* Custom, branded menu — replaces Excalidraw's default items
                    (which include Socials, Help and "Excalidraw+" promos). */}
                <MainMenu>
                    <MainMenu.Item icon={<FileJson2 size={16} />} onSelect={handleExportJSON}>
                        Export as JSON
                    </MainMenu.Item>
                    <MainMenu.DefaultItems.SaveAsImage />
                    <MainMenu.Separator />
                    <MainMenu.DefaultItems.ChangeCanvasBackground />
                    <MainMenu.DefaultItems.ClearCanvas />
                </MainMenu>
            </Excalidraw>
        </div>
    )
}

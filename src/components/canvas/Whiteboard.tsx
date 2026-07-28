import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ReactNode,
} from 'react'
import {
    CaptureUpdateAction,
    Excalidraw as DrawingSurface,
    MainMenu,
    exportToBlob,
    reconcileElements,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import {
    CheckCircle2,
    HelpCircle,
    Download,
    FileDown,
    FileUp,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Wifi,
    WifiOff,
    X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { platform } from '@/services/platform'
import { supabase } from '@/services/supabase'
import { useSettingsStore } from '@/store/settingsStore'
import {
    createQuorilCanvasDocument,
    dedupeParticipants,
    diffBinaryFiles,
    diffSceneElements,
    fitScenePatchToBroadcast,
    indexBinaryFiles,
    indexSceneElements,
    parseQuorilCanvasDocument,
    participantColor,
    participantInitials,
    sanitizeCanvasAppState,
    type CanvasBinaryFiles,
    type CanvasParticipant,
    type CanvasSceneElement,
    type DurableSceneData,
    type ScenePatchPayload,
} from './canvasCollaboration'

type DrawingAPI = {
    getSceneElements: () => readonly CanvasSceneElement[]
    getSceneElementsIncludingDeleted: () => readonly CanvasSceneElement[]
    getAppState: () => Record<string, unknown>
    getFiles: () => CanvasBinaryFiles
    addFiles: (files: any[]) => void
    updateScene: (scene: {
        elements?: readonly CanvasSceneElement[]
        appState?: Record<string, unknown>
        collaborators?: Map<string, unknown>
        captureUpdate?: string
    }) => void
}

type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'unavailable'
type SaveState = 'saved' | 'unsaved' | 'saving' | 'offline' | 'error'

type SceneData = {
    elements?: readonly CanvasSceneElement[]
    appState?: Record<string, unknown>
    files?: CanvasBinaryFiles
}

type CursorPayload = {
    canvasId: string
    senderId: string
    pointer: { x: number; y: number; tool: 'pointer' | 'laser' }
    button: 'down' | 'up'
    selectedElementIds?: Record<string, boolean>
}

const SCENE_KIND = 'excalidraw' // Legacy storage discriminator; never shown in Quoril UI.
const sceneBlockId = (canvasId: string) => canvasId
const legacySceneBlockId = (canvasId: string) => `${canvasId}:scene`
const LIGHT_THEMES = new Set(['daylight', 'light'])
const PATCH_THROTTLE_MS = 250
const CURSOR_THROTTLE_MS = 150
const SNAPSHOT_IDLE_MS = 1200
const SNAPSHOT_MAX_WAIT_MS = 5000
const MAX_IMPORT_BYTES = 50 * 1024 * 1024

const emptyScene = (): DurableSceneData => ({ elements: [], appState: {}, files: {} })

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
}

function safeFilename(value: string) {
    const cleaned = value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '')
    return cleaned || 'quoril-canvas'
}

function parseCloudScene(row: any): DurableSceneData | null {
    if (!row) return null
    const content = typeof row.content_json === 'string'
        ? (() => { try { return JSON.parse(row.content_json) } catch { return null } })()
        : row.content_json
    const data = content?.data
    if (!data || !Array.isArray(data.elements)) return null
    return {
        elements: data.elements,
        appState: sanitizeCanvasAppState(data.appState ?? {}),
        files: data.files ?? {},
    }
}

function getPresenceParticipants(channel: any): CanvasParticipant[] {
    const state = channel.presenceState?.() ?? {}
    const participants = Object.values(state)
        .flatMap((value) => Array.isArray(value) ? value : [])
        .filter((value): value is CanvasParticipant => Boolean(
            value && typeof value === 'object' &&
            typeof (value as CanvasParticipant).clientId === 'string' &&
            typeof (value as CanvasParticipant).userId === 'string' &&
            typeof (value as CanvasParticipant).name === 'string',
        ))
    return dedupeParticipants(participants)
}

function CanvasHelp({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="quoril-canvas-help-title"
                className="w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-[var(--border-default)] px-5 py-4">
                    <div>
                        <h2 id="quoril-canvas-help-title" className="text-base font-semibold text-[var(--text-primary)]">Canvas shortcuts</h2>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Draw, connect ideas, and work together without leaving Quoril.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close help" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"><X size={17} /></button>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                    {[
                        ['Selection', 'V or 1'],
                        ['Hand / pan', 'H or Space'],
                        ['Rectangle', 'R or 2'],
                        ['Arrow', 'A or 5'],
                        ['Draw', 'P or 7'],
                        ['Text', 'T or 8'],
                        ['Zoom in / out', '⌘ + / −'],
                        ['Undo / redo', '⌘ Z / ⇧⌘ Z'],
                    ].map(([label, shortcut]) => (
                        <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-tertiary)] px-3 py-2.5">
                            <span className="text-sm text-[var(--text-primary)]">{label}</span>
                            <kbd className="rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-[11px] text-[var(--text-muted)]">{shortcut}</kbd>
                        </div>
                    ))}
                </div>
                <div className="mx-5 mb-5 rounded-xl border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/8 px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Your work saves automatically. When teammates are online, shapes, pointers, and selections update live. Large images may take a moment while Quoril finishes saving them.
                </div>
            </div>
        </div>
    )
}

function CollaborationStatus({
    connection,
    saveState,
    participants,
    canEdit,
    onRetry,
}: {
    connection: ConnectionState
    saveState: SaveState
    participants: CanvasParticipant[]
    canEdit: boolean
    onRetry: () => void
}) {
    const connectionLabel = connection === 'live'
        ? 'Live'
        : connection === 'offline'
            ? 'Offline'
            : connection === 'unavailable'
                ? 'Sync only'
                : connection === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Connecting'
    const saveLabel = !canEdit
        ? 'View only'
        : saveState === 'saving'
            ? 'Saving'
            : saveState === 'unsaved'
                ? 'Unsaved'
                : saveState === 'offline'
                    ? 'Saved locally'
                    : saveState === 'error'
                        ? 'Save failed'
                        : 'Saved'

    return (
        <div className="flex items-center gap-2">
            {participants.length > 0 && (
                <div className="flex items-center -space-x-2" aria-label={`${participants.length} ${participants.length === 1 ? 'person' : 'people'} online`}>
                    {participants.slice(0, 4).map((participant) => (
                        participant.avatarUrl ? (
                            <img
                                key={participant.userId}
                                src={participant.avatarUrl}
                                alt={participant.name}
                                title={`${participant.name} is online`}
                                className="h-7 w-7 rounded-full border-2 border-[var(--bg-card)] object-cover"
                            />
                        ) : (
                            <span
                                key={participant.userId}
                                title={`${participant.name} is online`}
                                className="grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--bg-card)] text-[9px] font-semibold text-white"
                                style={{ backgroundColor: participant.color }}
                            >
                                {participantInitials(participant.name)}
                            </span>
                        )
                    ))}
                    {participants.length > 4 && <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-muted)]">+{participants.length - 4}</span>}
                </div>
            )}

            <button
                type="button"
                onClick={connection === 'unavailable' || connection === 'reconnecting' ? onRetry : undefined}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] shadow-sm"
                title={connection === 'unavailable' ? 'Live collaboration is unavailable. Click to retry.' : `${connectionLabel} · ${saveLabel}`}
            >
                {connection === 'live' ? <Wifi size={13} className="text-emerald-500" /> : connection === 'offline' ? <WifiOff size={13} /> : connection === 'unavailable' ? <RefreshCw size={13} /> : <Loader2 size={13} className="animate-spin" />}
                <span>{connectionLabel}</span>
                <span className="text-[var(--text-muted)]">·</span>
                {saveState === 'saving' ? <Loader2 size={12} className="animate-spin" /> : saveState === 'saved' ? <CheckCircle2 size={12} className="text-emerald-500" /> : null}
                <span>{saveLabel}</span>
            </button>
        </div>
    )
}

export function Whiteboard({
    canvasId,
    canvasTitle,
    canvasOwnerId,
    userId,
    userName,
    userAvatarUrl,
    canEdit,
    renderTopRight,
}: {
    canvasId: string
    canvasTitle: string
    canvasOwnerId: string
    userId: string
    userName: string
    userAvatarUrl?: string | null
    canEdit: boolean
    renderTopRight?: () => ReactNode
}) {
    const themeName = useSettingsStore((state) => state.theme)
    const theme = LIGHT_THEMES.has(themeName) ? 'light' : 'dark'
    const importInputRef = useRef<HTMLInputElement>(null)
    const apiRef = useRef<DrawingAPI | null>(null)
    const liveChannelRef = useRef<any>(null)
    const initialDataRef = useRef<SceneData | null>(null)
    const currentSceneRef = useRef<DurableSceneData>(emptyScene())
    const previousElementVersions = useRef<Map<string, string>>(new Map())
    const previousFileVersions = useRef<Map<string, number>>(new Map())
    const previousAppState = useRef('{}')
    const collaboratorsRef = useRef<Map<string, any>>(new Map())
    const pendingSceneRef = useRef<DurableSceneData | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const maxSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const saveInFlightRef = useRef(false)
    const flushRef = useRef<() => Promise<void>>(async () => {})
    const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const queuedElementsRef = useRef<Map<string, CanvasSceneElement>>(new Map())
    const queuedFilesRef = useRef<CanvasBinaryFiles>({})
    const queuedAppStateRef = useRef<Record<string, unknown> | undefined>(undefined)
    const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const queuedCursorRef = useRef<CursorPayload | null>(null)
    const clientIdRef = useRef(`${userId}:${crypto.randomUUID()}`)
    const liveRef = useRef(false)
    const initialChangeObservedRef = useRef(false)

    const [initialData, setInitialData] = useState<SceneData | null>(null)
    const [connection, setConnection] = useState<ConnectionState>(navigator.onLine ? 'connecting' : 'offline')
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [participants, setParticipants] = useState<CanvasParticipant[]>([])
    const [helpOpen, setHelpOpen] = useState(false)
    const [reconnectKey, setReconnectKey] = useState(0)

    const selfParticipant = useMemo<CanvasParticipant>(() => ({
        clientId: clientIdRef.current,
        userId,
        name: userName,
        ...(userAvatarUrl ? { avatarUrl: userAvatarUrl } : {}),
        color: participantColor(userId),
        onlineAt: new Date().toISOString(),
    }), [userAvatarUrl, userId, userName])

    const updateCollaborators = useCallback((nextParticipants: CanvasParticipant[]) => {
        const previous = collaboratorsRef.current
        const next = new Map<string, any>()
        for (const participant of nextParticipants) {
            if (participant.clientId === clientIdRef.current) continue
            const existing = previous.get(participant.clientId) ?? {}
            next.set(participant.clientId, {
                ...existing,
                id: participant.userId,
                socketId: participant.clientId,
                username: participant.name,
                avatarUrl: participant.avatarUrl,
                color: { background: participant.color, stroke: participant.color },
            })
        }
        collaboratorsRef.current = next
        apiRef.current?.updateScene({ collaborators: next, captureUpdate: CaptureUpdateAction.NEVER })
    }, [])

    const applyRemoteScene = useCallback((scene: DurableSceneData) => {
        const api = apiRef.current
        if (!api) return
        const incomingFiles = Object.values(scene.files ?? {})
        if (incomingFiles.length) api.addFiles(incomingFiles as any[])

        const local = api.getSceneElementsIncludingDeleted()
        const merged = reconcileElements(local as any, scene.elements as any, api.getAppState() as any) as unknown as CanvasSceneElement[]
        const durableAppState = sanitizeCanvasAppState(scene.appState)

        previousElementVersions.current = indexSceneElements(merged)
        previousFileVersions.current = indexBinaryFiles({ ...api.getFiles(), ...scene.files })
        previousAppState.current = JSON.stringify(durableAppState)
        const mergedScene = {
            elements: merged,
            appState: durableAppState,
            files: { ...api.getFiles(), ...scene.files },
        }
        currentSceneRef.current = mergedScene
        // If this client also has an unsaved local edit, fold the remote change
        // into that pending snapshot so a later save cannot erase a teammate's
        // just-arrived work.
        if (pendingSceneRef.current) pendingSceneRef.current = mergedScene

        api.updateScene({
            elements: merged,
            ...(Object.keys(durableAppState).length ? { appState: durableAppState } : {}),
            collaborators: collaboratorsRef.current,
            captureUpdate: CaptureUpdateAction.NEVER,
        })
    }, [])

    const fetchAndApplyCloudSnapshot = useCallback(async () => {
        const { data, error } = await (supabase.from('blocks') as any)
            .select('*')
            .eq('id', sceneBlockId(canvasId))
            .is('deleted_at', null)
            .maybeSingle()
        if (error || !data) return
        const scene = parseCloudScene(data)
        if (scene) applyRemoteScene(scene)

        const localDb = (window as any).electronAPI?.db
        if (localDb?.upsertFromCloud) {
            try { await localDb.upsertFromCloud('blocks', [data]) } catch { /* local cache is best-effort */ }
        }
    }, [applyRemoteScene, canvasId])

    // Load the freshest accessible cloud snapshot first, then use the platform
    // cache. This fixes missed edits for desktop owners returning after being offline.
    useEffect(() => {
        let cancelled = false
        setInitialData(null)
        initialDataRef.current = null
        initialChangeObservedRef.current = false

        ;(async () => {
            const localDb = (window as any).electronAPI?.db
            if (localDb?.upsertFromCloud && navigator.onLine) {
                const { data } = await (supabase.from('blocks') as any)
                    .select('*')
                    .eq('id', sceneBlockId(canvasId))
                    .is('deleted_at', null)
                    .maybeSingle()
                if (data) {
                    try { await localDb.upsertFromCloud('blocks', [data]) } catch { /* use local copy */ }
                }
            }

            const blocks = (await platform.canvas.listBlocks(canvasId)) as any[]
            if (cancelled) return
            const current = blocks.find((block) => block.id === sceneBlockId(canvasId))
            const legacy = blocks.find((block) => block.id === legacySceneBlockId(canvasId))
            const count = (block: any) => Array.isArray(block?.content?.data?.elements) ? block.content.data.elements.length : 0

            let block = current
            if (legacy && count(legacy) > count(current)) {
                block = legacy
                await platform.canvas.upsertBlock({
                    id: sceneBlockId(canvasId), canvasId, userId: canvasOwnerId,
                    kind: SCENE_KIND, x: 0, y: 0, w: 0, h: 0, z: 0,
                    content: { kind: SCENE_KIND, data: legacy.content.data },
                })
                await platform.canvas.softDeleteBlock(legacy.id)
            }

            const raw = (block?.content?.data ?? {}) as SceneData
            const scene: DurableSceneData = {
                elements: raw.elements ?? [],
                appState: sanitizeCanvasAppState(raw.appState ?? {}),
                files: raw.files ?? {},
            }
            previousElementVersions.current = indexSceneElements(scene.elements)
            previousFileVersions.current = indexBinaryFiles(scene.files)
            previousAppState.current = JSON.stringify(scene.appState)
            currentSceneRef.current = scene
            initialDataRef.current = scene
            setInitialData(scene)
        })().catch((error) => {
            console.error('[Canvas] load failed:', error)
            if (!cancelled) {
                const scene = emptyScene()
                initialDataRef.current = scene
                setInitialData(scene)
                setSaveState('error')
            }
        })

        return () => { cancelled = true }
    }, [canvasId, canvasOwnerId])

    const persistSnapshot = useCallback(async () => {
        if (saveInFlightRef.current || !pendingSceneRef.current || !canEdit) return
        const scene = pendingSceneRef.current
        pendingSceneRef.current = null
        saveInFlightRef.current = true
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        if (maxSaveTimerRef.current) clearTimeout(maxSaveTimerRef.current)
        saveTimerRef.current = null
        maxSaveTimerRef.current = null
        setSaveState('saving')

        const now = new Date().toISOString()
        const block = {
            id: sceneBlockId(canvasId), canvasId, userId: canvasOwnerId,
            kind: SCENE_KIND, x: 0, y: 0, w: 0, h: 0, z: 0,
            content: { kind: SCENE_KIND, data: scene },
        }

        try {
            await platform.canvas.upsertBlock(block)

            // Desktop writes are local-first. Push the canvas snapshot directly so
            // collaborators do not wait for the general 10-second sync cycle.
            if ((window as any).electronAPI?.db && navigator.onLine) {
                const { error } = await (supabase.from('blocks') as any).upsert({
                    id: block.id,
                    canvas_id: canvasId,
                    user_id: canvasOwnerId,
                    kind: SCENE_KIND,
                    x: 0, y: 0, w: 0, h: 0, z: 0, rotation: 0,
                    content_json: block.content,
                    last_touched_at: now,
                    updated_at: now,
                    deleted_at: null,
                }, { onConflict: 'id' })
                if (error) throw error
            }

            setSaveState(navigator.onLine ? 'saved' : 'offline')
        } catch (error) {
            console.error('[Canvas] save failed:', error)
            pendingSceneRef.current = scene
            setSaveState(navigator.onLine ? 'error' : 'offline')
        } finally {
            saveInFlightRef.current = false
            if (pendingSceneRef.current) {
                saveTimerRef.current = setTimeout(() => void flushRef.current(), SNAPSHOT_IDLE_MS)
            }
        }
    }, [canEdit, canvasId, canvasOwnerId])
    flushRef.current = persistSnapshot

    const scheduleSnapshot = useCallback((scene: DurableSceneData, immediate = false) => {
        pendingSceneRef.current = scene
        setSaveState('unsaved')
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => void flushRef.current(), immediate ? 0 : SNAPSHOT_IDLE_MS)
        if (!maxSaveTimerRef.current) {
            maxSaveTimerRef.current = setTimeout(() => void flushRef.current(), SNAPSHOT_MAX_WAIT_MS)
        }
    }, [])

    const flushQueuedPatch = useCallback(async () => {
        patchTimerRef.current = null
        const channel = liveChannelRef.current
        const elements = [...queuedElementsRef.current.values()]
        const files = queuedFilesRef.current
        const appState = queuedAppStateRef.current
        queuedElementsRef.current.clear()
        queuedFilesRef.current = {}
        queuedAppStateRef.current = undefined
        if (!channel || !liveRef.current || (!elements.length && !Object.keys(files).length && !appState)) return

        const rawPayload: ScenePatchPayload = {
            canvasId,
            senderId: clientIdRef.current,
            sentAt: Date.now(),
            elements,
            ...(Object.keys(files).length ? { files } : {}),
            ...(appState ? { appState } : {}),
        }
        const fitted = fitScenePatchToBroadcast(rawPayload)
        if (fitted.needsSnapshot) void flushRef.current()
        if (!fitted.payload) return

        const result = await channel.send({ type: 'broadcast', event: 'scene-patch', payload: fitted.payload })
        if (result !== 'ok') setConnection(navigator.onLine ? 'reconnecting' : 'offline')
    }, [canvasId])

    const queuePatch = useCallback((
        elements: CanvasSceneElement[],
        files: CanvasBinaryFiles,
        appState?: Record<string, unknown>,
    ) => {
        for (const element of elements) queuedElementsRef.current.set(element.id, element)
        Object.assign(queuedFilesRef.current, files)
        if (appState) queuedAppStateRef.current = appState
        if (!patchTimerRef.current) patchTimerRef.current = setTimeout(() => void flushQueuedPatch(), PATCH_THROTTLE_MS)
    }, [flushQueuedPatch])

    const onChange = useCallback((
        elements: readonly CanvasSceneElement[],
        appState: Record<string, unknown>,
        files: CanvasBinaryFiles,
    ) => {
        const changedElements = diffSceneElements(previousElementVersions.current, elements)
        const changedFiles = diffBinaryFiles(previousFileVersions.current, files)
        const durableAppState = sanitizeCanvasAppState(appState)
        const durableAppStateKey = JSON.stringify(durableAppState)
        const appStateChanged = durableAppStateKey !== previousAppState.current

        previousElementVersions.current = indexSceneElements(elements)
        previousFileVersions.current = indexBinaryFiles(files)
        previousAppState.current = durableAppStateKey
        const scene = { elements, appState: durableAppState, files }
        currentSceneRef.current = scene

        // The drawing engine emits once while hydrating initialData. Treat that
        // as initialization so opening an unchanged canvas never flashes
        // “Unsaved” or performs a needless snapshot write.
        if (!initialChangeObservedRef.current) {
            initialChangeObservedRef.current = true
            return
        }

        if (!canEdit || (!changedElements.length && !Object.keys(changedFiles).length && !appStateChanged)) return
        scheduleSnapshot(scene)
        queuePatch(changedElements, changedFiles, appStateChanged ? durableAppState : undefined)
    }, [canEdit, queuePatch, scheduleSnapshot])

    const applyScenePatch = useCallback((payload: ScenePatchPayload) => {
        if (!payload || payload.canvasId !== canvasId || payload.senderId === clientIdRef.current || !Array.isArray(payload.elements)) return
        const api = apiRef.current
        if (!api) return
        const files = payload.files ?? {}
        if (Object.keys(files).length) api.addFiles(Object.values(files) as any[])
        const local = api.getSceneElementsIncludingDeleted()
        const merged = reconcileElements(local as any, payload.elements as any, api.getAppState() as any) as unknown as CanvasSceneElement[]
        const appState = payload.appState ? sanitizeCanvasAppState(payload.appState) : sanitizeCanvasAppState(api.getAppState())

        previousElementVersions.current = indexSceneElements(merged)
        previousFileVersions.current = indexBinaryFiles({ ...api.getFiles(), ...files })
        previousAppState.current = JSON.stringify(appState)
        const mergedScene = { elements: merged, appState, files: { ...api.getFiles(), ...files } }
        currentSceneRef.current = mergedScene
        if (pendingSceneRef.current) pendingSceneRef.current = mergedScene
        api.updateScene({
            elements: merged,
            ...(payload.appState ? { appState } : {}),
            collaborators: collaboratorsRef.current,
            captureUpdate: CaptureUpdateAction.NEVER,
        })
    }, [canvasId])

    // Low-frequency database snapshots are the durable fallback for reconnects,
    // oversized patches, and clients that briefly miss a broadcast.
    useEffect(() => {
        const channel = supabase
            .channel(`canvas-snapshot:${canvasId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'blocks', filter: `canvas_id=eq.${canvasId}`,
            }, () => { void fetchAndApplyCloudSnapshot() })
            .subscribe()
        return () => { void supabase.removeChannel(channel) }
    }, [canvasId, fetchAndApplyCloudSnapshot])

    // Private Broadcast + Presence channel. If the authorization migration has
    // not been deployed, snapshots continue to sync and the UI exposes a retry.
    useEffect(() => {
        if (!navigator.onLine) {
            setConnection('offline')
            return
        }
        let cancelled = false
        setConnection('connecting')
        liveRef.current = false
        void supabase.realtime.setAuth()

        const channel = supabase.channel(`canvas:${canvasId}`, {
            config: {
                private: true,
                broadcast: { self: false, ack: false },
                presence: { key: clientIdRef.current },
            },
        })
        liveChannelRef.current = channel

        channel
            .on('broadcast', { event: 'scene-patch' }, ({ payload }: any) => applyScenePatch(payload))
            .on('broadcast', { event: 'cursor' }, ({ payload }: { payload: CursorPayload }) => {
                if (!payload || payload.canvasId !== canvasId || payload.senderId === clientIdRef.current) return
                const existing = collaboratorsRef.current.get(payload.senderId) ?? { socketId: payload.senderId }
                const next = new Map(collaboratorsRef.current)
                next.set(payload.senderId, {
                    ...existing,
                    pointer: payload.pointer,
                    button: payload.button,
                    selectedElementIds: payload.selectedElementIds ?? {},
                })
                collaboratorsRef.current = next
                apiRef.current?.updateScene({ collaborators: next, captureUpdate: CaptureUpdateAction.NEVER })
            })
            .on('presence', { event: 'sync' }, () => {
                const next = getPresenceParticipants(channel)
                setParticipants(next)
                updateCollaborators(next)
            })
            .subscribe(async (status: string) => {
                if (cancelled) return
                if (status === 'SUBSCRIBED') {
                    liveRef.current = true
                    setConnection('live')
                    await channel.track(selfParticipant)
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    liveRef.current = false
                    setConnection(navigator.onLine ? 'unavailable' : 'offline')
                } else if (status === 'CLOSED') {
                    liveRef.current = false
                    setConnection(navigator.onLine ? 'reconnecting' : 'offline')
                }
            })

        return () => {
            cancelled = true
            liveRef.current = false
            liveChannelRef.current = null
            setParticipants([])
            collaboratorsRef.current = new Map()
            void channel.untrack().catch(() => {})
            void supabase.removeChannel(channel)
        }
    }, [applyScenePatch, canvasId, reconnectKey, selfParticipant, updateCollaborators])

    useEffect(() => {
        const onOnline = () => {
            setConnection('reconnecting')
            setReconnectKey((value) => value + 1)
            if (pendingSceneRef.current) void flushRef.current()
            void fetchAndApplyCloudSnapshot()
        }
        const onOffline = () => {
            liveRef.current = false
            setConnection('offline')
            if (canEdit) setSaveState('offline')
        }
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => {
            window.removeEventListener('online', onOnline)
            window.removeEventListener('offline', onOffline)
        }
    }, [canEdit, fetchAndApplyCloudSnapshot])

    useEffect(() => {
        const onBeforeUnload = () => { void flushRef.current() }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload)
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            if (maxSaveTimerRef.current) clearTimeout(maxSaveTimerRef.current)
            if (patchTimerRef.current) clearTimeout(patchTimerRef.current)
            if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
            void flushRef.current()
        }
    }, [canvasId])

    // Replace the dependency's help/command shortcuts with Quoril-owned UX.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return
            const commandPalette = (event.metaKey || event.ctrlKey) && (event.key === '/' || (event.shiftKey && event.key.toLowerCase() === 'p'))
            if (event.key === '?' || commandPalette) {
                event.preventDefault()
                event.stopImmediatePropagation()
                setHelpOpen(true)
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [])

    const onPointerUpdate = useCallback((payload: {
        pointer: CursorPayload['pointer']
        button: CursorPayload['button']
    }) => {
        const api = apiRef.current
        queuedCursorRef.current = {
            canvasId,
            senderId: clientIdRef.current,
            pointer: payload.pointer,
            button: payload.button,
            selectedElementIds: api?.getAppState().selectedElementIds as Record<string, boolean> | undefined,
        }
        if (cursorTimerRef.current) return
        cursorTimerRef.current = setTimeout(async () => {
            cursorTimerRef.current = null
            const channel = liveChannelRef.current
            const cursor = queuedCursorRef.current
            queuedCursorRef.current = null
            if (!channel || !cursor || !liveRef.current) return
            await channel.send({ type: 'broadcast', event: 'cursor', payload: cursor })
        }, CURSOR_THROTTLE_MS)
    }, [canvasId])

    const handleExportDocument = useCallback(() => {
        const api = apiRef.current
        if (!api) return
        const document = createQuorilCanvasDocument({
            elements: api.getSceneElementsIncludingDeleted(),
            appState: api.getAppState(),
            files: api.getFiles(),
        })
        downloadBlob(
            new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
            `${safeFilename(canvasTitle)}.quoril`,
        )
        toast.success('Quoril canvas exported')
    }, [canvasTitle])

    const handleExportPNG = useCallback(async () => {
        const api = apiRef.current
        if (!api) return
        const elements = api.getSceneElements()
        if (!elements.length) {
            toast.error('Add something to the canvas before exporting')
            return
        }
        try {
            const appState = api.getAppState()
            const blob = await exportToBlob({
                elements: elements as any,
                files: api.getFiles() as any,
                appState: {
                    ...sanitizeCanvasAppState(appState),
                    exportBackground: true,
                    exportEmbedScene: false,
                    exportWithDarkMode: theme === 'dark',
                } as any,
                mimeType: 'image/png',
            })
            downloadBlob(blob, `${safeFilename(canvasTitle)}.png`)
            toast.success('PNG exported')
        } catch (error) {
            console.error('[Canvas] export failed:', error)
            toast.error('Could not export this canvas')
        }
    }, [canvasTitle, theme])

    const handleImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (!canEdit) {
            toast.error('You only have view access to this canvas')
            return
        }
        if (file.size > MAX_IMPORT_BYTES) {
            toast.error('Canvas files must be smaller than 50 MB')
            return
        }
        try {
            const scene = parseQuorilCanvasDocument(JSON.parse(await file.text()))
            const api = apiRef.current
            if (!api) return
            const binaryFiles = Object.values(scene.files)
            if (binaryFiles.length) api.addFiles(binaryFiles as any[])
            api.updateScene({
                elements: scene.elements,
                appState: scene.appState,
                captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            })
            scheduleSnapshot(scene, true)
            queuePatch([...scene.elements], scene.files, scene.appState)
            toast.success('Canvas imported')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not import this canvas')
        }
    }, [canEdit, queuePatch, scheduleSnapshot])

    if (!initialData) {
        return (
            <div className="grid h-full w-full place-items-center bg-[var(--bg-primary)]">
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" /> Opening canvas…</div>
            </div>
        )
    }

    return (
        <div className="quoril-canvas relative h-full w-full overflow-hidden">
            <style>{`
                .quoril-canvas .layer-ui__wrapper__top-right .sidebar-trigger,
                .quoril-canvas .default-sidebar-trigger,
                .quoril-canvas .layer-ui__wrapper .sidebar-trigger,
                .quoril-canvas .welcome-screen-decor--menu-hint,
                .quoril-canvas .welcome-screen-decor--help-hint,
                .quoril-canvas .App-toolbar__extra-tools-trigger,
                .quoril-canvas .help-icon,
                body .excalidraw-plus,
                body .dropdown-menu-item--social,
                body a[href*="excalidraw"],
                body a[href*="plus.excalidraw"] {
                    display: none !important;
                }
            `}</style>

            <input ref={importInputRef} type="file" accept=".quoril,.json,application/json" onChange={handleImport} className="hidden" />

            <DrawingSurface
                key={canvasId}
                name={canvasTitle}
                theme={theme}
                initialData={initialData as any}
                onChange={onChange as any}
                onPointerUpdate={onPointerUpdate as any}
                isCollaborating={connection === 'live' && participants.length > 1}
                viewModeEnabled={!canEdit}
                aiEnabled={false}
                handleKeyboardGlobally={false}
                excalidrawAPI={(api) => { apiRef.current = api as unknown as DrawingAPI }}
                renderTopRightUI={() => (
                    <div className="flex items-center gap-2">
                        {renderTopRight?.()}
                        <CollaborationStatus
                            connection={connection}
                            saveState={saveState}
                            participants={participants}
                            canEdit={canEdit}
                            onRetry={() => setReconnectKey((value) => value + 1)}
                        />
                    </div>
                )}
                UIOptions={{
                    canvasActions: {
                        loadScene: false,
                        saveToActiveFile: false,
                        saveAsImage: false,
                        export: false,
                    },
                }}
            >
                <MainMenu>
                    <MainMenu.Item icon={<Download size={16} />} onSelect={() => { void handleExportPNG() }}>
                        Export PNG
                    </MainMenu.Item>
                    <MainMenu.Item icon={<FileDown size={16} />} onSelect={handleExportDocument}>
                        Export Quoril canvas
                    </MainMenu.Item>
                    {canEdit && (
                        <MainMenu.Item icon={<FileUp size={16} />} onSelect={() => importInputRef.current?.click()}>
                            Import Quoril canvas
                        </MainMenu.Item>
                    )}
                    <MainMenu.Separator />
                    {canEdit && <MainMenu.DefaultItems.ChangeCanvasBackground />}
                    {canEdit && <MainMenu.DefaultItems.ClearCanvas />}
                    <MainMenu.Separator />
                    <MainMenu.Item icon={<HelpCircle size={16} />} onSelect={() => setHelpOpen(true)}>
                        Canvas help
                    </MainMenu.Item>
                </MainMenu>
            </DrawingSurface>

            <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-hover)]"
                title="Canvas help"
            >
                <HelpCircle size={14} /> Help
            </button>

            {!canEdit && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)]/95 px-3 py-1.5 text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> View-only canvas</span>
                </div>
            )}

            {helpOpen && <CanvasHelp onClose={() => setHelpOpen(false)} />}
        </div>
    )
}

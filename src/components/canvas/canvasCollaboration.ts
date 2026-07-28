export const QUORIL_CANVAS_DOCUMENT_TYPE = 'quoril-canvas'
export const QUORIL_CANVAS_DOCUMENT_VERSION = 1

// Supabase Free allows 256 KB broadcast payloads. Keep headroom for the
// websocket envelope and future metadata.
export const MAX_BROADCAST_BYTES = 220_000

export type CanvasSceneElement = {
    id: string
    version?: number
    versionNonce?: number
    isDeleted?: boolean
    updated?: number
    [key: string]: unknown
}

export type CanvasBinaryFile = {
    id: string
    version?: number
    dataURL?: string
    [key: string]: unknown
}

export type CanvasBinaryFiles = Record<string, CanvasBinaryFile>

export type DurableSceneData = {
    elements: readonly CanvasSceneElement[]
    appState: Record<string, unknown>
    files: CanvasBinaryFiles
}

export type QuorilCanvasDocument = DurableSceneData & {
    type: typeof QUORIL_CANVAS_DOCUMENT_TYPE
    version: typeof QUORIL_CANVAS_DOCUMENT_VERSION
    createdAt: string
}

export type CanvasParticipant = {
    clientId: string
    userId: string
    name: string
    avatarUrl?: string
    color: string
    onlineAt: string
}

export type ScenePatchPayload = {
    canvasId: string
    senderId: string
    sentAt: number
    elements: readonly CanvasSceneElement[]
    files?: CanvasBinaryFiles
    appState?: Record<string, unknown>
}

const DURABLE_APP_STATE_KEYS = new Set([
    'viewBackgroundColor',
    'gridSize',
    'gridStep',
    'gridModeEnabled',
    'objectsSnapModeEnabled',
])

/** Keep shared visual settings, never another person's viewport or selection. */
export function sanitizeCanvasAppState(appState: Record<string, unknown> = {}): Record<string, unknown> {
    const durable: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(appState)) {
        if (DURABLE_APP_STATE_KEYS.has(key)) durable[key] = value
    }
    return durable
}

function elementVersionKey(element: CanvasSceneElement): string {
    return [
        element.version ?? 0,
        element.versionNonce ?? 0,
        element.isDeleted ? 1 : 0,
        element.updated ?? 0,
    ].join(':')
}

export function indexSceneElements(elements: readonly CanvasSceneElement[]): Map<string, string> {
    return new Map(elements.map((element) => [element.id, elementVersionKey(element)]))
}

/** Return only elements created, changed, reordered, or deleted since the last send. */
export function diffSceneElements(
    previous: ReadonlyMap<string, string>,
    next: readonly CanvasSceneElement[],
): CanvasSceneElement[] {
    return next.filter((element) => previous.get(element.id) !== elementVersionKey(element))
}

export function diffBinaryFiles(
    previous: ReadonlyMap<string, number>,
    next: CanvasBinaryFiles,
): CanvasBinaryFiles {
    const changed: CanvasBinaryFiles = {}
    for (const [id, file] of Object.entries(next)) {
        const version = file.version ?? 0
        if (previous.get(id) !== version) changed[id] = file
    }
    return changed
}

export function indexBinaryFiles(files: CanvasBinaryFiles): Map<string, number> {
    return new Map(Object.entries(files).map(([id, file]) => [id, file.version ?? 0]))
}

export function estimateBroadcastBytes(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

/**
 * Prefer sending changed image data with its element. If that would exceed the
 * Free-plan limit, send the element patch alone and let the durable snapshot
 * listener hydrate files. Very large element patches fall back entirely to the
 * snapshot path.
 */
export function fitScenePatchToBroadcast(payload: ScenePatchPayload): {
    payload: ScenePatchPayload | null
    needsSnapshot: boolean
} {
    if (estimateBroadcastBytes(payload) <= MAX_BROADCAST_BYTES) {
        return { payload, needsSnapshot: false }
    }

    const withoutFiles = { ...payload, files: undefined }
    if (estimateBroadcastBytes(withoutFiles) <= MAX_BROADCAST_BYTES) {
        return { payload: withoutFiles, needsSnapshot: true }
    }

    return { payload: null, needsSnapshot: true }
}

export function createQuorilCanvasDocument(scene: DurableSceneData): QuorilCanvasDocument {
    return {
        type: QUORIL_CANVAS_DOCUMENT_TYPE,
        version: QUORIL_CANVAS_DOCUMENT_VERSION,
        createdAt: new Date().toISOString(),
        elements: scene.elements,
        appState: sanitizeCanvasAppState(scene.appState),
        files: scene.files,
    }
}

export function parseQuorilCanvasDocument(input: unknown): DurableSceneData {
    if (!input || typeof input !== 'object') throw new Error('This file is not a valid Quoril canvas.')
    const data = input as Record<string, unknown>
    if (!Array.isArray(data.elements)) throw new Error('This file does not contain a canvas scene.')

    // Accept Quoril documents and older compatible scene JSON so existing user
    // backups keep working after the UI rebrand.
    if (data.type !== QUORIL_CANVAS_DOCUMENT_TYPE && data.type !== 'excalidraw') {
        throw new Error('This file format is not supported.')
    }

    return {
        elements: data.elements as CanvasSceneElement[],
        appState: sanitizeCanvasAppState((data.appState as Record<string, unknown>) ?? {}),
        files: (data.files as CanvasBinaryFiles) ?? {},
    }
}

export function participantColor(userId: string): string {
    const palette = ['#5b5bd6', '#0f9d8a', '#d97706', '#db2777', '#2563eb', '#7c3aed', '#0891b2', '#c2410c']
    let hash = 0
    for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
    return palette[Math.abs(hash) % palette.length]
}

export function participantInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase()
}

export function dedupeParticipants(participants: readonly CanvasParticipant[]): CanvasParticipant[] {
    const byUser = new Map<string, CanvasParticipant>()
    for (const participant of participants) {
        const current = byUser.get(participant.userId)
        if (!current || participant.onlineAt < current.onlineAt) byUser.set(participant.userId, participant)
    }
    return [...byUser.values()]
}

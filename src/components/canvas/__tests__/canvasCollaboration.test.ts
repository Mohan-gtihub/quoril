import { describe, expect, it } from 'vitest'
import {
    MAX_BROADCAST_BYTES,
    createQuorilCanvasDocument,
    dedupeParticipants,
    diffSceneElements,
    estimateBroadcastBytes,
    fitScenePatchToBroadcast,
    indexSceneElements,
    parseQuorilCanvasDocument,
    participantInitials,
    sanitizeCanvasAppState,
    type CanvasSceneElement,
    type ScenePatchPayload,
} from '../canvasCollaboration'

const element = (id: string, version: number, extra: Record<string, unknown> = {}): CanvasSceneElement => ({
    id,
    version,
    versionNonce: version * 11,
    updated: version,
    isDeleted: false,
    ...extra,
})

describe('canvas collaboration helpers', () => {
    it('diffs element versions and deletion tombstones', () => {
        const previous = indexSceneElements([element('a', 1), element('b', 1)])
        const next = [element('a', 1), element('b', 2), element('c', 1), element('d', 1, { isDeleted: true })]

        expect(diffSceneElements(previous, next).map((item) => item.id)).toEqual(['b', 'c', 'd'])
    })

    it('persists visual settings but strips selection and viewport state', () => {
        expect(sanitizeCanvasAppState({
            viewBackgroundColor: '#fff',
            gridSize: 20,
            scrollX: 900,
            selectedElementIds: { secret: true },
            collaborators: { secret: true },
        })).toEqual({ viewBackgroundColor: '#fff', gridSize: 20 })
    })

    it('creates and parses a Quoril-owned export document', () => {
        const document = createQuorilCanvasDocument({
            elements: [element('a', 1)],
            appState: { viewBackgroundColor: '#fff', scrollY: 20 },
            files: {},
        })

        expect(document.type).toBe('quoril-canvas')
        expect(document.appState).toEqual({ viewBackgroundColor: '#fff' })
        expect(parseQuorilCanvasDocument(document).elements).toHaveLength(1)
    })

    it('drops oversized file data before falling back to a snapshot', () => {
        const payload: ScenePatchPayload = {
            canvasId: 'canvas-1',
            senderId: 'client-1',
            sentAt: 1,
            elements: [element('image', 1)],
            files: { image: { id: 'image', dataURL: `data:image/png;base64,${'a'.repeat(MAX_BROADCAST_BYTES)}` } },
        }

        const fitted = fitScenePatchToBroadcast(payload)
        expect(fitted.payload).not.toBeNull()
        expect(fitted.payload?.files).toBeUndefined()
        expect(fitted.needsSnapshot).toBe(true)
        expect(estimateBroadcastBytes(fitted.payload)).toBeLessThan(MAX_BROADCAST_BYTES)
    })

    it('deduplicates multi-tab presence and formats initials', () => {
        const participants = dedupeParticipants([
            { clientId: 'one', userId: 'u1', name: 'Jaya Sai', color: '#000', onlineAt: '2026-01-01' },
            { clientId: 'two', userId: 'u1', name: 'Jaya Sai', color: '#000', onlineAt: '2026-01-02' },
        ])

        expect(participants).toHaveLength(1)
        expect(participantInitials('Jaya Sai')).toBe('JS')
        expect(participantInitials('Quoril')).toBe('QU')
    })
})

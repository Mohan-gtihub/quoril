import { describe, expect, it } from 'vitest'
import {
    validateBlock,
    validateBlockBatch,
    validateCloudRows,
    validateExternalUrl,
    validateListUpdate,
    validateSyncLimit,
    validateSyncTable,
    validateTaskRow,
    validateTaskUpdate,
    validateWindowBounds,
} from '../ipcValidation'

describe('ipcValidation', () => {
    it('accepts a valid task row for local SQLite saves', () => {
        const row = {
            id: 'task-1',
            user_id: 'user-1',
            list_id: null,
            title: 'Write launch plan',
            status: 'todo',
            priority: 'medium',
            estimate_m: 45,
            spent_s: 0,
            sort_order: 1,
            synced: 0,
        }

        expect(validateTaskRow(row)).toBe(row)
    })

    it('rejects unsupported task save columns before dynamic SQL sees them', () => {
        expect(() =>
            validateTaskRow({
                id: 'task-1',
                user_id: 'user-1',
                title: 'Bad row',
                'title) VALUES (?)--': 'oops',
            }),
        ).toThrow(/unsupported key/)
    })

    it('rejects unsupported task update columns', () => {
        expect(() =>
            validateTaskUpdate({
                spent_s: 120,
                arbitrary_column: 'nope',
            }),
        ).toThrow(/unsupported key/)
    })

    it('rejects empty update payloads', () => {
        expect(() => validateListUpdate({})).toThrow(/cannot be empty/)
    })

    it('guards sync tables and batch sizes', () => {
        expect(validateSyncTable('tasks')).toBe('tasks')
        expect(() => validateSyncTable('sqlite_master')).toThrow(/unsupported sync table/)
        expect(validateSyncLimit(50)).toBe(50)
        expect(() => validateSyncLimit(5000)).toThrow(/cannot exceed/)
        expect(() => validateCloudRows([{ id: 'a' }, { not_id: 'b' }])).toThrow(/id/)
    })

    it('accepts the real whiteboard scene block shape', () => {
        const block = {
            id: 'scene-canvas-1',
            canvasId: 'canvas-1',
            userId: 'user-1',
            kind: 'excalidraw',
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            content: { kind: 'excalidraw', data: { elements: [] } },
        }

        expect(validateBlock(block)).toBe(block)
        expect(validateBlockBatch([block])).toEqual([block])
    })

    it('rejects unsafe native-window and shell payloads', () => {
        expect(() => validateWindowBounds({ width: 100, height: -1 })).toThrow(/positive/)
        expect(validateExternalUrl('https://quoril.in')).toBe('https://quoril.in')
        expect(() => validateExternalUrl('file:///etc/passwd')).toThrow(/http or https/)
    })
})

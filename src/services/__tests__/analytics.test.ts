import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const insert = vi.fn()

vi.mock('@/services/supabase', () => ({
    supabase: { from: () => ({ insert }) },
}))

// The real platform module reaches for import.meta.env / window globals at
// import time; analytics only needs the capability flag.
vi.mock('@/services/platform', () => ({
    platform: { capabilities: { nativeOverlay: false } },
}))

import { analytics } from '../analytics'

describe('analytics', () => {
    beforeEach(() => {
        insert.mockReset()
        insert.mockResolvedValue({ error: null })
        analytics._destroy()
        analytics.init()
    })

    afterEach(() => {
        analytics._destroy()
    })

    it('no-ops entirely until a user is identified', async () => {
        for (let i = 0; i < 25; i++) analytics.track('task.created')
        await analytics.flush()

        expect(insert).not.toHaveBeenCalled()
    })

    it('flushes automatically once the buffer reaches 20 events', async () => {
        analytics.identify('user-1')

        for (let i = 0; i < 19; i++) analytics.track('task.created')
        expect(insert).not.toHaveBeenCalled()

        analytics.track('task.created')
        await vi.waitFor(() => expect(insert).toHaveBeenCalledTimes(1))

        const batch = insert.mock.calls[0][0]
        expect(batch).toHaveLength(20)
        expect(batch[0]).toMatchObject({
            user_id: 'user-1',
            event: 'task.created',
            platform: 'web',
        })
        expect(typeof batch[0].session_id).toBe('string')
    })

    it('never throws when the network fails, and drops the failed batch', async () => {
        analytics.identify('user-1')
        insert.mockRejectedValue(new Error('offline'))

        expect(() => analytics.track('focus.completed', { seconds: 60 })).not.toThrow()
        await expect(analytics.flush()).resolves.toBeUndefined()

        // The batch was cleared rather than retried, so a later flush is a no-op.
        insert.mockReset()
        await analytics.flush()
        expect(insert).not.toHaveBeenCalled()
    })

    it('stops attributing events after reset()', async () => {
        analytics.identify('user-1')
        analytics.reset()
        insert.mockReset()

        analytics.track('task.created')
        await analytics.flush()
        expect(insert).not.toHaveBeenCalled()
    })
})

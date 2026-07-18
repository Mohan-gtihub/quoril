import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @/services/supabase before importing webCanvas
vi.mock('@/services/supabase', () => {
  const chain = () => {
    const obj: any = {}
    const methods = ['select', 'eq', 'is', 'order', 'in', 'single', 'upsert', 'update']
    for (const m of methods) {
      obj[m] = vi.fn(() => obj)
    }
    // Default data return
    obj.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
    return obj
  }

  const fromMap: Record<string, any> = {}
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (!fromMap[table]) fromMap[table] = chain()
      return fromMap[table]
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    _fromMap: fromMap,
  }
  return { supabase: mockSupabase }
})

import { webCanvas } from '../webCanvas'
import { supabase } from '@/services/supabase'

describe('webCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listBlocks calls supabase.from("blocks") with canvas_id filter', async () => {
    // listBlocks calls .order() twice; the second call must resolve
    let orderCount = 0
    const mockChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        orderCount++
        if (orderCount >= 2) return Promise.resolve({ data: [], error: null })
        return mockChain
      }),
    }
    ;(supabase.from as any).mockReturnValueOnce(mockChain)

    const result = await webCanvas.listBlocks('canvas-1')

    expect(supabase.from).toHaveBeenCalledWith('blocks')
    expect(mockChain.eq).toHaveBeenCalledWith('canvas_id', 'canvas-1')
    expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
    expect(result).toEqual([])
  })

  it('listConnections calls supabase.from("connections")', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as any).mockReturnValueOnce(mockChain)

    await webCanvas.listConnections('canvas-1')

    expect(supabase.from).toHaveBeenCalledWith('connections')
  })

  it('listZones calls supabase.from("zones")', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as any).mockReturnValueOnce(mockChain)

    await webCanvas.listZones('canvas-1')

    expect(supabase.from).toHaveBeenCalledWith('zones')
  })

  it('unfurlLink returns a non-throwing object with required fields', async () => {
    const url = 'https://example.com'
    const result = await webCanvas.unfurlLink(url)

    expect(result).toBeDefined()
    expect(result.url).toBe(url)
    expect(typeof result.title).toBe('string')
    expect(typeof result.description).toBe('string')
    // image can be null
    expect('image' in result).toBe(true)
  })

  it('unfurlLink does not throw for any url', async () => {
    await expect(webCanvas.unfurlLink('not-a-url')).resolves.toBeDefined()
    await expect(webCanvas.unfurlLink('')).resolves.toBeDefined()
  })

  it('softDeleteBlocksBatch calls supabase.from("blocks") with .in()', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as any).mockReturnValueOnce(mockChain)

    await webCanvas.softDeleteBlocksBatch(['id-1', 'id-2'])

    expect(supabase.from).toHaveBeenCalledWith('blocks')
    expect(mockChain.in).toHaveBeenCalledWith('id', ['id-1', 'id-2'])
  })

  it('softDeleteBlocksBatch is a no-op for empty array', async () => {
    await webCanvas.softDeleteBlocksBatch([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('surfaces a failed scene write instead of reporting a false save', async () => {
    const mockChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }),
    }
    ;(supabase.from as any).mockReturnValueOnce(mockChain)

    await expect(webCanvas.upsertBlock({
      id: 'scene-1',
      canvasId: 'canvas-1',
      userId: 'owner-1',
      kind: 'scene',
      content: { kind: 'scene', data: {} },
    } as any)).rejects.toThrow('permission denied')
  })
})
